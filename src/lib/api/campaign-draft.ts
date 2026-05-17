import { supabase } from '@/lib/supabase';
import { canSubmitCreatives, computeLaunchReadiness, shouldAutoTransitionToReview } from '@/utils/campaignStateMachine';
import { deriveRequiredFormats, FORMAT_SPECS } from '@/utils/creativeRequirements';
import type {
  CampaignCreativeRequirement,
  CampaignDraft,
  CampaignDraftStatus,
  CampaignInventoryItemRow,
  CampaignSubmission,
  LaunchReadiness,
} from '@/types/campaign-draft';
import type { InventoryLocation } from '@/types/inventory';
import type { MediaPlanItem } from '@/types/inventory';
import type { CreativeAsset } from '@/types/inventory';

const DEFAULT_ADVERTISER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

// ─── Row mappers ───────────────────────────────────────────

function mapCampaignRow(row: Record<string, unknown>): CampaignDraft {
  return {
    id: row.id as string,
    advertiserId: (row.advertiser_id as string) ?? DEFAULT_ADVERTISER_ID,
    name: (row.name as string) ?? '',
    objective: (row.objective as string) ?? null,
    startDate: (row.start_date as string) ?? null,
    endDate: (row.end_date as string) ?? null,
    status: (row.status as CampaignDraftStatus) ?? 'draft',
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function mapInventoryItemRow(row: Record<string, unknown>): CampaignInventoryItemRow {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    inventoryLocationId: row.inventory_location_id as string,
    days: Number(row.days),
    pricePerDaySnapshot: Number(row.price_per_day),
  };
}

function mapRequirementRow(row: Record<string, unknown>): CampaignCreativeRequirement {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    canonicalFormat: row.canonical_format as CampaignCreativeRequirement['canonicalFormat'],
    status: (row.status as CampaignCreativeRequirement['status']) ?? 'pending_upload',
    mediaAssetId: (row.media_asset_id as string) ?? null,
    rejectionReason: (row.rejection_reason as string) ?? null,
  };
}

// ─── Campaign CRUD ─────────────────────────────────────────

export async function createDraftCampaign(): Promise<CampaignDraft> {
  const { count } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('advertiser_id', DEFAULT_ADVERTISER_ID);

  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = String((count ?? 0) + 1).padStart(3, '0');
  const generatedName = `Campaign_${yyyymmdd}_${seq}`;

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      advertiser_id: DEFAULT_ADVERTISER_ID,
      created_by_user_id: DEFAULT_USER_ID,
      name: generatedName,
      objective: 'awareness',
      status: 'draft',
      buying_type: 'direct',
      campaign_days: 7,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create campaign');
  return mapCampaignRow(data);
}

export async function getCampaign(campaignId: string): Promise<CampaignDraft> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Campaign not found');
  return mapCampaignRow(data);
}

export async function updateDraftCampaign(
  campaignId: string,
  updates: Partial<Pick<CampaignDraft, 'name' | 'objective' | 'startDate' | 'endDate'>>,
): Promise<CampaignDraft> {
  // Map camelCase to snake_case
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.objective !== undefined) dbUpdates.objective = updates.objective;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;

  const { data, error } = await supabase
    .from('campaigns')
    .update(dbUpdates)
    .eq('id', campaignId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update campaign');
  return mapCampaignRow(data);
}

export const saveDraftCampaign = updateDraftCampaign;

// ─── Inventory Items ───────────────────────────────────────

