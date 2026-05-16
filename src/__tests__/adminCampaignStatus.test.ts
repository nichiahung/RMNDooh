import { describe, expect, it } from 'vitest';
import {
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
