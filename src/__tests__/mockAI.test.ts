import { describe, it, expect } from 'vitest';
import { queryInventory, buildResponseText } from '@/lib/mockAI';
import { mockInventory } from '@/lib/mockData';

describe('queryInventory', () => {
  it('filters by city 台北', () => {
    const results = queryInventory('台北', mockInventory);
    results.forEach(r => expect(['台北市', 'Taipei']).toContain(r.city));
  });

  it('filters by city 新北', () => {
    const results = queryInventory('新北', mockInventory);
    results.forEach(r => expect(['新北市', 'New Taipei']).toContain(r.city));
  });

  it('filters by city 桃園', () => {
    const results = queryInventory('桃園', mockInventory);
    results.forEach(r => expect(['桃園市', 'Taoyuan']).toContain(r.city));
  });

  it('filters by audience 通勤', () => {
    const results = queryInventory('通勤', mockInventory);
    results.forEach(r => expect(r.audienceTags).toContain('Commuters'));
  });

  it('filters by budget number', () => {
    const results = queryInventory('預算3000以下', mockInventory);
    results.forEach(r => expect(r.pricePerDay).toBeLessThanOrEqual(3000));
  });

  it('returns top 3 max', () => {
    const results = queryInventory('台北通勤族', mockInventory);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('returns top 3 by baseMatchScore when no filters match anything', () => {
    const results = queryInventory('zzz_nomatch', mockInventory);
    expect(results.length).toBe(3);
    expect(results[0].dna.baseMatchScore).toBeGreaterThanOrEqual(results[1].dna.baseMatchScore);
    expect(results[1].dna.baseMatchScore).toBeGreaterThanOrEqual(results[2].dna.baseMatchScore);
  });

  it('combines city + audience filters', () => {
    const results = queryInventory('台北上班族', mockInventory);
    results.forEach(r => {
      expect(['台北市', 'Taipei']).toContain(r.city);
      expect(r.audienceTags).toContain('Professionals');
    });
  });
});

describe('buildResponseText', () => {
  it('returns 找不到 message when venues is empty', () => {
    const text = buildResponseText([], '台北');
    expect(text).toContain('找不到');
  });

  it('includes venue name and price for each result', () => {
    const venues = mockInventory.slice(0, 2);
    const text = buildResponseText(venues, '台北');
    expect(text).toContain(venues[0].name);
    expect(text).toContain(venues[1].name);
    expect(text).toContain('根據你的目標');
  });
});
