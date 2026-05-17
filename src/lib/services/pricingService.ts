import type {
  PriceBook,
  PriceBookType,
  SourceType,
  BuyingMethod,
  PricingRule,
  PricingSnapshot,
  PricingApprovalStatus,
  PricingApprovalRequest,
} from '@/types/trading-models';

import {
  getMockPriceBookByType,
  tradingPriceBookItemsByPriceBook,
  tradingPricingRules,
  tradingApprovalRequestsById,
  tradingPricingApprovalRequests,
} from '@/data/tradingIterationMockData';

export interface PriceBookSelectionInput {
  buyingMethod: BuyingMethod;
  advertiserId: string;
  agencyId?: string;
  inventoryId?: string;
  inventoryIds?: string[];
  packageId?: string;
}

export interface PricingContext {
  priceBookType?: PriceBookType;
  sourceType: SourceType;
  sourceId: string;
}

export interface SelfServicePricingLineItem {
  inventoryId: string;
  days: number;
  inventoryIdDailyPrice: number;
}

export interface ProposalPricingInput {
  advertiserId: string;
  agencyId?: string;
  selectedInventory: SelfServicePricingLineItem[];
  requestedPriceBook?: PriceBook;
  discountPercent?: number;
  manualAdjustment?: number;
}

export interface PricingComputationResult {
  listPriceTotal: number;
  finalQuote: number;
  estimatedCpm: number;
  discountAmount: number;
  discountPercent: number;
  manualAdjustment: number;
  appliedPricingBook: PriceBook;
  requiresApproval: boolean;
  pricingRuleResults: Array<{ ruleId: string; action: string; value: number }>;
}

export interface AdViewPricing {
  finalQuote: number;
  currency: string;
}

function sumBy(items: SelfServicePricingLineItem[]): number {
  return items.reduce((acc, item) => acc + item.days * item.inventoryIdDailyPrice, 0);
}

export function calculateSelfServicePrice(
  selectedInventory: SelfServicePricingLineItem[],
): PricingComputationResult {
  const book = getMockPriceBookByType('self_service_msrp');
  if (!book) {
    throw new Error('missing_self_service_price_book');
  }

  const listPriceTotal = sumBy(selectedInventory);
  const estimatedCpm = 0;
  const discountPercent = 0;
  const manualAdjustment = 0;
  const discountAmount = 0;
  const finalQuote = listPriceTotal + discountAmount + manualAdjustment;

  return {
    listPriceTotal,
    finalQuote,
    estimatedCpm,
    discountAmount,
    discountPercent,
    manualAdjustment,
    appliedPricingBook: book,
    requiresApproval: false,
    pricingRuleResults: [{ ruleId: 'system', action: 'self_service_base', value: finalQuote }],
  };
}

export function selectPriceBook({
  buyingMethod,
  advertiserId,
  agencyId,
  inventoryId,
  inventoryIds,
  packageId,
}: PriceBookSelectionInput): PriceBook {
  const fallbackMap: Record<BuyingMethod, PriceBookType> = {
    self_service: 'self_service_msrp',
    sales_assisted: 'sales_rate_card',
    programmatic: 'manual_override',
  };

  const preferredType = fallbackMap[buyingMethod];
  const candidate = getMockPriceBookByType(preferredType);
  if (!candidate) {
    throw new Error(`no_price_book_for:${buyingMethod}`);
  }

  const resolvedInventoryIds = inventoryIds?.length
    ? [...new Set(inventoryIds.filter((id): id is string => Boolean(id)))]
    : inventoryId
      ? [inventoryId]
      : [];
  if (resolvedInventoryIds.length || packageId) {
    const items = tradingPriceBookItemsByPriceBook.get(candidate.id) ?? [];
    const hasWildcard = items.some(item => item.inventoryLocationId == null && item.status === 'active');
    const allMatch = resolvedInventoryIds.every(id =>
      items.some(item =>
        item.status === 'active' &&
        (item.inventoryLocationId == null || item.inventoryLocationId === id) &&
        (item.packageId === packageId || item.packageId == null),
      ));
    if (!(hasWildcard || allMatch) && resolvedInventoryIds.length) {
      throw new Error('price_book_no_match_for_selected_scope');
    }
    if (!resolvedInventoryIds.length && packageId) {
      const hasPackage = items.some(item => item.status === 'active' && (item.packageId === packageId || item.packageId == null));
      if (!hasPackage) {
        throw new Error('price_book_no_match_for_selected_scope');
      }
    }
  }

  return candidate;
}

export function applyPricingRules(
  basePriceTotal: number,
  rules: PricingRule[],
): { finalQuote: number; pricingRuleResults: Array<{ ruleId: string; action: string; value: number }> } {
  let running = basePriceTotal;
  const pricingRuleResults: Array<{ ruleId: string; action: string; value: number }> = [];

  rules.forEach(rule => {
    if (rule.status !== 'active') return;

    if (rule.ruleType === 'duration_discount') {
      const payload = rule.rulePayload as { percent?: number };
      const pct = typeof payload.percent === 'number' ? payload.percent : 0;
      const discount = -(running * pct) / 100;
      running += discount;
      pricingRuleResults.push({ ruleId: rule.id, action: 'duration_discount', value: discount });
    }

    if (rule.ruleType === 'minimum_booking_days') {
      const payload = rule.rulePayload as { minimum_booking_days?: number; surcharge?: number };
      const surcharge = payload.surcharge ?? 0;
      if (running > 0) {
        running += surcharge;
        pricingRuleResults.push({ ruleId: rule.id, action: 'minimum_booking_days', value: surcharge });
      }
    }

    if (rule.ruleType === 'seasonal_surcharge') {
      const payload = rule.rulePayload as { amount?: number };
      const surcharge = payload.amount ?? 0;
      running += surcharge;
      pricingRuleResults.push({ ruleId: rule.id, action: 'seasonal_surcharge', value: surcharge });
    }
  });

  return { finalQuote: Math.round(running), pricingRuleResults };
}

