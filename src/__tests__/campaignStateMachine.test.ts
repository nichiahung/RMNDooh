import { describe, it, expect } from 'vitest';
import {
  canSubmitCreatives,
  computeLaunchReadiness,
  shouldAutoTransitionToReview,
} from '@/utils/campaignStateMachine';
import type { CampaignDraftStatus, CampaignCreativeRequirement } from '@/types/campaign-draft';

describe('canSubmitCreatives', () => {
  it('allows submit from draft', () => {
    expect(canSubmitCreatives('draft')).toBe(true);
  });

  it('allows resubmit from blocked_by_creative', () => {
    expect(canSubmitCreatives('blocked_by_creative')).toBe(true);
  });

  it('rejects submit from pending_creative_review', () => {
    expect(canSubmitCreatives('pending_creative_review')).toBe(false);
  });

  it('rejects submit from ready_to_book', () => {
    expect(canSubmitCreatives('ready_to_book')).toBe(false);
  });

  it('rejects submit from cancelled', () => {
    expect(canSubmitCreatives('cancelled')).toBe(false);
  });
});

describe('computeLaunchReadiness', () => {
  const approved = (id: string): CampaignCreativeRequirement => ({
    id,
    campaignId: 'c1',
    canonicalFormat: 'landscape_16_9',
    status: 'approved',
    mediaAssetId: 'a1',
    rejectionReason: null,
  });

  const pending = (id: string): CampaignCreativeRequirement => ({
    ...approved(id),
    status: 'pending_upload',
    mediaAssetId: null,
  });

  it('returns ready when inventory exists and all creatives approved', () => {
    const result = computeLaunchReadiness(3, [approved('r1'), approved('r2')]);
    expect(result.ready).toBe(true);
    expect(result.checks.hasInventory).toBe(true);
    expect(result.checks.allCreativesApproved).toBe(true);
  });

  it('returns not ready when no inventory', () => {
    const result = computeLaunchReadiness(0, [approved('r1')]);
    expect(result.ready).toBe(false);
    expect(result.checks.hasInventory).toBe(false);
  });

  it('returns not ready when some creatives not approved', () => {
    const result = computeLaunchReadiness(2, [approved('r1'), pending('r2')]);
    expect(result.ready).toBe(false);
    expect(result.checks.allCreativesApproved).toBe(false);
  });

  it('returns not ready when no requirements exist', () => {
    const result = computeLaunchReadiness(2, []);
    expect(result.ready).toBe(false);
    expect(result.checks.allCreativesApproved).toBe(false);
  });
});

describe('shouldAutoTransitionToReview', () => {
  const makeReq = (status: CampaignCreativeRequirement['status']): CampaignCreativeRequirement => ({
    id: 'r1',
    campaignId: 'c1',
    canonicalFormat: 'landscape_16_9',
    status,
    mediaAssetId: status !== 'pending_upload' ? 'a1' : null,
    rejectionReason: null,
  });

  it('returns true when campaign is blocked and all requirements are uploaded', () => {
    const reqs = [makeReq('uploaded'), makeReq('uploaded')];
    expect(shouldAutoTransitionToReview('blocked_by_creative', reqs)).toBe(true);
  });

  it('returns false when campaign is not blocked', () => {
    const reqs = [makeReq('uploaded')];
    expect(shouldAutoTransitionToReview('pending_creative_review', reqs)).toBe(false);
  });

  it('returns false when some requirements still rejected', () => {
    const reqs = [makeReq('uploaded'), makeReq('rejected')];
    expect(shouldAutoTransitionToReview('blocked_by_creative', reqs)).toBe(false);
  });

  it('returns false when some requirements still pending_upload', () => {
    const reqs = [makeReq('uploaded'), makeReq('pending_upload')];
    expect(shouldAutoTransitionToReview('blocked_by_creative', reqs)).toBe(false);
  });
});
