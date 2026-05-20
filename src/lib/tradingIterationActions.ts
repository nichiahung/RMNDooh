import {
  DateMatchStatus,
  BookingSource,
  BookingStatus,
  BuyingMethod,
  CampaignDraftProfile,
  CampaignDraftStatus,
  CampaignInventoryItem,
  CampaignReadinessBlockingReason,
  CampaignReadinessLineItem,
  CampaignReadinessResult,
  LaunchReadinessStatus,
  CreativeAsset,
  CreativeAssetStatus,
  CreativeRequirement,
  CreativeRequirementAsset,
  PriceBook,
  PriceBookItem,
  PriceBookType,
  PriceVisibility,
  PricingApprovalRequest,
  PricingApprovalStatus,
  PricingSnapshot,
  Proposal,
  ProposalInventoryItem,
  ProposalStatus,
  SourceType,
} from '@/types/trading-models';
import {
  calculateInclusiveDays,
  calculateDateMatchStatus,
  recalcCampaignLineItemFlights,
  summarizeMixedFlight,
  compareCampaignFlightToLineItem,
} from '@/lib/services/flightService';
import { calculateProposalPrice, calculateSelfServicePrice, createPricingSnapshot, requiresPricingApproval, selectPriceBook, sanitizePricingForAdvertiser } from '@/lib/services/pricingService';
import {
  createCreativeAsset,
  createReplacementVersion,
  getAssetState,
  getAssetVersions,
  listCreativeAssets as listCreativeAssetsFromService,
  listCreativeRequirementAssets,
  reviewCreativeAsset,
  seedCreativeLibraryState,
  submitAssetForReview,
  validateCreativeAsset,
  assignAssetToRequirement as assignAssetToRequirementInService,
  clearCreativeLibraryState,
} from '@/lib/services/creativeLibraryService';
import { generateCreativeRequirementsFromInventory } from '@/lib/services/creativeRequirementsService';
import {
  getBlockingReasons,
  checkLaunchReadiness,
} from '@/lib/services/launchReadinessService';
import {
  tradingPriceBooks,
  tradingPriceBookItems,
  tradingPricingRules,
  tradingPricingApprovalRequests,
  tradingPricingSnapshots,
  tradingCreativeAssets,
  tradingCreativeAssetVersions,
  tradingCreativeRequirementAssets,
  tradingSeedProposals,
  tradingSeedProposalInventory,
  tradingSeedCampaignDrafts,
} from '@/data/tradingIterationMockData';

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

