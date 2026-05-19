import { describe, it, expect } from 'vitest';
import { resolveAdvertiserName } from '@/utils/adminResolvers';

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
