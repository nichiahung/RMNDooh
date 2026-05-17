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

  it('uses local fallback even when a key is configured while API mode is disabled', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());

    const result = await generateAiMediaPlans(input, mockInventory);
    expect(result.source).toBe('fallback');
    expect(result.options).toHaveLength(3);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not call Gemini repair flow while API mode is disabled', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());

    const result = await generateAiMediaPlans(input, mockInventory);
    expect(result.source).toBe('fallback');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not call Gemini when API mode is disabled even if the request would fail', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('quota exceeded', { status: 429 })));

    const result = await generateAiMediaPlans(input, mockInventory);
    expect(result.source).toBe('fallback');
    expect(result.notice).toContain('本機規則');
    expect(fetch).not.toHaveBeenCalled();
  });
});
