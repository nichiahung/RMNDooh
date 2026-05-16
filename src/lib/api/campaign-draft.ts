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
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_ADVERTISER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

type LegacyCampaignDraftStatus = CampaignDraftStatus;

type CampaignRow = {
  id: string;
  advertiserId: string;
  name: string;
  objective: string | null;
  startDate: string | null;
  endDate: string | null;
  status: LegacyCampaignDraftStatus;
  createdAt: string;
  updatedAt: string;
};

const campaignStore: Record<string, CampaignRow> = {};
const campaignInventoryStore: Record<string, CampaignInventoryItemRow[]> = {};
const campaignRequirementsStore: Record<string, CampaignCreativeRequirement[]> = {};

function mapCampaignRow(row: CampaignRow): CampaignDraft {
  return {
    id: row.id,
    advertiserId: row.advertiserId,
    name: row.name,
    objective: row.objective,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeCampaignDateRange(start: string | null, end: string | null): void {
  if (!start || !end) return;
  if (new Date(start) > new Date(end)) {
    throw new Error('invalid_date_range');
  }
}

// ─── Campaign CRUD ─────────────────────────────────────────

export async function createDraftCampaign(): Promise<CampaignDraft> {
  const createdAt = nowIso();
  const id = `draft-${uuidv4()}`;
  const row: CampaignRow = {
    id,
    advertiserId: DEFAULT_ADVERTISER_ID,
    name: 'Unnamed Campaign',
    objective: null,
    startDate: null,
    endDate: null,
    status: 'draft',
    createdAt,
    updatedAt: createdAt,
  };
  campaignStore[id] = row;
  campaignInventoryStore[id] = [];
  campaignRequirementsStore[id] = [];
  return mapCampaignRow(row);
}

export async function getCampaign(campaignId: string): Promise<CampaignDraft> {
  const row = campaignStore[campaignId];
  if (!row) throw new Error('Campaign not found');
  return mapCampaignRow(row);
}

export async function updateDraftCampaign(
  campaignId: string,
  updates: Partial<Pick<CampaignDraft, 'name' | 'objective' | 'startDate' | 'endDate'>>,
): Promise<CampaignDraft> {
  const row = campaignStore[campaignId];
  if (!row) throw new Error('Campaign not found');

  if (updates.startDate !== undefined || updates.endDate !== undefined) {
    normalizeCampaignDateRange(
      updates.startDate ?? row.startDate,
      updates.endDate ?? row.endDate,
    );
  }

  const next: CampaignRow = {
    ...row,
    ...updates,
    updatedAt: nowIso(),
  };
  campaignStore[campaignId] = next;
  return mapCampaignRow(next);
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
  void dailyImpressions;
  const row = campaignStore[campaignId];
  if (!row) throw new Error('Campaign not found');

  const item: CampaignInventoryItemRow = {
    id: `inv-${uuidv4()}`,
    campaignId,
    inventoryLocationId,
    days,
    pricePerDaySnapshot: pricePerDay,
  };

  const list = campaignInventoryStore[campaignId] ?? [];
  if (list.some(i => i.inventoryLocationId === inventoryLocationId)) {
    // Avoid accidental duplicates in the planner flow.
    return list.find(i => i.inventoryLocationId === inventoryLocationId)!;
  }

  campaignInventoryStore[campaignId] = [item, ...list];
  return item;
}

export async function removeInventoryItem(itemId: string): Promise<void> {
  for (const campaignId of Object.keys(campaignInventoryStore)) {
    const before = campaignInventoryStore[campaignId];
    const next = before.filter(item => item.id !== itemId);
    campaignInventoryStore[campaignId] = next;
    // When inventory changes, invalidate requirement cache to force re-generation on next request.
    if (next.length !== before.length) {
      campaignRequirementsStore[campaignId] = [];
      break;
    }
  }
}

export async function getInventoryItems(campaignId: string): Promise<CampaignInventoryItemRow[]> {
  return campaignInventoryStore[campaignId] ?? [];
}

// ─── Creative Requirements (derived) ──────────────────────

export async function getStoredCreativeRequirements(
  campaignId: string,
): Promise<CampaignCreativeRequirement[]> {
  return campaignRequirementsStore[campaignId] ?? [];
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

  const items = await getInventoryItems(campaignId);
  if (items.length === 0) throw new Error('no_inventory');

  const existing = await getStoredCreativeRequirements(campaignId);
  if (existing.length > 0) {
    const next = campaignStore[campaignId];
    if (next) {
      next.status = existing.length > 0 ? next.status : 'pending_creative_review';
      next.updatedAt = nowIso();
    }
    return existing;
  }

  const groups = deriveCountFromSelections(selectedItems, allInventory);
  const requirements: CampaignCreativeRequirement[] = groups.map((group, index) => ({
    id: `${campaignId}-req-${group.format}-${index + 1}`,
    campaignId,
    canonicalFormat: group.format,
    status: 'pending_upload',
    mediaAssetId: null,
    rejectionReason: null,
  }));

  if (requirements.length > 0) {
    campaignRequirementsStore[campaignId] = requirements;
  }

  const next = campaignStore[campaignId];
  if (next) {
    if (next.status === 'draft' || next.status === 'blocked_by_creative') {
      next.status = 'pending_creative_review';
    }
    next.updatedAt = nowIso();
  }

  return requirements;
}

// ─── Upload Asset to Requirement ─────────────────────────

export async function uploadAssetToRequirement(
  requirementId: string,
  mediaAssetId: string,
): Promise<void> {
  const campaignId = Object.keys(campaignRequirementsStore).find(id =>
    (campaignRequirementsStore[id] ?? []).some(req => req.id === requirementId)
  );

  if (!campaignId) throw new Error('requirement_not_found');

  const req = campaignRequirementsStore[campaignId].find(item => item.id === requirementId);
  if (!req) throw new Error('requirement_not_found');
  if (req.status === 'approved') throw new Error('requirement_already_approved');

  req.status = 'uploaded';
  req.mediaAssetId = mediaAssetId;
  req.rejectionReason = null;

  // If there are already no pending review requirements, the campaign can remain in-flight.
  const campaign = await getCampaign(campaignId);
  const allReqs = await getStoredCreativeRequirements(campaignId);
  if (campaign.status === 'blocked_by_creative' && shouldAutoTransitionToReview(campaign.status, allReqs)) {
    campaignStore[campaignId].status = 'pending_creative_review';
  }
}

// ─── Unlink Asset from Requirement ────────────────────────

export async function unlinkAssetFromRequirement(requirementId: string): Promise<void> {
  const campaignId = Object.keys(campaignRequirementsStore).find(id =>
    (campaignRequirementsStore[id] ?? []).some(req => req.id === requirementId)
  );

  if (!campaignId) throw new Error('requirement_not_found');
  const req = campaignRequirementsStore[campaignId].find(item => item.id === requirementId);
  if (!req) throw new Error('requirement_not_found');
  if (req.status === 'approved') throw new Error('requirement_already_approved');

  req.status = 'pending_upload';
  req.mediaAssetId = null;
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
  const [campaign, items, requirements] = await Promise.all([
    getCampaign(campaignId),
    getInventoryItems(campaignId),
    getStoredCreativeRequirements(campaignId),
  ]);

  if (campaign.status === 'cancelled') throw new Error('campaign_cancelled');

  const readiness = computeLaunchReadiness(items.length, requirements);
  if (!readiness.ready) {
    throw new Error('booking_not_ready');
  }

  const now = nowIso();
  const row = campaignStore[campaignId];
  if (row) {
    row.status = 'pending_review';
    row.updatedAt = now;
  }

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
  return Object.values(campaignStore)
    .map(mapCampaignRow)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function listCampaignSummaries(): Promise<Array<CampaignDraft & { inventoryCount: number; uploadedCount: number; totalCount: number }>> {
  const campaigns = await listCampaigns();

  const summaries = await Promise.all(campaigns.map(async c => {
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

export function _debugClearCampaignDraftStoreForTests() {
  for (const id of Object.keys(campaignStore)) {
    delete campaignStore[id];
    delete campaignInventoryStore[id];
    delete campaignRequirementsStore[id];
  }
}
