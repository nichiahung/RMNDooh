import { describe, expect, it } from 'vitest';
import { getSortLabelCompact } from '@/utils/sortLabel';

describe('getSortLabelCompact', () => {
  it('maps impressions_desc to 觸及人次↓', () => {
    expect(getSortLabelCompact('impressions_desc')).toBe('觸及人次↓');
  });
  it('maps impressions_asc to 觸及人次↑', () => {
    expect(getSortLabelCompact('impressions_asc')).toBe('觸及人次↑');
  });
  it('maps price_desc to 日費用↓', () => {
    expect(getSortLabelCompact('price_desc')).toBe('日費用↓');
  });
  it('maps price_asc to 日費用↑', () => {
    expect(getSortLabelCompact('price_asc')).toBe('日費用↑');
  });
  it('maps cpm_desc to CPM↓', () => {
    expect(getSortLabelCompact('cpm_desc')).toBe('CPM↓');
  });
  it('maps cpm_asc to CPM↑', () => {
    expect(getSortLabelCompact('cpm_asc')).toBe('CPM↑');
  });
  it('returns the raw value for unknown sortOption', () => {
    expect(getSortLabelCompact('unknown')).toBe('unknown');
  });
});