export async function addInventoryItem(
  campaignId: string,
  inventoryLocationId: string,
  days: number,
  pricePerDay: number,
  dailyImpressions: number,
): Promise<CampaignInventoryItemRow> {
  // Check for existing item to avoid duplicates
  const { data: existing } = await supabase
    .from('campaign_inventory_items')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('inventory_location_id', inventoryLocationId)
    .maybeSingle();

  if (existing) return mapInventoryItemRow(existing);

  const { data, error } = await supabase
    .from('campaign_inventory_items')
    .insert({
      campaign_id: campaignId,
      inventory_location_id: inventoryLocationId,
      days,
      price_per_day: pricePerDay,
      daily_impressions: dailyImpressions,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to add inventory item');
  return mapInventoryItemRow(data);
}

export async function removeInventoryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_inventory_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

export async function updateInventoryItemDays(
  itemId: string,
  days: number,
): Promise<CampaignInventoryItemRow> {
  const { data, error } = await supabase
    .from('campaign_inventory_items')
    .update({ days })
    .eq('id', itemId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update inventory item days');
  return mapInventoryItemRow(data);
}

export async function getInventoryItems(campaignId: string): Promise<CampaignInventoryItemRow[]> {
  const { data, error } = await supabase
    .from('campaign_inventory_items')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapInventoryItemRow);
}

// ─── Creative Requirements (derived) ──────────────────────

export async function getStoredCreativeRequirements(
  campaignId: string,
): Promise<CampaignCreativeRequirement[]> {
  const { data, error } = await supabase
    .from('campaign_creative_requirements')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRequirementRow);
}

function deriveCountFromSelections(
  selectedItems: MediaPlanItem[],
  allInventory: InventoryLocation[],
) {
  const formats = deriveRequiredFormats(selectedItems, allInventory);
  return formats.map(format => {
    const spec = FORMAT_SPECS.find(s => s.format === format);
    const venueCount = selectedItems.filter(item => {
      const venue = allInventory.find(v => v.id === item.inventoryId);
      return venue && spec && spec.screenTypes.includes(venue.screenType);
    }).length;
    return { format, venueCount };
  });
}

export async function submitCreativesForReview(
  campaignId: string,
  selectedItems: MediaPlanItem[],
  allInventory: InventoryLocation[],
): Promise<CampaignCreativeRequirement[]> {
  const campaign = await getCampaign(campaignId);

  if (!canSubmitCreatives(campaign.status)) {
    throw new Error(`cannot_submit: campaign status is ${campaign.status}`);
  }

  const existing = await getStoredCreativeRequirements(campaignId);
  if (existing.length > 0) {
    // Already have requirements — update campaign status if needed
    if (campaign.status === 'draft' || campaign.status === 'blocked_by_creative') {
      await supabase
        .from('campaigns')
        .update({ status: 'pending_creative_review', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
    }
    return existing;
  }

  const groups = deriveCountFromSelections(selectedItems, allInventory);
  const rows = groups.map(group => ({
    campaign_id: campaignId,
    canonical_format: group.format,
    status: 'pending_upload',
    media_asset_id: null,
    rejection_reason: null,
  }));

  if (rows.length > 0) {
    const { data, error } = await supabase
      .from('campaign_creative_requirements')
      .insert(rows)
      .select('*');

    if (error) throw new Error(error.message);

    // Update campaign status
    if (campaign.status === 'draft' || campaign.status === 'blocked_by_creative') {
      await supabase
        .from('campaigns')
        .update({ status: 'pending_creative_review', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
    }

    return (data ?? []).map(mapRequirementRow);
  }

  return [];
}

// ─── Upload Asset to Requirement ─────────────────────────

export async function uploadAssetToRequirement(
  requirementId: string,
  mediaAssetId: string,
): Promise<void> {
  // Fetch the requirement to check its state
  const { data: req, error: fetchError } = await supabase
    .from('campaign_creative_requirements')
    .select('*')
    .eq('id', requirementId)
    .single();

  if (fetchError || !req) throw new Error(fetchError?.message ?? 'requirement_not_found');
  if ((req.status as string) === 'approved') throw new Error('requirement_already_approved');

  const { error } = await supabase
    .from('campaign_creative_requirements')
    .update({
      status: 'uploaded',
      media_asset_id: mediaAssetId,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementId);

  if (error) throw new Error(error.message);

  // Check if campaign should auto-transition
  const campaignId = req.campaign_id as string;
  const campaign = await getCampaign(campaignId);
  const allReqs = await getStoredCreativeRequirements(campaignId);
  if (campaign.status === 'blocked_by_creative' && shouldAutoTransitionToReview(campaign.status, allReqs)) {
    await supabase
      .from('campaigns')
      .update({ status: 'pending_creative_review', updated_at: new Date().toISOString() })
      .eq('id', campaignId);
  }
}

// ─── Unlink Asset from Requirement ────────────────────────

export async function unlinkAssetFromRequirement(requirementId: string): Promise<void> {
  const { data: req, error: fetchError } = await supabase
    .from('campaign_creative_requirements')
    .select('status')
    .eq('id', requirementId)
    .single();

  if (fetchError || !req) throw new Error(fetchError?.message ?? 'requirement_not_found');
  if ((req.status as string) === 'approved') throw new Error('requirement_already_approved');

  const { error } = await supabase
    .from('campaign_creative_requirements')
    .update({
      status: 'pending_upload',
      media_asset_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementId);

  if (error) throw new Error(error.message);
}

// ─── Launch Readiness ──────────────────────────────────────

export async function getLaunchReadiness(campaignId: string): Promise<LaunchReadiness> {
  const [items, requirements] = await Promise.all([
    getInventoryItems(campaignId),
    getStoredCreativeRequirements(campaignId),
  ]);

  return computeLaunchReadiness(items.length, requirements);
}

// ─── Submit Campaign For Confirmation ─────────────────────

export async function submitCampaignForConfirmation(campaignId: string): Promise<CampaignSubmission> {
  const campaign = await getCampaign(campaignId);
  if (campaign.status === 'cancelled') throw new Error('campaign_cancelled');

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('campaigns')
    .update({
      status: 'pending_review',
      submitted_at: now,
      updated_at: now,
    })
    .eq('id', campaignId);

  if (error) throw new Error(error.message);

  return {
    campaignId,
    bookingStatus: 'pending_confirmation',
    submittedAt: now,
  };
}

// ─── Ensure Creative Requirements ─────────────────────────

export async function ensureCreativeRequirements(
  campaignId: string,
  selectedItems: MediaPlanItem[],
  allInventory: InventoryLocation[],
): Promise<CampaignCreativeRequirement[]> {
  const existing = await getStoredCreativeRequirements(campaignId);
  if (existing.length > 0) return existing;
  return submitCreativesForReview(campaignId, selectedItems, allInventory);
}

// ─── Dashboard Queries ─────────────────────────────────────

export async function listCampaigns(): Promise<CampaignDraft[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('advertiser_id', DEFAULT_ADVERTISER_ID)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCampaignRow);
}

export async function listCampaignSummaries(): Promise<Array<CampaignDraft & { inventoryIds: string[]; inventoryCount: number; uploadedCount: number; totalCount: number }>> {
  const campaigns = await listCampaigns();

  const summaries = await Promise.all(campaigns.map(async c => {
    const [items, reqs] = await Promise.all([
      getInventoryItems(c.id),
      getStoredCreativeRequirements(c.id),
    ]);
    const uploadedCount = reqs.filter(r => r.status === 'uploaded' || r.status === 'approved').length;
    return {
      ...c,
      inventoryIds: items.map(item => item.inventoryLocationId),
      inventoryCount: items.length,
      uploadedCount,
      totalCount: reqs.length,
    };
  }));

  return summaries;
}

export function mapLegacyCreativeStatus(status: CampaignCreativeRequirement['status']): CreativeAsset['status'] {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'uploaded') return 'uploaded';
  if (status === 'pending_upload') return 'pending_review';
  return 'pending_review';
}

export function mapLegacyRequirementFromStatus(status: CampaignCreativeRequirement['status']): CampaignCreativeRequirement['status'] {
  return status;
}
