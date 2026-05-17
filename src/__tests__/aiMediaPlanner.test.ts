import { describe, expect, it } from 'vitest';
import { mockInventory } from '@/lib/mockData';
import {
  buildFallbackMediaPlans,
  getUnselectedPlanLocations,
  parseAiMediaPlanResponse,
  prepareAiPlannerCandidates,
  validateAiPlannerInput,
} from '@/lib/aiMediaPlanner';
import type { AiPlannerInput } from '@/lib/aiMediaPlanner';
import type { MediaPlanItem } from '@/types/inventory';

const baseInput: AiPlannerInput = {
  goalText: '台北通勤族，兩週曝光',
  budget: 100000,
  startDate: '2026-06-01',
  days: 14,
};

describe('validateAiPlannerInput', () => {
  it('requires goal text, positive budget, start date, and positive days', () => {
    expect(validateAiPlannerInput(baseInput)).toEqual([]);
    expect(validateAiPlannerInput({ ...baseInput, goalText: '' })).toContain('請輸入 Campaign 目標');
    expect(validateAiPlannerInput({ ...baseInput, budget: 0 })).toContain('請輸入大於 0 的總預算');
    expect(validateAiPlannerInput({ ...baseInput, startDate: '' })).toContain('請選擇開始日期');
    expect(validateAiPlannerInput({ ...baseInput, days: 0 })).toContain('請輸入至少 1 天的投放天數');
  });
});

describe('prepareAiPlannerCandidates', () => {
  it('caps candidates and keeps only compact fields', () => {
    const candidates = prepareAiPlannerCandidates(baseInput, mockInventory, 5);
    expect(candidates).toHaveLength(5);
    expect(candidates[0]).toHaveProperty('id');
    expect(candidates[0]).toHaveProperty('pricePerDay');
    expect(candidates[0]).toHaveProperty('dnaScore');
    expect('address' in candidates[0]).toBe(false);
  });

  it('prefers matching city and audience from goal text', () => {
    const candidates = prepareAiPlannerCandidates(baseInput, mockInventory, 8);
    expect(candidates.some(c => ['Taipei', '台北市'].includes(c.city))).toBe(true);
    expect(candidates.some(c => c.audienceTags.includes('Commuters'))).toBe(true);
  });
});

describe('parseAiMediaPlanResponse', () => {
  it('accepts valid JSON, drops unknown inventory IDs, and recomputes totals locally', () => {
    const generousInput = { ...baseInput, budget: 999999 };
    const candidates = prepareAiPlannerCandidates(generousInput, mockInventory, 6);
    const first = candidates[0];
    const raw = JSON.stringify({
      options: [
        {
          id: 'exposure',
          title: '曝光最大化',
          summary: '集中高曝光版位。',
          items: [
            { inventoryId: first.id, days: 99, budget: 999999, estimatedImpressions: 1, reason: '高人流' },
            { inventoryId: 'unknown-id', days: 7, budget: 1000, estimatedImpressions: 1000, reason: '不存在' },
          ],
          totalBudget: 999999,
          estimatedImpressions: 1,
          averageCpm: 1,
          creativeFormats: [],
          caveats: ['AI numbers are draft only'],
        },
        { id: 'efficiency', title: '預算效率', summary: '降低 CPM。', items: [], totalBudget: 0, estimatedImpressions: 0, averageCpm: 0, creativeFormats: [], caveats: [] },
        { id: 'balanced', title: '平衡方案', summary: '兼顧曝光與成本。', items: [], totalBudget: 0, estimatedImpressions: 0, averageCpm: 0, creativeFormats: [], caveats: [] },
      ],
    });

    const parsed = parseAiMediaPlanResponse(raw, candidates, generousInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.options).toHaveLength(3);
    expect(parsed.value.options[0].items).toHaveLength(1);
    expect(parsed.value.options[0].items[0].days).toBe(14);
    expect(parsed.value.options[0].totalBudget).toBe(first.pricePerDay * 14);
    expect(parsed.value.options[0].estimatedImpressions).toBe(first.dailyImpressions * 14);
  });

  it('rejects malformed JSON', () => {
    const candidates = prepareAiPlannerCandidates(baseInput, mockInventory, 6);
    expect(parseAiMediaPlanResponse('not-json', candidates, baseInput).ok).toBe(false);
  });

  it('reduces or drops AI item days so parsed option stays within budget', () => {
    const constrainedInput = { ...baseInput, budget: 50000, days: 14 };
    const candidates = prepareAiPlannerCandidates(constrainedInput, mockInventory, 6);
    const first = candidates[0];
    const raw = JSON.stringify({
      options: [
        {
          id: 'exposure',
          title: '曝光最大化',
          summary: '集中高曝光版位。',
          items: [{ inventoryId: first.id, days: 14, budget: 999999, estimatedImpressions: 1, reason: '高人流' }],
          totalBudget: 999999,
          estimatedImpressions: 1,
          averageCpm: 1,
          creativeFormats: [],
          caveats: [],
        },
        { id: 'efficiency', title: '預算效率', summary: '降低 CPM。', items: [{ inventoryId: first.id, days: 14, budget: 999999, estimatedImpressions: 1, reason: '低 CPM' }], totalBudget: 999999, estimatedImpressions: 1, averageCpm: 1, creativeFormats: [], caveats: [] },
        { id: 'balanced', title: '平衡方案', summary: '兼顧曝光與成本。', items: [{ inventoryId: first.id, days: 14, budget: 999999, estimatedImpressions: 1, reason: '平衡' }], totalBudget: 999999, estimatedImpressions: 1, averageCpm: 1, creativeFormats: [], caveats: [] },
      ],
    });

    const parsed = parseAiMediaPlanResponse(raw, candidates, constrainedInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);
    parsed.value.options.forEach(option => {
      expect(option.totalBudget).toBeLessThanOrEqual(constrainedInput.budget);
    });
  });
});

describe('buildFallbackMediaPlans', () => {
  it('returns exposure, efficiency, and balanced options with valid candidate IDs', () => {
    const candidates = prepareAiPlannerCandidates(baseInput, mockInventory, 12);
    const response = buildFallbackMediaPlans(baseInput, candidates);
    expect(response.options.map(o => o.id)).toEqual(['exposure', 'efficiency', 'balanced']);
    response.options.forEach(option => {
      expect(option.items.length).toBeGreaterThan(0);
      expect(option.totalBudget).toBeLessThanOrEqual(baseInput.budget);
      option.items.forEach(item => {
        expect(candidates.some(c => c.id === item.inventoryId)).toBe(true);
        expect(item.days).toBeLessThanOrEqual(baseInput.days);
      });
    });
  });
});

describe('getUnselectedPlanLocations', () => {
  it('skips locations already selected in the Media Plan', () => {
    const candidates = prepareAiPlannerCandidates(baseInput, mockInventory, 4);
    const response = buildFallbackMediaPlans(baseInput, candidates);
    const firstId = response.options[0].items[0].inventoryId;
    const selectedItems: MediaPlanItem[] = [{ inventoryId: firstId, days: 7 }];
    const result = getUnselectedPlanLocations(response.options[0], selectedItems, mockInventory);
    expect(result.some(v => v.id === firstId)).toBe(false);
  });
});
