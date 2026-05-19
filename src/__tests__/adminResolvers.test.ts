import { describe, it, expect } from 'vitest';
import { resolveAdvertiserName, resolveCampaignName } from '@/utils/adminResolvers';
import type { CampaignDraftProfile } from '@/types/trading-models';

describe('resolveAdvertiserName', () => {
  it('returns known advertiser name for adv-01', () => {
    expect(resolveAdvertiserName('adv-01')).toBe('TechNova Solutions');
  });

  it('returns known advertiser name for adv-02', () => {
    expect(resolveAdvertiserName('adv-02')).toBe('Luxe Retail Group');
  });

  it('returns truncated ID for unknown advertiser', () => {
    expect(resolveAdvertiserName('xxxxxxxx-yyyy-zzzz-0000-111111111111')).toBe('xxxxxxxx...');
  });

  it('returns known name for adv-default', () => {
    expect(resolveAdvertiserName('adv-default')).toBe('Demo Advertiser');
  });
});

describe('resolveCampaignName', () => {
  const drafts: Pick<CampaignDraftProfile, 'id' | 'name'>[] = [
    { id: 'draft-001', name: 'Spring Campaign' },
    { id: 'draft-002', name: 'Summer Blast' },
  ];

  it('returns campaign name when found', () => {
    expect(resolveCampaignName('draft-001', drafts)).toBe('Spring Campaign');
  });

  it('returns truncated ID when not found', () => {
    expect(resolveCampaignName('unknown-id-abc', drafts)).toBe('unknown-...');
  });
});
