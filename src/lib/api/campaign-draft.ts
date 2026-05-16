import { supabase } from '@/lib/supabase';
import type {
  CampaignDraft,
  CampaignInventoryItemRow,
  CampaignCreativeRequirement,
  CampaignBooking,
  LaunchReadiness,
  DerivedCreativeRequirement,
} from '@/types/campaign-draft';
import type { CanonicalFormat } from '@/types/creative';
import { FORMAT_SPECS, deriveRequiredFormats } from '@/utils/creativeRequirements';
import {
  canSubmitCreatives,
  computeLaunchReadiness,
  shouldAutoTransitionToReview,
} from '@/utils/campaignStateMachine';
import type { MediaPlanItem, InventoryLocation } from '@/types/inventory';

const DEFAULT_ADVERTISER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

// ─── Helpers ───────────────────────────────────────────────

function mapCampaignRow(row: Record<string, unknown>): CampaignDraft {
  return {
    id: row.id as string,
    advertiserId: row.advertiser_id as string,
    name: row.name as string,
    objective: (row.objective as string | null) ?? null,
    startDate: (row.start_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
    status: row.status as CampaignDraft['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRequirementRow(row: Record<string, unknown>): CampaignCreativeRequirement {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    canonicalFormat: row.canonical_format as CanonicalFormat,
    status: row.status as CampaignCreativeRequirement['status'],
    mediaAssetId: (row.media_asset_id as string | null) ?? null,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
  };
}

// ─── Campaign CRUD ─────────────────────────────────────────

export async function createDraftCampaign(): Promise<CampaignDraft> {
  const name = `Unnamed Campaign`;
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      advertiser_id: DEFAULT_ADVERTISER_ID,
      created_by_user_id: DEFAULT_USER_ID,
      name,
      objective: null,
      status: 'draft',
      buying_type: 'direct',
      campaign_days: 7,
      total_budget: 0,
      estimated_impressions: 0,
    })
    .select()
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
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.objective !== undefined) dbUpdates.objective = updates.objective;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;

  const { data, error } = await supabase
    .from('campaigns')
    .update(dbUpdates)
    .eq('id', campaignId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update campaign');
  return mapCampaignRow(data);
}

// save-draft is a semantic alias for updateDraftCampaign
export const saveDraftCampaign = updateDraftCampaign;

// ─── Inventory Items ───────────────────────────────────────

export async function addInventoryItem(
  campaignId: string,
  inventoryLocationId: string,
  days: number,
  pricePerDay: number,
  dailyImpressions: number,
): Promise<CampaignInventoryItemRow> {
  const { data, error } = await supabase
    .from('campaign_inventory_items')
    .insert({
      campaign_id: campaignId,
      inventory_location_id: inventoryLocationId,
      days,
      price_per_day: pricePerDay,
      daily_impressions: dailyImpressions,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to add inventory item');
  return {
    id: data.id as string,
    campaignId: data.campaign_id as string,
    inventoryLocationId: data.inventory_location_id as string,
    days: data.days as number,
    pricePerDaySnapshot: data.price_per_day as number,
  };
}

export async function removeInventoryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_inventory_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

export async function getInventoryItems(campaignId: string): Promise<CampaignInventoryItemRow[]> {
  const { data, error } = await supabase
    .from('campaign_inventory_items')
    .select('*')
    .eq('campaign_id', campaignId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id as string,
    campaignId: row.campaign_id as string,
    inventoryLocationId: row.inventory_location_id as string,
    days: row.days as number,
    pricePerDaySnapshot: row.price_per_day as number,
  }));
}

// ─── Creative Requirements (derived) ──────────────────────

export function getDerivedCreativeRequirements(
  selectedItems: MediaPlanItem[],
  allInventory: InventoryLocation[],
): DerivedCreativeRequirement[] {
  const formats = deriveRequiredFormats(selectedItems, allInventory);
  return formats.map(format => {
    const spec = FORMAT_SPECS.find(s => s.format === format)!;
    const venueCount = selectedItems.filter(item => {
      const venue = allInventory.find(v => v.id === item.inventoryId);
      return venue && spec.screenTypes.includes(venue.screenType);
    }).length;
    return {
      format,
      label: spec.label,
      dimensions: spec.dimensions,
      venueCount,
    };
  });
}

export async function getStoredCreativeRequirements(
  campaignId: string,
): Promise<CampaignCreativeRequirement[]> {
  const { data, error } = await supabase
    .from('campaign_creative_requirements')
    .select('*')
    .eq('campaign_id', campaignId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRequirementRow);
}

// ─── Submit Creatives for Review ───────────────────────────

