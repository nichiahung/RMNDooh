import { describe, expect, it } from 'vitest';
import {
  deriveCampaignFinancials,
  deriveCampaignCreativeStatus,
  deriveLaunchReadinessStatus,
} from '@/utils/adminCampaignStatus';

describe('deriveCampaignCreativeStatus', () => {
  it('uses approved when any creative asset is approved', () => {
    expect(deriveCampaignCreativeStatus(['approved'], 'pending_review')).toBe('approved');
  });

  it('uses pending_review while any creative asset is still pending', () => {
    expect(deriveCampaignCreativeStatus(['rejected', 'pending_review'], 'not_submitted')).toBe('pending_review');
  });

  it('uses rejected when every creative asset is rejected', () => {
    expect(deriveCampaignCreativeStatus(['rejected', 'rejected'], 'pending_review')).toBe('rejected');
  });

  it('preserves stored status when there are no creative assets', () => {
    expect(deriveCampaignCreativeStatus([], 'not_submitted')).toBe('not_submitted');
  });
});

describe('deriveLaunchReadinessStatus', () => {
  it('marks pending confirmed campaigns as ready for confirmation when creative is approved', () => {
    expect(deriveLaunchReadinessStatus('pending_confirmation', 'approved', 'not_ready')).toBe('ready_for_confirmation');
  });

  it('marks confirmed campaigns as ready for scheduling when creative is approved', () => {
    expect(deriveLaunchReadinessStatus('confirmed', 'approved', 'not_ready')).toBe('ready_for_scheduling');
  });

  it('blocks launch readiness when creative is rejected', () => {
    expect(deriveLaunchReadinessStatus('confirmed', 'rejected', 'ready_for_scheduling')).toBe('blocked_by_creative');
  });
});

describe('deriveCampaignFinancials', () => {
  const items = [
    { days: 7, price_per_day: 9000, daily_impressions: 700000 },
    { days: 7, price_per_day: 15000, daily_impressions: 850000 },
  ];

  it('falls back to inventory item snapshots when campaign totals are zero', () => {
    expect(deriveCampaignFinancials(items, 0, 0)).toEqual({
      estimatedBudget: 168000,
      estimatedImpressions: 10850000,
    });
  });

  it('preserves non-zero campaign totals for legacy or manually adjusted rows', () => {
    expect(deriveCampaignFinancials(items, 300000, 3000000)).toEqual({
      estimatedBudget: 300000,
      estimatedImpressions: 3000000,
    });
  });
});
