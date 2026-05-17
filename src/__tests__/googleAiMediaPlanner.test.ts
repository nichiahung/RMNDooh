import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockInventory } from '@/lib/mockData';
import { generateAiMediaPlans } from '@/lib/googleAiMediaPlanner';
import type { AiPlannerInput } from '@/lib/aiMediaPlanner';

const input: AiPlannerInput = {
  goalText: '台北通勤族品牌曝光',
  budget: 120000,
  startDate: '2026-06-01',
  days: 14,
};

const originalKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY = originalKey;
});

describe('generateAiMediaPlans', () => {
  it('uses local fallback when key is missing', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY = '';
    const result = await generateAiMediaPlans(input, mockInventory);
    expect(result.source).toBe('fallback');
    expect(result.notice).toContain('本機規則');
    expect(result.options).toHaveLength(3);
  });

  it('parses a valid Gemini JSON text response', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY = 'test-key';
    const first = mockInventory[0];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              options: [
                { id: 'exposure', title: '曝光最大化', summary: '高曝光', items: [{ inventoryId: first.id, days: 7, budget: 1, estimatedImpressions: 1, reason: '高曝光' }], totalBudget: 1, estimatedImpressions: 1, averageCpm: 1, creativeFormats: [], caveats: [] },
                { id: 'efficiency', title: '預算效率', summary: '低 CPM', items: [{ inventoryId: first.id, days: 7, budget: 1, estimatedImpressions: 1, reason: '低 CPM' }], totalBudget: 1, estimatedImpressions: 1, averageCpm: 1, creativeFormats: [], caveats: [] },
                { id: 'balanced', title: '平衡方案', summary: '平衡', items: [{ inventoryId: first.id, days: 7, budget: 1, estimatedImpressions: 1, reason: '平衡' }], totalBudget: 1, estimatedImpressions: 1, averageCpm: 1, creativeFormats: [], caveats: [] },
              ],
            }),
          }],
        },
      }],
    }), { status: 200 })));

    const result = await generateAiMediaPlans(input, mockInventory);
    expect(result.source).toBe('gemini');
    expect(result.options).toHaveLength(3);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('falls back when Gemini returns invalid JSON twice', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'not-json' }] } }],
    }), { status: 200 })));

    const result = await generateAiMediaPlans(input, mockInventory);
    expect(result.source).toBe('fallback');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('falls back when Gemini request fails', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('quota exceeded', { status: 429 })));

    const result = await generateAiMediaPlans(input, mockInventory);
    expect(result.source).toBe('fallback');
    expect(result.notice).toContain('本機規則');
  });
});
