import { describe, it, expect } from 'vitest';
import { checkLaunchReadiness } from '@/lib/services/launchReadinessService';
import type { CampaignReadinessLineItem, LaunchReadinessStatus } from '@/types/trading-models';

function makeLineItem(overrides: Partial<CampaignReadinessLineItem> = {}): CampaignReadinessLineItem {
  return {
    id: 'rl-test',
    campaignId: 'camp-test',
    campaignInventoryItemId: 'li-test',
    bookingConfirmed: true,
    inventoryReserved: true,
    flightValid: true,
    creativeRequirementsGenerated: true,
    requiredCreativesUploaded: true,
    requiredCreativesValid: true,
    requiredCreativesApproved: true,
    playlistAssigned: true,
    policyPassed: true,
    paymentCleared: true,
    canPlay: false,
    lineItemReadyStatus: 'not_ready' as LaunchReadinessStatus,
    ...overrides,
  };
}

describe('launchReadinessService', () => {
  it('missing creative returns blocked_by_creative', () => {
    const result = checkLaunchReadiness({
      campaignId: 'camp-test',
      lineItems: [makeLineItem({ requiredCreativesApproved: false })],
    });
    expect(result.status).toBe('blocked_by_creative');
    expect(result.blockedLineItemIds).toHaveLength(1);
  });

  it('all checks pass returns ready_for_launch', () => {
    const result = checkLaunchReadiness({
      campaignId: 'camp-test',
      lineItems: [makeLineItem()],
    });
    expect(result.status).toBe('ready_for_launch');
    expect(result.readyLineItemIds).toHaveLength(1);
    expect(result.blockers).toHaveLength(0);
  });

  it('mixed ready and blocked returns partially_ready', () => {
    const result = checkLaunchReadiness({
      campaignId: 'camp-test',
      lineItems: [
        makeLineItem({ campaignInventoryItemId: 'li-1' }),
        makeLineItem({ campaignInventoryItemId: 'li-2', requiredCreativesApproved: false }),
      ],
    });
    expect(result.status).toBe('partially_ready');
    expect(result.readyLineItemIds).toHaveLength(1);
    expect(result.blockedLineItemIds).toHaveLength(1);
  });

  it('inventory not reserved returns blocked_by_inventory', () => {
    const result = checkLaunchReadiness({
      campaignId: 'camp-test',
      lineItems: [makeLineItem({ inventoryReserved: false })],
    });
    expect(result.status).toBe('blocked_by_inventory');
  });

  it('payment not cleared returns blocked_by_payment', () => {
    const result = checkLaunchReadiness({
      campaignId: 'camp-test',
      lineItems: [makeLineItem({ paymentCleared: false })],
    });
    expect(result.status).toBe('blocked_by_payment');
  });

  it('playlist not assigned returns blocked_by_playlist', () => {
    const result = checkLaunchReadiness({
      campaignId: 'camp-test',
      lineItems: [makeLineItem({ playlistAssigned: false })],
    });
    expect(result.status).toBe('blocked_by_playlist');
  });

  it('no line items returns not_ready', () => {
    const result = checkLaunchReadiness({
      campaignId: 'camp-test',
      lineItems: [],
    });
    expect(result.status).toBe('not_ready');
  });
});
