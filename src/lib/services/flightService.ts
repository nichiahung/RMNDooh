/**
 * Flight Service
 *
 * Handles inclusive-date arithmetic, campaign ↔ line-item flight comparison,
 * date-match status derivation, creative deadline calculation, and mixed-flight
 * summarisation.
 *
 * DOOH convention: flight dates are inclusive.
 * Example: 2026-05-24 to 2026-05-31 = 8 days.
 */

import type {
  CampaignFlight,
  CampaignInventoryItem,
  DateMatchStatus,
} from '@/types/trading-models';

const DAY_MS = 86_400_000;

// ─── Helpers ──────────────────────────────────────────────────

function toMs(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = Date.parse(dateStr);
  return Number.isNaN(ms) ? null : ms;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Inclusive day count between two YYYY-MM-DD strings.
 * Returns 0 when either date is null/undefined.
 */
export function calculateInclusiveDays(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  _timezone?: string | null,
): number {
  const s = toMs(startDate);
  const e = toMs(endDate);
  if (s === null || e === null) return 0;
  if (e < s) return 0;
  return Math.floor((e - s) / DAY_MS) + 1;
}

/**
 * Compare a campaign's requested flight to a single line-item flight and
 * return overlap metrics.
 */
export function compareCampaignFlightToLineItem(
  campaignStart: string | null,
  campaignEnd: string | null,
  lineStart: string | null,
  lineEnd: string | null,
): { status: DateMatchStatus; overlapDays: number; campaignDays: number; lineItemDays: number } {
  const cStart = toMs(campaignStart);
  const cEnd = toMs(campaignEnd);
  const lStart = toMs(lineStart);
  const lEnd = toMs(lineEnd);

  const campaignDays = cStart !== null && cEnd !== null ? Math.floor((cEnd - cStart) / DAY_MS) + 1 : 0;
  const lineItemDays = lStart !== null && lEnd !== null ? Math.floor((lEnd - lStart) / DAY_MS) + 1 : 0;

  if (campaignDays === 0 || lineItemDays === 0) {
    return { status: 'no_match', overlapDays: 0, campaignDays, lineItemDays };
  }

  const overlapStart = Math.max(cStart!, lStart!);
  const overlapEnd = Math.min(cEnd!, lEnd!);

  if (overlapEnd < overlapStart) {
    return { status: 'no_match', overlapDays: 0, campaignDays, lineItemDays };
  }

  const overlapDays = Math.floor((overlapEnd - overlapStart) / DAY_MS) + 1;

  const status = calculateDateMatchStatus(campaignStart, campaignEnd, lineStart, lineEnd);

  return { status, overlapDays, campaignDays, lineItemDays };
}

/**
 * Derive DateMatchStatus from campaign ↔ line-item date ranges.
 */
export function calculateDateMatchStatus(
  campaignStart: string | null | undefined,
  campaignEnd: string | null | undefined,
  lineStart: string | null | undefined,
  lineEnd: string | null | undefined,
): DateMatchStatus {
  const cStart = toMs(campaignStart);
  const cEnd = toMs(campaignEnd);
  const lStart = toMs(lineStart);
  const lEnd = toMs(lineEnd);

  if (cStart === null || cEnd === null || lStart === null || lEnd === null) {
    return 'no_match';
  }

  // Full match: line item covers the entire campaign range
  if (lStart <= cStart && lEnd >= cEnd) {
    return 'full_match';
  }

  // No overlap at all
  if (lEnd < cStart || lStart > cEnd) {
    return 'no_match';
  }

  // Partial overlap
  return 'partial_match';
}

/**
 * Calculate creative due date from the earliest playback date minus an SLA buffer.
 * Default SLA = 96 hours (4 business days).
 */
export function calculateCreativeDueAt(
  earliestPlaybackAt: string | null | undefined,
  reviewSlaHours: number = 96,
): string | null {
  const ms = toMs(earliestPlaybackAt);
  if (ms === null) return null;
  return new Date(ms - reviewSlaHours * 3_600_000).toISOString();
}

/**
 * Re-derive flight fields for every line item given the campaign-level flight.
 * Mutates nothing — returns a new array.
 */
export function recalcCampaignLineItemFlights(
  campaignFlight: CampaignFlight,
  lineItems: CampaignInventoryItem[],
): CampaignInventoryItem[] {
  return lineItems.map(item => {
    const lineStart = item.lineItemStartDate ?? campaignFlight.requestedStartDate;
    const lineEnd = item.lineItemEndDate ?? campaignFlight.requestedEndDate;
    const activeDays = calculateInclusiveDays(lineStart, lineEnd);
    const dateMatchStatus = calculateDateMatchStatus(
      campaignFlight.requestedStartDate,
      campaignFlight.requestedEndDate,
      lineStart,
      lineEnd,
    );
    const earliestPlaybackAt = item.earliestPlaybackAt ?? lineStart;
    const creativeDueAt = calculateCreativeDueAt(earliestPlaybackAt);

    // Re-derive price and impressions proportionally when activeDays changes
    const oldDays = item.activeDays ?? 1;
    const dailyPrice = oldDays > 0 ? item.priceForActiveDays / oldDays : 0;
    const dailyImpressions = oldDays > 0 ? item.estimatedImpressionsForActiveDays / oldDays : 0;

    return {
      ...item,
      requestedStartDate: campaignFlight.requestedStartDate,
      requestedEndDate: campaignFlight.requestedEndDate,
      lineItemStartDate: lineStart,
      lineItemEndDate: lineEnd,
      activeDays,
      dateMatchStatus,
      priceForActiveDays: dailyPrice * activeDays,
      estimatedImpressionsForActiveDays: dailyImpressions * activeDays,
      creativeDueAt,
      earliestPlaybackAt,
    };
  });
}

export interface MixedFlightSummary {
  fullMatch: number;
  partialMatch: number;
  noMatch: number;
  customOverride: number;
  total: number;
}

/**
 * Summarise how many line items are full_match, partial_match, no_match,
 * or custom_override.
 */
export function summarizeMixedFlight(
  lineItems: Array<Pick<CampaignInventoryItem, 'dateMatchStatus'>>,
): MixedFlightSummary {
  const result: MixedFlightSummary = {
    fullMatch: 0,
    partialMatch: 0,
    noMatch: 0,
    customOverride: 0,
    total: lineItems.length,
  };

  for (const item of lineItems) {
    switch (item.dateMatchStatus) {
      case 'full_match':
        result.fullMatch++;
        break;
      case 'partial_match':
        result.partialMatch++;
        break;
      case 'no_match':
        result.noMatch++;
        break;
      case 'custom_override':
        result.customOverride++;
        break;
    }
  }

  return result;
}