function resolvePricingRules(priceBookId: string): PricingRule[] {
  return tradingPricingRules.filter(rule => rule.appliesToPriceBookId === priceBookId);
}

export function calculateProposalPrice(input: ProposalPricingInput): PricingComputationResult {
  const book =
    input.requestedPriceBook ??
    selectPriceBook({
      buyingMethod: 'sales_assisted',
      advertiserId: input.advertiserId,
      agencyId: input.agencyId,
      inventoryIds: input.selectedInventory.map(item => item.inventoryId),
    });

  const listPriceTotal = sumBy(input.selectedInventory);
  const discountPercent = input.discountPercent ?? 0;
  const manualAdjustment = input.manualAdjustment ?? 0;
  const discountAmount = Math.round(-(listPriceTotal * discountPercent) / 100);

  const ruleInput = resolvePricingRules(book.id);
  const ruleResult = applyPricingRules(listPriceTotal + discountAmount + manualAdjustment, ruleInput);
  const finalQuote = ruleResult.finalQuote;

  return {
    listPriceTotal,
    finalQuote,
    estimatedCpm: 0,
    discountAmount,
    discountPercent,
    manualAdjustment,
    appliedPricingBook: book,
    requiresApproval: requiresPricingApproval({
      finalQuote: finalQuote,
      floorPrice: 25000,
      discountPercent,
      requestedByUserRole: 'sales',
      bookingSource: 'proposal',
    }),
    pricingRuleResults: ruleResult.pricingRuleResults,
  };
}

export function checkFloorPrice(params: { finalQuote: number; floorPrice: number | null }): boolean {
  return params.floorPrice === null || params.finalQuote >= params.floorPrice;
}

export function createPricingSnapshot(input: {
  sourceType: SourceType;
  sourceId: string;
  priceBook: PriceBook;
  listPriceTotal: number;
  discountAmount: number;
  manualAdjustment: number;
  finalQuote: number;
  approvalStatus: PricingApprovalStatus;
}): PricingSnapshot {
  const now = new Date().toISOString();
  return {
    id: `snapshot-${Math.random().toString(36).slice(2, 10)}`,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    priceBookId: input.priceBook.id,
    priceBookVersion: 'v1',
    listPriceTotal: input.listPriceTotal,
    salesPriceTotal: input.listPriceTotal,
    vipPriceTotal: null,
    discountAmount: input.discountAmount,
    discountPercent: 0,
    manualAdjustment: input.manualAdjustment,
    finalQuote: input.finalQuote,
    currency: input.priceBook.currency,
    tax: 0,
    fees: 0,
    estimatedCpm: 0,
    pricingRuleResults: {},
    approvalStatus: input.approvalStatus,
    approvedBy: null,
    createdAt: now,
  };
}

export interface PricingApprovalInput {
  finalQuote: number;
  floorPrice: number | null;
  discountPercent?: number;
  requestedByUserRole: 'sales' | 'admin';
  bookingSource: 'proposal' | 'campaign_draft' | 'booking';
}

export function requiresPricingApproval(input: PricingApprovalInput): boolean {
  const hasFloorPressure = !checkFloorPrice({
    finalQuote: input.finalQuote,
    floorPrice: input.floorPrice,
  });
  const hasPolicyPressure = (input.discountPercent ?? 0) >= 50 && input.requestedByUserRole !== 'admin';
  const proposalPathSensitive = input.bookingSource === 'proposal' && input.discountPercent !== undefined;
  return hasFloorPressure || (proposalPathSensitive && hasPolicyPressure);
}

export function sanitizePricingForAdvertiser(snapshot: PricingSnapshot): Omit<PricingSnapshot, 'listPriceTotal' | 'salesPriceTotal' | 'vipPriceTotal' | 'approvalStatus' | 'pricingRuleResults'> {
  const {
    id,
    sourceType,
    sourceId,
    priceBookId,
    priceBookVersion,
    discountAmount,
    discountPercent,
    manualAdjustment,
    finalQuote,
    currency,
    tax,
    fees,
    estimatedCpm,
    createdAt,
    approvedBy,
  } = snapshot;

  return {
    id,
    sourceType,
    sourceId,
    priceBookId,
    priceBookVersion,
    finalQuote,
    currency,
    tax,
    fees,
    estimatedCpm,
    createdAt,
    discountAmount,
    discountPercent,
    manualAdjustment,
    approvedBy,
  };
}

export function mapApprovalRequestToCampaignSnapshot(input: { approvalRequestId: string }): PricingApprovalRequest | null {
  return tradingApprovalRequestsById.get(input.approvalRequestId) ?? null;
}

export function listPricingApprovalQueue(): PricingApprovalRequest[] {
  return tradingPricingApprovalRequests.filter(req => req.status === 'required' || req.status === 'pending');
}