let nextId = 1000;
function nextIdValue(prefix: string): string {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

interface PriceBookCreateInput {
  name: string;
  code: string;
  priceBookType: PriceBookType;
  currency?: string;
  visibility?: PriceVisibility;
  status?: string;
  effectiveStartDate: string;
  effectiveEndDate?: string | null;
}

interface PriceBookItemCreateInput {
  priceBookId: string;
  inventoryLocationId?: string | null;
  screenId?: string | null;
  screenGroupId?: string | null;
  packageId?: string | null;
  billingUnit: PriceBookItem['billingUnit'];
  basePrice: number;
  minimumDays: number;
  estimatedCpm: number;
  status: string;
  effectiveStartDate: string;
  effectiveEndDate?: string | null;
}

interface CampaignDraftCreateInput {
  advertiserId: string;
  ownerUserId: string;
  name: string;
  buyingMethod?: BuyingMethod;
  requestedStartDate: string;
  requestedEndDate: string;
  timezone?: string;
}

interface CampaignDraftPatchInput {
  name?: string;
  status?: CampaignDraftStatus;
  requestedStartDate?: string | null;
  requestedEndDate?: string | null;
  timezone?: string | null;
}

interface CampaignDraftInventorySelectInput {
  inventoryLocationId: string;
  requestedStartDate?: string | null;
  requestedEndDate?: string | null;
  lineItemStartDate?: string | null;
  lineItemEndDate?: string | null;
  screenType?: string;
  pricePerDay?: number;
  estimatedDailyImpressions?: number;
  availabilityStatus?: string;
}

interface ProposalCreateInput {
  advertiserId: string;
  ownerUserId: string;
  name: string;
  buyingMethod?: BuyingMethod;
  requestedStartDate: string;
  requestedEndDate: string;
  timezone?: string;
}

interface ProposalVersionInput {
  proposalId: string;
  selectedInventory: ProposalInventoryItem[];
  requestedPriceBookId?: string;
  discountPercent?: number;
  manualAdjustment?: number;
}

interface FlightInput {
  campaignStartDate: string;
  campaignEndDate: string;
  lineItems: Array<{
    lineItemStartDate: string;
    lineItemEndDate: string;
  }>;
}

interface AvailabilityInput {
  inventoryId: string;
  startDate: string;
  endDate: string;
}

interface CreativeLibraryCreateInput {
  advertiserId: string;
  brandId?: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeMb: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  durationSeconds?: number | null;
}

interface CreativeLibraryReplaceInput {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeMb: number;
}

interface BookingRow {
  id: string;
  bookingStatus: BookingStatus;
  bookingSource: BookingSource;
  sourceType: SourceType;
  sourceId: string;
  campaignId: string | null;
  proposalId: string | null;
  campaignDraftId: string | null;
  createdAt: string;
  updatedAt: string;
  inventoryIds: string[];
  playlistAssigned: boolean;
  paymentCleared: boolean;
  policyPassed: boolean;
}

interface ProposalVersion {
  id: string;
  proposalId: string;
  version: number;
  selectedInventory: ProposalInventoryItem[];
  requestedPriceBookId?: string | null;
  discountPercent?: number;
  manualAdjustment?: number;
  finalQuote?: number;
  createdAt: string;
  approvedBy?: string | null;
  status: 'draft' | 'ready' | 'sent';
}

const state = {
  priceBooks: cloneDeep(tradingPriceBooks),
  priceBookItems: cloneDeep(tradingPriceBookItems),
  pricingRules: cloneDeep(tradingPricingRules),
  pricingApprovalRequests: cloneDeep(tradingPricingApprovalRequests),
  pricingSnapshots: cloneDeep(tradingPricingSnapshots),
  campaignDrafts: cloneDeep(tradingSeedCampaignDrafts) as CampaignDraftProfile[],
  campaignDraftInventory: new Map<string, CampaignInventoryItem[]>(),
  campaignDraftPricingSnapshots: new Map<string, PricingSnapshot>(),
  proposals: cloneDeep(tradingSeedProposals) as Proposal[],
  proposalVersions: new Map<string, ProposalVersion[]>(),
  proposalInventory: new Map<string, ProposalInventoryItem[]>(
    Object.entries(tradingSeedProposalInventory).map(([k, v]) => [k, cloneDeep(v)]),
  ),
  proposalPricingSnapshots: new Map<string, PricingSnapshot>(),
  creativeRequirementsByCampaign: new Map<string, CreativeRequirement[]>(),
  creativeRequirementsByProposal: new Map<string, CreativeRequirement[]>(),
  bookings: new Map<string, BookingRow>(),
};

seedCreativeLibraryState({
  assets: cloneDeep(tradingCreativeAssets),
  versions: cloneDeep(tradingCreativeAssetVersions),
  assignments: cloneDeep(tradingCreativeRequirementAssets),
});

// ---------------- Pricing ----------------

function findPriceBook(id: string): PriceBook | undefined {
  return state.priceBooks.find(book => book.id === id);
}

export async function listPriceBooks() {
  return cloneDeep(state.priceBooks);
}

export async function getPriceBook(id: string) {
  return findPriceBook(id) ? cloneDeep(findPriceBook(id)!) : null;
}

export async function createPriceBook(input: PriceBookCreateInput): Promise<PriceBook> {
  const now = nowIso();
  const created: PriceBook = {
    id: nextIdValue('pbx'),
    name: input.name,
    code: input.code,
    priceBookType: input.priceBookType,
    currency: input.currency ?? 'TWD',
    visibility: input.visibility ?? 'admin_only',
    status: input.status ?? 'active',
    effectiveStartDate: input.effectiveStartDate,
    effectiveEndDate: input.effectiveEndDate ?? null,
    createdAt: now,
    updatedAt: now,
  };
  state.priceBooks.unshift(created);
  return cloneDeep(created);
}

export async function updatePriceBook(id: string, patch: Partial<PriceBook>) {
  const book = findPriceBook(id);
  if (!book) return null;
  const updated: PriceBook = {
    ...book,
    ...patch,
    id: book.id,
    updatedAt: nowIso(),
  };
  const idx = state.priceBooks.findIndex(item => item.id === id);
  state.priceBooks[idx] = updated;
  return cloneDeep(updated);
}

export async function listPriceBookItems(filters?: { priceBookId?: string }) {
  const items = filters?.priceBookId
    ? state.priceBookItems.filter(item => item.priceBookId === filters.priceBookId)
    : state.priceBookItems;
  return cloneDeep(items);
}

export async function createPriceBookItem(input: PriceBookItemCreateInput): Promise<PriceBookItem> {
  const now = nowIso();
  const item: PriceBookItem = {
    id: nextIdValue('pbi'),
    priceBookId: input.priceBookId,
    inventoryLocationId: input.inventoryLocationId ?? null,
    screenId: input.screenId ?? null,
    screenGroupId: input.screenGroupId ?? null,
    packageId: input.packageId ?? null,
    billingUnit: input.billingUnit,
    basePrice: input.basePrice,
    minimumDays: input.minimumDays,
    estimatedCpm: input.estimatedCpm,
    status: input.status,
    effectiveStartDate: input.effectiveStartDate,
    effectiveEndDate: input.effectiveEndDate ?? null,
  };
  state.priceBookItems.unshift(item);
  return cloneDeep(item);
}

export async function estimatePricing({
  buyingMethod,
  inventory,
}: {
  buyingMethod: BuyingMethod;
  inventory: Array<{ inventoryId: string; days: number; dailyPrice: number }>;
  advertiserId?: string;
  agencyId?: string;
}) {
  const selected = inventory.map(item => ({
    inventoryId: item.inventoryId,
    days: item.days,
    inventoryIdDailyPrice: item.dailyPrice,
  }));

  if (buyingMethod === 'self_service') {
    return calculateSelfServicePrice(selected);
  }

  return calculateProposalPrice({
    advertiserId: '',
    selectedInventory: selected,
    discountPercent: 0,
    manualAdjustment: 0,
  });
}

export async function createPricingSnapshotAction(input: {
  sourceType: SourceType;
  sourceId: string;
  priceBookId?: string;
  listPriceTotal: number;
  discountAmount: number;
  manualAdjustment: number;
  finalQuote: number;
  approvalStatus: PricingApprovalStatus;
}) {
  const book = input.priceBookId ? findPriceBook(input.priceBookId) ?? selectPriceBook({
    buyingMethod: 'self_service',
    advertiserId: 'adv-default',
    inventoryId: undefined,
  }) : selectPriceBook({
    buyingMethod: 'self_service',
    advertiserId: 'adv-default',
    inventoryId: undefined,
  });
  const snapshot = createPricingSnapshot({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    priceBook: book,
    listPriceTotal: input.listPriceTotal,
    discountAmount: input.discountAmount,
    manualAdjustment: input.manualAdjustment,
    finalQuote: input.finalQuote,
    approvalStatus: input.approvalStatus,
  });
  state.pricingSnapshots.unshift(snapshot);

  if (input.sourceType === 'campaign_draft') {
    state.campaignDraftPricingSnapshots.set(input.sourceId, snapshot);
  }
  if (input.sourceType === 'proposal') {
    state.proposalPricingSnapshots.set(input.sourceId, snapshot);
  }
  return cloneDeep(snapshot);
}

export async function listPricingApprovalRequests(): Promise<PricingApprovalRequest[]> {
  return cloneDeep(state.pricingApprovalRequests);
}

export async function createPricingApprovalRequest(data: {
  sourceType: 'proposal' | 'campaign_draft';
  sourceId: string;
  requestedByUserId: string;
  requestedPrice: number;
  floorPrice: number | null;
  discountPercent?: number;
  reason: string;
}) {
  const request: PricingApprovalRequest = {
    id: nextIdValue('apr'),
    proposalId: data.sourceType === 'proposal' ? data.sourceId : null,
    proposalVersionId: null,
    campaignId: data.sourceType === 'campaign_draft' ? data.sourceId : null,
    requestedByUserId: data.requestedByUserId,
    requestedPrice: data.requestedPrice,
    floorPrice: data.floorPrice,
    discountPercent: data.discountPercent ?? null,
    reason: data.reason,
    status: requiresPricingApproval({
      finalQuote: data.requestedPrice,
      floorPrice: data.floorPrice,
      discountPercent: data.discountPercent,
      requestedByUserRole: 'sales',
      bookingSource: data.sourceType === 'proposal' ? 'proposal' : 'campaign_draft',
    }) ? 'required' : 'not_required',
    approvedByUserId: null,
    approvedAt: null,
    rejectedReason: null,
  };
  state.pricingApprovalRequests.unshift(request);
  return cloneDeep(request);
}

export async function approvePricingApprovalRequest(id: string, approvedByUserId: string) {
  const req = state.pricingApprovalRequests.find(item => item.id === id);
  if (!req) return null;
  req.status = 'approved';
  req.approvedByUserId = approvedByUserId;
  req.approvedAt = nowIso();
  req.rejectedReason = null;
  return cloneDeep(req);
}

export async function rejectPricingApprovalRequest(id: string, reason: string) {
  const req = state.pricingApprovalRequests.find(item => item.id === id);
  if (!req) return null;
  req.status = 'rejected';
  req.rejectedReason = reason;
  req.approvedAt = null;
  req.approvedByUserId = null;
  return cloneDeep(req);
}

// ---------------- Flight ----------------

export async function checkInventoryAvailability(payload: {
  campaignStartDate: string;
  campaignEndDate: string;
  inventoryItems: AvailabilityInput[];
}) {
  const requestedStart = payload.campaignStartDate;
  const requestedEnd = payload.campaignEndDate;
  const conflicts: string[] = [];

  const reserved = Array.from(state.bookings.values()).filter(booking =>
    ['confirmed', 'inventory_reserved', 'scheduled', 'live'].includes(booking.bookingStatus),
  );

  payload.inventoryItems.forEach(item => {
    const requestedOverlap = reserved.some(booking => {
      if (!booking.inventoryIds.includes(item.inventoryId)) return false;
      return true;
    });
    if (requestedOverlap) {
      conflicts.push(item.inventoryId);
    }
  });

  return {
    requestedStartDate: requestedStart,
    requestedEndDate: requestedEnd,
    conflictInventoryIds: conflicts,
    available: conflicts.length === 0,
  };
}

export async function compareCampaignLineItemFlight(input: FlightInput): Promise<{
  status: DateMatchStatus;
  overlapDays: number;
  campaignDays: number;
  lineItemDays: number;
}> {
  const line = input.lineItems[0];
  if (!line) {
    throw new Error('line_item_required');
  }
  const result = compareCampaignFlightToLineItem(input.campaignStartDate, input.campaignEndDate, line.lineItemStartDate, line.lineItemEndDate);
  return result;
}

export async function recalculateCampaignDraftFlight(campaignDraftId: string) {
  const draft = state.campaignDrafts.find(item => item.id === campaignDraftId);
  const items = state.campaignDraftInventory.get(campaignDraftId);
  if (!draft || !items) return null;

  const recalculated = recalcCampaignLineItemFlights({
    requestedStartDate: draft.requestedStartDate,
    requestedEndDate: draft.requestedEndDate,
    requestedDays: calculateInclusiveDays(draft.requestedStartDate, draft.requestedEndDate),
    timezone: draft.timezone,
  }, items);
  state.campaignDraftInventory.set(campaignDraftId, recalculated);
  return {
    campaignId: campaignDraftId,
    lineItems: cloneDeep(recalculated),
    mixedFlightSummary: summarizeMixedFlight(recalculated),
  };
}

export async function recalculateProposalFlight(proposalId: string) {
  const proposal = state.proposals.find(item => item.id === proposalId);
  if (!proposal) return null;
  const items = state.proposalInventory.get(proposalId) ?? [];
  const recalculated = recalcCampaignLineItemFlights({
    requestedStartDate: proposal.requestedStartDate,
    requestedEndDate: proposal.requestedEndDate,
    requestedDays: calculateInclusiveDays(proposal.requestedStartDate, proposal.requestedEndDate),
    timezone: proposal.timezone,
  }, items.map(item => ({
    proposalId: proposalId,
    id: item.id,
    campaignId: proposalId,
    inventoryLocationId: item.inventoryLocationId,
    screenId: null,
    requestedStartDate: proposal.requestedStartDate,
    requestedEndDate: proposal.requestedEndDate,
    lineItemStartDate: item.lineItemStartDate,
    lineItemEndDate: item.lineItemEndDate,
    activeDays: item.activeDays,
    dateMatchStatus: item.dateMatchStatus,
    availabilityStatus: item.availabilityStatus,
    priceForActiveDays: item.priceForActiveDays,
    estimatedImpressionsForActiveDays: item.estimatedImpressionsForActiveDays,
    creativeDueAt: item.creativeDueAt,
    earliestPlaybackAt: item.earliestPlaybackAt,
  })));
  state.proposalInventory.set(
    proposalId,
    recalculated.map(item => ({ ...item, proposalId })) as unknown as ProposalInventoryItem[],
  );
  return {
    proposalId,
    lineItems: cloneDeep(state.proposalInventory.get(proposalId)),
    mixedFlightSummary: summarizeMixedFlight(recalculated),
  };
}

// ---------------- Campaign draft ----------------

function normalizeCampaignDraft(input: CampaignDraftProfile): CampaignDraftProfile {
  return { ...input };
}

export async function createCampaignDraft(input: CampaignDraftCreateInput): Promise<CampaignDraftProfile> {
  const draft: CampaignDraftProfile = {
    id: nextIdValue('draft'),
    advertiserId: input.advertiserId,
    ownerUserId: input.ownerUserId,
    name: input.name,
    status: 'in_progress',
    buyingMethod: input.buyingMethod ?? 'self_service',
    requestedStartDate: input.requestedStartDate,
    requestedEndDate: input.requestedEndDate,
    timezone: input.timezone ?? 'Asia/Taipei',
    estimatedBudget: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  state.campaignDrafts.unshift(draft);
  state.campaignDraftInventory.set(draft.id, []);
  state.creativeRequirementsByCampaign.set(draft.id, []);
  return normalizeCampaignDraft(draft);
}

export async function updateCampaignDraft(campaignDraftId: string, patch: CampaignDraftPatchInput): Promise<CampaignDraftProfile | null> {
  const draft = state.campaignDrafts.find(item => item.id === campaignDraftId);
  if (!draft) return null;
  const next: CampaignDraftProfile = {
    ...draft,
    ...patch,
    id: draft.id,
    updatedAt: nowIso(),
  };
  const idx = state.campaignDrafts.findIndex(item => item.id === campaignDraftId);
  state.campaignDrafts[idx] = next;
  return normalizeCampaignDraft(next);
}

export async function selectCampaignDraftInventory(
  campaignDraftId: string,
  inputs: CampaignDraftInventorySelectInput[],
) {
  const draft = state.campaignDrafts.find(item => item.id === campaignDraftId);
  if (!draft) return null;

  const now = nowIso();
  const campaignDays = calculateInclusiveDays(draft.requestedStartDate, draft.requestedEndDate, draft.timezone);
  const items: CampaignInventoryItem[] = inputs.map((input, index) => {
    const lineStart = input.lineItemStartDate ?? draft.requestedStartDate;
    const lineEnd = input.lineItemEndDate ?? draft.requestedEndDate;
    const activeDays = calculateInclusiveDays(lineStart, lineEnd, draft.timezone);
    const dateMatchStatus = calculateDateMatchStatus(
      draft.requestedStartDate,
      draft.requestedEndDate,
      lineStart,
      lineEnd,
    );
    const priceForActiveDays = (input.pricePerDay ?? 0) * (activeDays || 0);
    const estimatedImpressionsForActiveDays = (input.estimatedDailyImpressions ?? 0) * (activeDays || 0);

    return {
      id: `li-${campaignDraftId}-${index}`,
      campaignId: campaignDraftId,
      inventoryLocationId: input.inventoryLocationId,
      screenId: null,
      requestedStartDate: draft.requestedStartDate,
      requestedEndDate: draft.requestedEndDate,
      lineItemStartDate: lineStart,
      lineItemEndDate: lineEnd,
      activeDays,
      dateMatchStatus,
      availabilityStatus: input.availabilityStatus ?? 'reserved',
      priceForActiveDays,
      estimatedImpressionsForActiveDays,
      creativeDueAt: null,
      earliestPlaybackAt: input.requestedStartDate ?? draft.requestedStartDate,
    };
  });
  draft.estimatedBudget = items.reduce((acc, item) => acc + item.priceForActiveDays, 0);
  state.campaignDraftInventory.set(campaignDraftId, items);
  return {
    campaignDraftId,
    items: cloneDeep(items),
    requestedDays: campaignDays,
    mixedFlightSummary: summarizeMixedFlight(items),
  };
}

export async function generateCampaignDraftCreativeRequirements(campaignDraftId: string) {
  const draftItems = state.campaignDraftInventory.get(campaignDraftId) ?? [];
  const input = draftItems.map(item => ({
    inventoryId: item.inventoryLocationId ?? '',
    screenType: 'Billboard',
    requestedByCampaignId: campaignDraftId,
  }));
  const requirements = generateCreativeRequirementsFromInventory(input);
  const merged = requirements.map((item, index) => ({
    id: item.id ?? `${campaignDraftId}-req-${index + 1}`,
    campaignId: campaignDraftId,
    proposalId: null,
    canonicalFormat: item.canonicalFormat,
    status: item.status,
    venueCount: item.venueCount,
    requestedByCampaignId: campaignDraftId,
  }));
  state.creativeRequirementsByCampaign.set(campaignDraftId, merged);
  return {
    campaignDraftId,
    requirements: cloneDeep(merged),
  };
}

export async function estimateCampaignDraftPrice(campaignDraftId: string) {
  const draft = state.campaignDrafts.find(item => item.id === campaignDraftId);
  const items = state.campaignDraftInventory.get(campaignDraftId) ?? [];
  if (!draft) return null;
  if (items.length === 0) {
    return {
      campaignDraftId,
      pricing: calculateSelfServicePrice([]),
    };
  }

  const lines = items.map(item => ({
    inventoryId: item.inventoryLocationId ?? '',
    days: item.activeDays ?? calculateInclusiveDays(item.lineItemStartDate, item.lineItemEndDate),
    inventoryIdDailyPrice: item.activeDays ? item.priceForActiveDays / item.activeDays : 0,
  }));
  const pricing = calculateSelfServicePrice(lines);
  const snapshot = createPricingSnapshot({
    sourceType: 'campaign_draft',
    sourceId: campaignDraftId,
    priceBook: selectPriceBook({
      buyingMethod: draft.buyingMethod,
      advertiserId: draft.advertiserId,
      inventoryId: lines[0]?.inventoryId,
    }),
    listPriceTotal: pricing.listPriceTotal,
    discountAmount: pricing.discountAmount,
    manualAdjustment: pricing.manualAdjustment,
    finalQuote: pricing.finalQuote,
    approvalStatus: pricing.requiresApproval ? 'required' : 'not_required',
  });
  state.campaignDraftPricingSnapshots.set(campaignDraftId, snapshot);
  return {
    campaignDraftId,
    pricing: {
      ...pricing,
      snapshot,
    },
  };
}

export async function confirmCampaignDraftBooking(campaignDraftId: string) {
  const draft = state.campaignDrafts.find(item => item.id === campaignDraftId);
  if (!draft) return null;
  draft.status = 'confirmed';
  draft.updatedAt = nowIso();
  const items = state.campaignDraftInventory.get(campaignDraftId) ?? [];
  const bookingId = nextIdValue('booking');
  state.bookings.set(bookingId, {
    id: bookingId,
    bookingStatus: 'confirmed',
    bookingSource: 'self_service',
    sourceType: 'campaign_draft',
    sourceId: campaignDraftId,
    campaignId: campaignDraftId,
    campaignDraftId,
    proposalId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    inventoryIds: items
      .map(item => item.inventoryLocationId)
      .filter((id): id is string => Boolean(id)),
    playlistAssigned: false,
    paymentCleared: false,
    policyPassed: true,
  });
  return {
    campaignDraftId,
    bookingId,
    bookingStatus: 'confirmed',
    draft: cloneDeep(draft),
  };
}

// ---------------- Proposal ----------------

export async function createProposal(input: ProposalCreateInput): Promise<Proposal> {
  const proposal: Proposal = {
    id: nextIdValue('prop'),
    advertiserId: input.advertiserId,
    ownerUserId: input.ownerUserId,
    name: input.name,
    status: 'draft',
    buyingMethod: input.buyingMethod ?? 'sales_assisted',
    requestedStartDate: input.requestedStartDate,
    requestedEndDate: input.requestedEndDate,
    timezone: input.timezone ?? 'Asia/Taipei',
    finalQuote: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  state.proposals.unshift(proposal);
  return cloneDeep(proposal);
}

export async function createProposalVersion(payload: ProposalVersionInput) {
  const proposal = state.proposals.find(item => item.id === payload.proposalId);
  if (!proposal) return null;
  const existing = state.proposalVersions.get(payload.proposalId) ?? [];
  const version: ProposalVersion = {
    id: `${payload.proposalId}-v${existing.length + 1}`,
    proposalId: payload.proposalId,
    version: existing.length + 1,
    selectedInventory: payload.selectedInventory,
    requestedPriceBookId: payload.requestedPriceBookId ?? null,
    discountPercent: payload.discountPercent,
    manualAdjustment: payload.manualAdjustment ?? 0,
    finalQuote: undefined,
    createdAt: nowIso(),
    approvedBy: null,
    status: 'draft',
  };
  state.proposalVersions.set(payload.proposalId, [...existing, version]);
  state.proposalInventory.set(payload.proposalId, payload.selectedInventory);
  return cloneDeep(version);
}

export async function generateProposalCreativeRequirements(proposalId: string) {
  const items = state.proposalInventory.get(proposalId) ?? [];
  const input = items.map(item => ({
    inventoryId: item.inventoryLocationId ?? '',
    screenType: 'Billboard',
    requestedByCampaignId: proposalId,
  }));
  const requirements = generateCreativeRequirementsFromInventory(input);
  const normalized = requirements.map((item, index) => ({
    id: item.id ?? `${proposalId}-req-${index + 1}`,
    proposalId,
    campaignId: null,
    canonicalFormat: item.canonicalFormat,
    status: item.status,
    venueCount: item.venueCount,
    requestedByCampaignId: proposalId,
  }));
  state.creativeRequirementsByProposal.set(proposalId, normalized);
  return {
    proposalId,
    requirements: cloneDeep(normalized),
  };
}

export async function estimateProposalPrice(proposalId: string, options?: { discountPercent?: number; manualAdjustment?: number }) {
  const proposal = state.proposals.find(item => item.id === proposalId);
  const latest = (state.proposalVersions.get(proposalId) ?? []).slice(-1)[0];
  if (!proposal || !latest) return null;

  const selectedInventory = latest.selectedInventory.length > 0
    ? latest.selectedInventory
    : state.proposalInventory.get(proposalId) ?? [];

  const pricing = calculateProposalPrice({
    advertiserId: proposal.advertiserId,
    selectedInventory: selectedInventory.map(line => ({
      inventoryId: line.inventoryLocationId ?? '',
      days: line.activeDays ?? calculateInclusiveDays(line.lineItemStartDate, line.lineItemEndDate, proposal.timezone),
      inventoryIdDailyPrice: line.activeDays
        ? line.priceForActiveDays / line.activeDays
        : 0,
    })),
    requestedPriceBook: latest.requestedPriceBookId
      ? findPriceBook(latest.requestedPriceBookId)
      : undefined,
    discountPercent: options?.discountPercent ?? latest.discountPercent,
    manualAdjustment: options?.manualAdjustment ?? latest.manualAdjustment,
  });
  const requestedPriceBook = latest.requestedPriceBookId ? findPriceBook(latest.requestedPriceBookId) ?? undefined : undefined;
  const snapshot = createPricingSnapshot({
    sourceType: 'proposal',
    sourceId: proposalId,
    priceBook: requestedPriceBook ?? selectPriceBook({
      buyingMethod: proposal.buyingMethod,
      advertiserId: proposal.advertiserId,
      inventoryIds: selectedInventory.map(item => item.inventoryLocationId).filter((id): id is string => Boolean(id)),
      inventoryId: selectedInventory[0]?.inventoryLocationId ?? undefined,
    }),
    listPriceTotal: pricing.listPriceTotal,
    discountAmount: pricing.discountAmount,
    manualAdjustment: pricing.manualAdjustment,
    finalQuote: pricing.finalQuote,
    approvalStatus: pricing.requiresApproval ? 'required' : 'not_required',
  });
  state.proposalPricingSnapshots.set(proposalId, snapshot);
  proposal.finalQuote = pricing.finalQuote;
  return {
    proposalId,
    pricing: {
      ...pricing,
      snapshot,
      canExposeToAdvertiser: sanitizePricingForAdvertiser(snapshot),
    },
  };
};

export async function sendProposalToAdvertiser(proposalId: string) {
  const proposal = state.proposals.find(item => item.id === proposalId);
  if (!proposal) return null;
  proposal.status = 'sent_to_advertiser';
  proposal.updatedAt = nowIso();
  return cloneDeep(proposal);
}

export function markProposalRevised(proposalId: string): { proposals: Proposal[] } {
  const proposal = state.proposals.find(p => p.id === proposalId);
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
  proposal.status = 'revised';
  return { proposals: cloneDeep(state.proposals) };
}

export function adminSendProposalToAdvertiser(proposalId: string): { proposals: Proposal[] } {
  const proposal = state.proposals.find(p => p.id === proposalId);
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
  proposal.status = 'sent_to_advertiser';
  return { proposals: cloneDeep(state.proposals) };
}

export async function approveProposalVersion(proposalId: string) {
  const proposal = state.proposals.find(item => item.id === proposalId);
  if (!proposal) return null;
  proposal.status = 'approved_by_advertiser';
  proposal.updatedAt = nowIso();
  return cloneDeep(proposal);
}

export async function confirmProposalBooking(proposalId: string) {
  const proposal = state.proposals.find(item => item.id === proposalId);
  if (!proposal) return null;
  proposal.status = 'approved_by_advertiser';
  const bookingId = nextIdValue('booking');
  state.bookings.set(bookingId, {
    id: bookingId,
    bookingStatus: 'confirmed',
    bookingSource: 'proposal',
    sourceType: 'proposal',
    sourceId: proposalId,
    campaignId: null,
    proposalId,
    campaignDraftId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    inventoryIds: (state.proposalInventory.get(proposalId) ?? [])
      .map(item => item.inventoryLocationId)
      .filter((id): id is string => Boolean(id)),
    playlistAssigned: false,
    paymentCleared: false,
    policyPassed: true,
  });
  return {
    proposalId,
    bookingId,
    bookingStatus: 'confirmed' as BookingStatus,
  };
}

// ---------------- Creative library ----------------

export async function listCreativeLibraryAssets(params?: { status?: CreativeAssetStatus }) {
  const { status } = params ?? {};
  const assets = listCreativeAssetsFromService().filter(
    item => !status || item.approvalStatus === status,
  );
  return cloneDeep(assets);
}

export async function createCreativeLibraryAsset(input: CreativeLibraryCreateInput) {
  const created = createCreativeAsset({
    advertiserId: input.advertiserId,
    brandId: input.brandId ?? null,
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    fileType: input.fileType,
    width: input.width,
    height: input.height,
    aspectRatio: input.aspectRatio,
    durationSeconds: input.durationSeconds,
    fileSizeMb: input.fileSizeMb,
  });
  // refresh internal library state with fresh object from service db
  const stateAsset = getAssetState(created.id) ?? created;
  const versions = getAssetVersions(created.id);
  seedCreativeLibraryState({
    assets: [...tradingCreativeAssets, stateAsset],
    versions: [...tradingCreativeAssetVersions, ...versions],
    assignments: listCreativeRequirementAssets(),
  });
  return cloneDeep(stateAsset);
}

export async function getCreativeLibraryAsset(assetId: string) {
  const found = getAssetState(assetId);
  return found ? cloneDeep(found) : null;
}

export async function listCreativeAssetVersions(assetId: string) {
  const versions = getAssetVersions(assetId);
  return cloneDeep(versions);
}

export async function replaceCreativeAsset(assetId: string, payload: CreativeLibraryReplaceInput) {
  const replaced = createReplacementVersion(assetId, {
    fileName: payload.fileName,
    fileUrl: payload.fileUrl,
    fileType: payload.fileType,
    fileSizeMb: payload.fileSizeMb,
  });
  const latest = getAssetState(assetId) ?? null;
  seedCreativeLibraryState({
    assets: [...tradingCreativeAssets, ...(latest ? [latest] : [])],
    versions: [...tradingCreativeAssetVersions, ...getAssetVersions(assetId)],
    assignments: listCreativeRequirementAssets(),
  });
  return {
    asset: cloneDeep(latest),
    replacementVersion: cloneDeep(replaced),
  };
}

export async function validateCreativeLibraryAsset(assetId: string) {
  const result = validateCreativeAsset(assetId);
  const refetched = getAssetState(assetId) ?? null;
  return cloneDeep(refetched ?? result);
}

export async function submitCreativeAssetForReview(assetId: string) {
  const result = submitAssetForReview(assetId);
  const refetched = getAssetState(assetId) ?? null;
  return cloneDeep(refetched ?? result);
}

export async function reviewCreativeAssetInQueue(
  assetId: string,
  decision: 'approved' | 'rejected',
  reason?: string,
  restrictions?: string,
) {
  const result = reviewCreativeAsset(assetId, decision, reason, restrictions);
  const refetched = getAssetState(assetId) ?? null;
  return cloneDeep(refetched ?? result);
}

export async function assignAssetToRequirement(assetId: string, requirementId: string) {
  const assigned = assignAssetToRequirementInService(assetId, requirementId);
  seedCreativeLibraryState({
    assets: listCreativeAssetsFromService(),
    versions: [...tradingCreativeAssetVersions, ...getAssetVersions(assetId)],
    assignments: listCreativeRequirementAssets(),
  });
  return cloneDeep(assigned);
}

export async function listCreativeReviewQueue() {
  return listCreativeAssetsFromService()
    .filter(item => item.approvalStatus === 'pending_review' || item.approvalStatus === 'rejected')
    .map(item => ({
      ...item,
      reviewedAt: item.updatedAt,
    }));
}

// ---------------- Coverage ----------------

function getCreativeRequirementsForCampaign(campaignId: string): CreativeRequirement[] {
  return state.creativeRequirementsByCampaign.get(campaignId) ?? [];
}

function getCreativeRequirementsForProposal(proposalId: string): CreativeRequirement[] {
  return state.creativeRequirementsByProposal.get(proposalId) ?? [];
}

export async function getCampaignCreativeCoverage(campaignId: string) {
  const requirements = getCreativeRequirementsForCampaign(campaignId);
  const assignments = listCreativeRequirementAssets();
  const requirementsWithCoverage = requirements.map(req => ({
    requirement: req,
    assignedAssets: assignments.filter(a => a.creativeRequirementId === req.id),
  }));
  const payload = requirementsWithCoverage.map(({ requirement }) => requirement.id).length
    ? requirementsWithCoverage.map(({ requirement }) => ({
      requirementId: requirement.id,
      requirement,
      missingInventoryIds: [],
    }))
    : [];
  return {
    campaignId,
    requirements: cloneDeep(requirements),
    requirementCoverageMatrix: payload,
  };
}

export async function getCreativeRequirementCoverage(requirementId: string) {
  const requirement = [...state.creativeRequirementsByCampaign.values(), ...state.creativeRequirementsByProposal.values()]
    .flat()
    .find(item => item.id === requirementId);
  if (!requirement) return null;
  const assignments = listCreativeRequirementAssets();
  const coverage = assignments.filter(item => item.creativeRequirementId === requirementId);
  return {
    requirementId,
    assignmentCount: coverage.length,
    blockedLocations: coverage.filter(item => item.coverageStatus !== 'covered').map(item => item.id),
    coverage: cloneDeep(coverage),
  };
}

export async function getCreativeAssetCoverageMatrix(campaignId: string) {
  const requirements = getCreativeRequirementsForCampaign(campaignId);
  const assignments = listCreativeRequirementAssets();
  const result = requirements.map(req => {
    const reqAssignments = assignments.filter(a => a.creativeRequirementId === req.id);
    return {
      requirementId: req.id,
      requirementStatus: req.status,
      assignmentIds: reqAssignments.map(item => item.id),
      missing: reqAssignments.filter(item => item.coverageStatus !== 'covered').map(item => item.id),
    };
  });
  return {
    campaignId,
    matrix: result,
  };
}

// ---------------- Launch readiness ----------------

function buildLaunchReadinessLineItemsFromCampaignInventory(campaignId: string): CampaignReadinessLineItem[] {
  const items = state.campaignDraftInventory.get(campaignId) ?? [];
  const requirements = getCreativeRequirementsForCampaign(campaignId);
  const requirementsComplete = requirements.length > 0;
  const allApproved = requirements.every(req => req.status === 'approved');
  const allUploaded = requirements.every(req => req.status !== 'missing' && req.status !== 'partially_uploaded');
  const allValid = requirements.every(req => req.status !== 'invalid' && req.status !== 'missing');

  return items.map(item => ({
    id: `${campaignId}-rl-${item.id}`,
    campaignId,
    campaignInventoryItemId: item.id,
    bookingConfirmed: true,
    inventoryReserved: item.availabilityStatus === 'reserved',
    flightValid: item.dateMatchStatus !== 'no_match',
    creativeRequirementsGenerated: requirementsComplete,
    requiredCreativesUploaded: requirementsComplete && allUploaded,
    requiredCreativesValid: requirementsComplete && allValid,
    requiredCreativesApproved: requirementsComplete && allApproved,
    playlistAssigned: true,
    policyPassed: true,
    paymentCleared: false,
    canPlay: false,
    lineItemReadyStatus: 'not_ready',
  }));
}

export async function getCampaignLaunchReadiness(campaignId: string) {
  const lineItems = buildLaunchReadinessLineItemsFromCampaignInventory(campaignId);
  const result = lineItems.length > 0
    ? checkLaunchReadiness({ campaignId, lineItems, bookingStatus: 'pending_confirmation' as LaunchReadinessStatus })
    : { campaignId, status: 'not_ready' as LaunchReadinessStatus, readyLineItemIds: [], blockedLineItemIds: [], blockers: [] };
  return result;
}

export async function checkCampaignLaunchReadinessAction(campaignId: string): Promise<CampaignReadinessResult> {
  const data = await getCampaignLaunchReadiness(campaignId);
  return data;
}

export async function getCampaignLaunchReadinessBlockers(campaignId: string): Promise<CampaignReadinessBlockingReason[]> {
  const reasons = getBlockingReasons(campaignId).map(code => ({ code, message: `Blocked by ${code}` }));
  return reasons;
}

export async function scheduleCampaignLaunch(campaignId: string) {
  const readiness = await getCampaignLaunchReadiness(campaignId);
  const blocked = readiness.status !== 'ready_for_launch' && readiness.status !== 'ready_for_scheduling';
  if (blocked) {
    throw new Error('launch_readiness_not_ready');
  }
  return {
    campaignId,
    scheduledAt: nowIso(),
    action: 'scheduled',
  };
}

// ---------------- Admin ----------------

export async function getAdminDashboardWorkQueues() {
  return {
    needsSalesAction: state.proposals.filter(item => item.status === 'sent_to_advertiser').length,
    needsBookingAction: state.campaignDrafts.filter(item => item.status === 'ready_to_confirm').length,
    needsCreativeReview: (await listCreativeReviewQueue()).length,
    needsCreativeCoverage: 0,
    needsLaunchAction: state.campaignDrafts.filter(item => item.status === 'ready_to_confirm').length,
    updatedAt: nowIso(),
  };
}

export async function listAdminProposals() {
  const countsByStatus: Record<ProposalStatus, number> = {
    draft: 0,
    sent_to_advertiser: 0,
    viewed_by_advertiser: 0,
    commented: 0,
    change_requested: 0,
    revised: 0,
    approved_by_advertiser: 0,
    expired: 0,
    cancelled: 0,
  };
  return {
    proposals: cloneDeep(state.proposals),
    countsByStatus: state.proposals.reduce<Record<ProposalStatus, number>>((acc, proposal) => {
      acc[proposal.status] = (acc[proposal.status] ?? 0) + 1;
      return acc;
    }, countsByStatus),
  };
}

export async function listAdminCampaignDrafts() {
  return cloneDeep(state.campaignDrafts);
}

export async function listAdminBookings() {
  return Array.from(state.bookings.values()).map(item => cloneDeep(item));
}

export async function listAdminCreativeLibrary() {
  return listCreativeLibraryAssets();
}

export async function listAdminCreativeReview() {
  return listCreativeReviewQueue();
}

export async function listAdminCreativeCoverage() {
  const payload = state.campaignDraftInventory.size > 0
    ? Array.from(state.campaignDraftInventory.keys())
    : [];
  return Promise.all(payload.map(async id => {
    const coverage = await getCampaignCreativeCoverage(id);
    const draft = state.campaignDrafts.find(d => d.id === id);
    return { ...coverage, campaignName: draft?.name };
  }));
}

export async function listAdminLaunchReadiness() {
  const campaigns = Array.from(state.campaignDraftInventory.keys());
  const values = await Promise.all(campaigns.map(async id => {
    const result = await getCampaignLaunchReadiness(id);
    const draft = state.campaignDrafts.find(d => d.id === id);
    return { ...result, campaignName: draft?.name };
  }));
  return values;
}

export async function listAdminPricing() {
  return {
    priceBooks: cloneDeep(state.priceBooks),
    priceBookItems: cloneDeep(state.priceBookItems),
    pricingRules: cloneDeep(state.pricingRules),
    approvalQueue: cloneDeep(state.pricingApprovalRequests),
  };
}

export async function resetTradingIterationState() {
  state.priceBooks = cloneDeep(tradingPriceBooks);
  state.priceBookItems = cloneDeep(tradingPriceBookItems);
  state.pricingRules = cloneDeep(tradingPricingRules);
  state.pricingApprovalRequests = cloneDeep(tradingPricingApprovalRequests);
  state.pricingSnapshots = cloneDeep(tradingPricingSnapshots);
  state.campaignDrafts = cloneDeep(tradingSeedCampaignDrafts);
  state.campaignDraftInventory = new Map();
  state.campaignDraftPricingSnapshots = new Map();
  state.proposals = cloneDeep(tradingSeedProposals);
  state.proposalVersions = new Map();
  state.proposalInventory = new Map(
    Object.entries(tradingSeedProposalInventory).map(([k, v]) => [k, cloneDeep(v)]),
  );
  state.proposalPricingSnapshots = new Map();
  state.creativeRequirementsByCampaign = new Map();
  state.creativeRequirementsByProposal = new Map();
  state.bookings = new Map();
  clearCreativeLibraryState();
  seedCreativeLibraryState({
    assets: cloneDeep(tradingCreativeAssets),
    versions: cloneDeep(tradingCreativeAssetVersions),
    assignments: cloneDeep(tradingCreativeRequirementAssets),
  });
  nextId = 1000;
}
