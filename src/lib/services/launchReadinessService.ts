/**
 * Launch Readiness Service
 *
 * Derives campaign-level readiness from line-item checks.
 * Launch readiness is DERIVED, not manually set.
 */

import type {
  CampaignReadinessLineItem,
  CampaignReadinessResult,
  CampaignReadinessBlockingReason,
  LaunchReadinessStatus,
} from '@/types/trading-models';

// ─── Per-line-item readiness ─────────────────────────────────

function deriveLineItemStatus(item: CampaignReadinessLineItem): LaunchReadinessStatus {
  if (!item.bookingConfirmed) return 'not_ready';
  if (!item.inventoryReserved) return 'blocked_by_inventory';
  if (!item.flightValid) return 'blocked_by_schedule';
  if (!item.creativeRequirementsGenerated) return 'blocked_by_creative';
  if (!item.requiredCreativesUploaded) return 'blocked_by_creative';
  if (!item.requiredCreativesValid) return 'blocked_by_creative';
  if (!item.requiredCreativesApproved) return 'blocked_by_creative';
  if (!item.playlistAssigned) return 'blocked_by_playlist';
  if (!item.policyPassed) return 'blocked_by_policy';
  if (!item.paymentCleared) return 'blocked_by_payment';
  return 'ready_for_launch';
}

// ─── Campaign-level aggregation ──────────────────────────────

export function checkLaunchReadiness(input: {
  campaignId: string;
  lineItems: CampaignReadinessLineItem[];
  bookingStatus?: LaunchReadinessStatus | string;
}): CampaignReadinessResult {
  const { campaignId, lineItems } = input;

  if (lineItems.length === 0) {
    return {
      campaignId,
      status: 'not_ready',
      readyLineItemIds: [],
      blockedLineItemIds: [],
      blockers: [],
    };
  }

  const readyIds: string[] = [];
  const blockedIds: string[] = [];
  const blockerSet = new Set<string>();

  for (const item of lineItems) {
    const status = deriveLineItemStatus(item);
    // Mutate the line item status for callers that inspect it
    item.lineItemReadyStatus = status;
    item.canPlay = status === 'ready_for_launch';

    if (status === 'ready_for_launch' || status === 'ready_for_scheduling') {
      readyIds.push(item.campaignInventoryItemId);
    } else {
      blockedIds.push(item.campaignInventoryItemId);
      blockerSet.add(status);
    }
  }

  let campaignStatus: LaunchReadinessStatus;
  if (blockedIds.length === 0) {
    campaignStatus = 'ready_for_launch';
  } else if (readyIds.length > 0) {
    campaignStatus = 'partially_ready';
  } else {
    // All blocked — pick the most common blocker as campaign status
    campaignStatus = (Array.from(blockerSet)[0] as LaunchReadinessStatus) ?? 'not_ready';
  }

  const blockers: CampaignReadinessBlockingReason[] = Array.from(blockerSet).map(code => ({
    code,
    message: blockerMessage(code),
  }));

  return { campaignId, status: campaignStatus, readyLineItemIds: readyIds, blockedLineItemIds: blockedIds, blockers };
}

function blockerMessage(code: string): string {
  const map: Record<string, string> = {
    blocked_by_creative: 'Some line items missing approved creatives',
    blocked_by_inventory: 'Inventory conflict or not reserved',
    blocked_by_payment: 'Payment / credit terms not cleared',
    blocked_by_policy: 'Policy check failed',
    blocked_by_playlist: 'Playlist / loop not assigned',
    blocked_by_schedule: 'Flight / schedule invalid',
    not_ready: 'Booking not confirmed',
  };
  return map[code] ?? `Blocked: ${code}`;
}

// ─── Blocking reasons (simple query) ─────────────────────────

const campaignBlockers = new Map<string, string[]>();

export function getBlockingReasons(campaignId: string): string[] {
  return campaignBlockers.get(campaignId) ?? [];
}

export function setBlockingReasons(campaignId: string, reasons: string[]): void {
  campaignBlockers.set(campaignId, reasons);
}