export async function submitCreativesForReview(
  campaignId: string,
  selectedItems: MediaPlanItem[],
  allInventory: InventoryLocation[],
): Promise<CampaignCreativeRequirement[]> {
  // Validate campaign status allows submission
  const campaign = await getCampaign(campaignId);
  if (campaign.status === 'cancelled') throw new Error('campaign_cancelled');
  if (!canSubmitCreatives(campaign.status)) {
    throw new Error(`cannot_submit: campaign status is ${campaign.status}`);
  }

  // Validate inventory exists
  const items = await getInventoryItems(campaignId);
  if (items.length === 0) throw new Error('no_inventory');

  // Derive formats from current inventory
  const formats = deriveRequiredFormats(selectedItems, allInventory);

  // Check for existing requirements (may have been created via inline modal)
  const existingReqs = await getStoredCreativeRequirements(campaignId);
  if (existingReqs.length > 0) {
    // Requirements already exist — just ensure campaign status is correct
    const { error: statusError } = await supabase
      .from('campaigns')
      .update({ status: 'pending_creative_review' })
      .eq('id', campaignId);
    if (statusError) throw new Error(statusError.message);
    return existingReqs;
  }

  // Insert fresh snapshot
  if (formats.length > 0) {
    const rows = formats.map(format => ({
      campaign_id: campaignId,
      canonical_format: format,
      status: 'pending_upload',
    }));
    const { error } = await supabase
      .from('campaign_creative_requirements')
      .insert(rows);
    if (error) throw new Error(error.message);
  }

  // Transition campaign to pending_creative_review
  const { error: statusError } = await supabase
    .from('campaigns')
    .update({ status: 'pending_creative_review' })
    .eq('id', campaignId);
  if (statusError) throw new Error(statusError.message);

  return getStoredCreativeRequirements(campaignId);
}

// ─── Upload Asset to Requirement ──────────────────────────

export async function uploadAssetToRequirement(
  requirementId: string,
  mediaAssetId: string,
): Promise<void> {
  // Read first to guard against overwriting an approved requirement
  const { data: current, error: readError } = await supabase
    .from('campaign_creative_requirements')
    .select('status, campaign_id')
    .eq('id', requirementId)
    .single();

  if (readError || !current) throw new Error(readError?.message ?? 'Requirement not found');
  if (current.status === 'approved') throw new Error('requirement_already_approved');

  // Mark as uploaded
  const { error: reqError } = await supabase
    .from('campaign_creative_requirements')
    .update({ status: 'uploaded', media_asset_id: mediaAssetId })
    .eq('id', requirementId);

  if (reqError) throw new Error(reqError.message);

  const campaignId = current.campaign_id as string;

  // Auto-transition check
  const campaign = await getCampaign(campaignId);
  const allReqs = await getStoredCreativeRequirements(campaignId);

  if (shouldAutoTransitionToReview(campaign.status, allReqs)) {
    const { error: transitionError } = await supabase
      .from('campaigns')
      .update({ status: 'pending_creative_review' })
      .eq('id', campaignId);
    if (transitionError) throw new Error(transitionError.message);
  }
}

// ─── Launch Readiness ──────────────────────────────────────

export async function getLaunchReadiness(campaignId: string): Promise<LaunchReadiness> {
  const [items, requirements] = await Promise.all([
    getInventoryItems(campaignId),
    getStoredCreativeRequirements(campaignId),
  ]);
  return computeLaunchReadiness(items.length, requirements);
}

// ─── Confirm Booking ──────────────────────────────────────

export async function confirmBooking(campaignId: string): Promise<CampaignBooking> {
  // Fetch campaign, items and requirements in parallel
  const [campaign, items, requirements] = await Promise.all([
    getCampaign(campaignId),
    getInventoryItems(campaignId),
    getStoredCreativeRequirements(campaignId),
  ]);
  if (campaign.status === 'cancelled') throw new Error('campaign_cancelled');

  // Check launch readiness
  const readiness = computeLaunchReadiness(items.length, requirements);
  if (!readiness.ready) {
    throw new Error('booking_not_ready');
  }

  // Check no existing booking
  const { data: existing } = await supabase
    .from('campaign_bookings')
    .select('id')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (existing) throw new Error('booking_already_exists');

  // Compute total amount from inventory item snapshots
  const totalAmount = items.reduce(
    (sum, item) => sum + item.pricePerDaySnapshot * item.days,
    0,
  );

  // Create booking
  const { data: booking, error } = await supabase
    .from('campaign_bookings')
    .insert({
      campaign_id: campaignId,
      total_amount: totalAmount,
      booking_status: 'confirmed',
    })
    .select()
    .single();

  if (error || !booking) throw new Error(error?.message ?? 'Failed to create booking');

  return {
    id: booking.id as string,
    campaignId: booking.campaign_id as string,
    confirmedAt: booking.confirmed_at as string,
    totalAmount: booking.total_amount as number,
    bookingStatus: booking.booking_status as CampaignBooking['bookingStatus'],
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
    .eq('created_by_user_id', DEFAULT_USER_ID)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCampaignRow);
}

export async function listCampaignSummaries(): Promise<Array<CampaignDraft & { inventoryCount: number; uploadedCount: number; totalCount: number }>> {
  const campaigns = await listCampaigns();

  const summaries = await Promise.all(campaigns.map(async (c) => {
    const [items, reqs] = await Promise.all([
      getInventoryItems(c.id),
      getStoredCreativeRequirements(c.id),
    ]);
    const uploadedCount = reqs.filter(r => r.status === 'uploaded' || r.status === 'approved').length;
    return {
      ...c,
      inventoryCount: items.length,
      uploadedCount,
      totalCount: reqs.length,
    };
  }));

  return summaries;
}
