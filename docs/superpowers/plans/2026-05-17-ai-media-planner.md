# AI Media Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a planning-style `AI 建議` view that creates three comparable Media Plan drafts and only applies a chosen draft after the Advertiser clicks `套用到 Media Plan`.

**Architecture:** Keep the feature inside the existing Campaign Planner `AI 建議` tab. Put all planning math, response parsing, fallback generation, and duplicate-skip logic in a pure utility module; put Gemini REST integration in a thin client module; put UI in a focused `AiMediaPlannerView` component that receives existing `allInventory`, `selectedItems`, and `onAdd` props.

**Tech Stack:** Next.js 16 App Router static export, React 19, TypeScript, Vitest node environment, existing TailwindCSS classes, Google Gemini `generateContent` REST endpoint via browser `fetch`.

---

## Reference Docs

- Next.js environment variables: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
- Gemini generateContent REST endpoint and JSON response mode: https://ai.google.dev/api/generate-content

---

## File Map

- Create: `src/lib/aiMediaPlanner.ts`  
  Pure types and helpers: input validation, candidate preparation, AI response parsing, deterministic fallback plan generation, duplicate-safe apply helper.
- Create: `src/lib/googleAiMediaPlanner.ts`  
  Thin Gemini client using `NEXT_PUBLIC_GOOGLE_AI_API_KEY`; falls back to local planner on missing key, empty candidates, invalid JSON, or failed requests.
- Create: `src/components/campaign-planner/AiMediaPlannerView.tsx`  
  Structured AI planning UI replacing the current chat-style `AIView`.
- Modify: `src/components/campaign-planner/InventoryDiscovery.tsx`  
  Remove local `AIView`, `Message`, and streaming helpers; render `AiMediaPlannerView`.
- Create: `src/__tests__/aiMediaPlanner.test.ts`  
  Unit coverage for candidate prep, parser normalization, fallback plans, validation, and duplicate-safe apply helper.
- Create: `src/__tests__/googleAiMediaPlanner.test.ts`  
  Unit coverage for Gemini client success, missing-key fallback, and invalid-JSON fallback.

## Task 1: Pure AI Planner Utilities

**Files:**
- Create: `src/lib/aiMediaPlanner.ts`
- Create: `src/__tests__/aiMediaPlanner.test.ts`

- [ ] **Step 1: Write failing tests for planner utilities**

Create `src/__tests__/aiMediaPlanner.test.ts`:

```ts
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
    const candidates = prepareAiPlannerCandidates(baseInput, mockInventory, 6);
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

    const parsed = parseAiMediaPlanResponse(raw, candidates, baseInput);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/__tests__/aiMediaPlanner.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/aiMediaPlanner'`.

- [ ] **Step 3: Implement planner utility module**

Create `src/lib/aiMediaPlanner.ts`:

```ts
import type { CanonicalFormat } from '@/types/creative';
import type { AudienceTag, InventoryLocation, MediaPlanItem, ScreenType, VenueType } from '@/types/inventory';
import { deriveRequiredFormats } from '@/utils/creativeRequirements';

export type AiPlanId = 'exposure' | 'efficiency' | 'balanced';

export interface AiPlannerInput {
  goalText: string;
  budget: number;
  startDate: string;
  days: number;
}

export interface AiPlannerCandidate {
  id: string;
  name: string;
  city: string;
  district: string;
  venueType: VenueType;
  screenType: ScreenType;
  pricePerDay: number;
  dailyImpressions: number;
  availability: number;
  audienceTags: AudienceTag[];
  dnaScore: number;
}

export interface AiMediaPlanItem {
  inventoryId: string;
  days: number;
  budget: number;
  estimatedImpressions: number;
  reason: string;
}

export interface AiMediaPlanOption {
  id: AiPlanId;
  title: string;
  summary: string;
  items: AiMediaPlanItem[];
  totalBudget: number;
  estimatedImpressions: number;
  averageCpm: number;
  creativeFormats: CanonicalFormat[];
  caveats: string[];
}

export interface AiMediaPlanResponse {
  options: AiMediaPlanOption[];
  source: 'gemini' | 'fallback';
  notice?: string;
}

export type ParseResult =
  | { ok: true; value: AiMediaPlanResponse }
  | { ok: false; error: string };

const PLAN_LABELS: Record<AiPlanId, string> = {
  exposure: '曝光最大化',
  efficiency: '預算效率',
  balanced: '平衡方案',
};

const DEFAULT_CAVEATS = [
  '此為規劃草案，實際可用性仍需以最終 booking confirmation 為準。',
  '預估曝光與 CPM 為 planning estimate，不代表保證投放結果。',
];

export function validateAiPlannerInput(input: AiPlannerInput): string[] {
  const errors: string[] = [];
  if (!input.goalText.trim()) errors.push('請輸入 Campaign 目標');
  if (!Number.isFinite(input.budget) || input.budget <= 0) errors.push('請輸入大於 0 的總預算');
  if (!input.startDate) errors.push('請選擇開始日期');
  if (!Number.isFinite(input.days) || input.days < 1) errors.push('請輸入至少 1 天的投放天數');
  return errors;
}

export function prepareAiPlannerCandidates(
  input: AiPlannerInput,
  inventory: InventoryLocation[],
  limit = 16,
): AiPlannerCandidate[] {
  const query = input.goalText.toLowerCase();
  return inventory
    .map(item => ({
      item,
      score: scoreCandidate(item, query, input),
    }))
    .filter(entry => entry.item.availability > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => ({
      id: item.id,
      name: item.name,
      city: item.city,
      district: item.district,
      venueType: item.venueType,
      screenType: item.screenType,
      pricePerDay: item.pricePerDay,
      dailyImpressions: item.dailyImpressions,
      availability: item.availability,
      audienceTags: item.audienceTags,
      dnaScore: item.dna.baseMatchScore,
    }));
}

export function buildFallbackMediaPlans(
  input: AiPlannerInput,
  candidates: AiPlannerCandidate[],
): AiMediaPlanResponse {
  const exposure = candidates
    .slice()
    .sort((a, b) => b.dailyImpressions - a.dailyImpressions || b.dnaScore - a.dnaScore);
  const efficiency = candidates
    .slice()
    .sort((a, b) => cpm(a) - cpm(b) || a.pricePerDay - b.pricePerDay);
  const balanced = candidates
    .slice()
    .sort((a, b) => balancedScore(b) - balancedScore(a));

  return {
    source: 'fallback',
    notice: '目前使用本機規則產生草案，AI 服務暫時無法使用。',
    options: [
      buildOption('exposure', '優先選擇高日曝光與高能見度版位，讓 Campaign 在短時間內放大觸及。', exposure, input),
      buildOption('efficiency', '優先選擇低 CPM 與成本效率較好的版位，控制預算同時保留基本曝光。', efficiency, input),
      buildOption('balanced', '兼顧受眾匹配、可用性、曝光與預算，適合作為第一版投放草案。', balanced, input),
    ],
  };
}

export function parseAiMediaPlanResponse(
  rawText: string,
  candidates: AiPlannerCandidate[],
  input: AiPlannerInput,
): ParseResult {
  try {
    const parsed = JSON.parse(stripJsonFence(rawText));
    if (!parsed || !Array.isArray(parsed.options) || parsed.options.length !== 3) {
      return { ok: false, error: 'AI response must contain exactly three options.' };
    }
    const options = parsed.options
      .map((option: unknown) => normalizeOption(option, candidates, input))
      .filter((option: AiMediaPlanOption | null): option is AiMediaPlanOption => option !== null);
    const ids = options.map(option => option.id);
    if (!(['exposure', 'efficiency', 'balanced'] as AiPlanId[]).every(id => ids.includes(id))) {
      return { ok: false, error: 'AI response is missing required option IDs.' };
    }
    return { ok: true, value: { source: 'gemini', options } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid AI response.' };
  }
}

export function getUnselectedPlanLocations(
  option: AiMediaPlanOption,
  selectedItems: MediaPlanItem[],
  inventory: InventoryLocation[],
): InventoryLocation[] {
  const selectedIds = new Set(selectedItems.map(item => item.inventoryId));
  return option.items
    .filter(item => !selectedIds.has(item.inventoryId))
    .map(item => inventory.find(venue => venue.id === item.inventoryId))
    .filter((venue): venue is InventoryLocation => Boolean(venue));
}

function scoreCandidate(item: InventoryLocation, query: string, input: AiPlannerInput): number {
  let score = item.dna.baseMatchScore + item.availability * 20;
  if ((query.includes('台北') || query.includes('taipei')) && ['Taipei', '台北市'].includes(item.city)) score += 24;
  if (query.includes('新北') && ['New Taipei', '新北市'].includes(item.city)) score += 24;
  if (query.includes('桃園') && ['Taoyuan', '桃園市'].includes(item.city)) score += 24;
  if (query.includes('通勤') && item.audienceTags.includes('Commuters')) score += 18;
  if (query.includes('上班') && item.audienceTags.includes('Professionals')) score += 18;
  if (query.includes('學生') && item.audienceTags.includes('Students')) score += 18;
  if ((query.includes('購物') || query.includes('消費')) && item.audienceTags.includes('Shoppers')) score += 18;
  if (query.includes('科技') && item.audienceTags.includes('Tech Workers')) score += 18;
  if ((query.includes('旅客') || query.includes('觀光')) && item.audienceTags.includes('Tourists')) score += 18;
  if ((query.includes('捷運') || query.includes('車站')) && ['Station', 'Subway'].includes(item.venueType)) score += 12;
  if (query.includes('機場') && item.venueType === 'Airport') score += 12;
  if (query.includes('看板') && item.screenType === 'Billboard') score += 12;
  if (item.pricePerDay * input.days <= input.budget) score += 10;
  return score;
}

function buildOption(
  id: AiPlanId,
  summary: string,
  rankedCandidates: AiPlannerCandidate[],
  input: AiPlannerInput,
): AiMediaPlanOption {
  const items: AiMediaPlanItem[] = [];
  let remainingBudget = input.budget;
  for (const candidate of rankedCandidates) {
    if (items.length >= 4) break;
    const days = Math.max(1, Math.min(input.days, Math.floor(remainingBudget / candidate.pricePerDay)));
    if (days < 1) continue;
    const budget = candidate.pricePerDay * days;
    items.push({
      inventoryId: candidate.id,
      days,
      budget,
      estimatedImpressions: candidate.dailyImpressions * days,
      reason: buildReason(id, candidate),
    });
    remainingBudget -= budget;
  }
  return finalizeOption({ id, title: PLAN_LABELS[id], summary, items, caveats: DEFAULT_CAVEATS }, rankedCandidates, input);
}

function normalizeOption(raw: unknown, candidates: AiPlannerCandidate[], input: AiPlannerInput): AiMediaPlanOption | null {
  const option = raw as Partial<AiMediaPlanOption>;
  if (!option || !isPlanId(option.id)) return null;
  const candidateMap = new Map(candidates.map(candidate => [candidate.id, candidate]));
  const items = Array.isArray(option.items)
    ? option.items
        .map(item => normalizeItem(item, candidateMap, input))
        .filter((item): item is AiMediaPlanItem => Boolean(item))
    : [];
  return finalizeOption({
    id: option.id,
    title: typeof option.title === 'string' && option.title.trim() ? option.title : PLAN_LABELS[option.id],
    summary: typeof option.summary === 'string' && option.summary.trim() ? option.summary : `${PLAN_LABELS[option.id]}草案`,
    items,
    caveats: Array.isArray(option.caveats) ? option.caveats.filter((c): c is string => typeof c === 'string') : DEFAULT_CAVEATS,
  }, candidates, input);
}

function normalizeItem(raw: unknown, candidateMap: Map<string, AiPlannerCandidate>, input: AiPlannerInput): AiMediaPlanItem | null {
  const item = raw as Partial<AiMediaPlanItem>;
  if (!item || typeof item.inventoryId !== 'string') return null;
  const candidate = candidateMap.get(item.inventoryId);
  if (!candidate) return null;
  const days = Math.max(1, Math.min(input.days, Math.floor(Number(item.days) || input.days)));
  return {
    inventoryId: candidate.id,
    days,
    budget: candidate.pricePerDay * days,
    estimatedImpressions: candidate.dailyImpressions * days,
    reason: typeof item.reason === 'string' && item.reason.trim() ? item.reason : '符合輸入目標與預算條件。',
  };
}

function finalizeOption(
  option: Pick<AiMediaPlanOption, 'id' | 'title' | 'summary' | 'items' | 'caveats'>,
  candidates: AiPlannerCandidate[],
  _input: AiPlannerInput,
): AiMediaPlanOption {
  const candidateInventory = candidates.map(candidateToInventoryShape);
  const planItems = option.items.map(item => ({ inventoryId: item.inventoryId, days: item.days }));
  const totalBudget = option.items.reduce((sum, item) => sum + item.budget, 0);
  const estimatedImpressions = option.items.reduce((sum, item) => sum + item.estimatedImpressions, 0);
  return {
    ...option,
    totalBudget,
    estimatedImpressions,
    averageCpm: estimatedImpressions > 0 ? (totalBudget / estimatedImpressions) * 1000 : 0,
    creativeFormats: deriveRequiredFormats(planItems, candidateInventory),
  };
}

function candidateToInventoryShape(candidate: AiPlannerCandidate): Pick<InventoryLocation, 'id' | 'screenType'> {
  return { id: candidate.id, screenType: candidate.screenType };
}

function cpm(candidate: AiPlannerCandidate): number {
  return candidate.dailyImpressions > 0 ? (candidate.pricePerDay / candidate.dailyImpressions) * 1000 : Number.MAX_SAFE_INTEGER;
}

function balancedScore(candidate: AiPlannerCandidate): number {
  return candidate.dnaScore + candidate.availability * 20 + Math.max(0, 20 - cpm(candidate));
}

function buildReason(id: AiPlanId, candidate: AiPlannerCandidate): string {
  if (id === 'exposure') return `${candidate.name} 提供 ${candidate.dailyImpressions.toLocaleString()} 日曝光，適合放大觸及。`;
  if (id === 'efficiency') return `${candidate.name} 的估算 CPM 約 NT$${cpm(candidate).toFixed(1)}，適合控制成本。`;
  return `${candidate.name} 兼具受眾匹配、可用性與預算效率。`;
}

function isPlanId(value: unknown): value is AiPlanId {
  return value === 'exposure' || value === 'efficiency' || value === 'balanced';
}

function stripJsonFence(rawText: string): string {
  return rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}
```

- [ ] **Step 4: Run utility tests**

Run:

```bash
npx vitest run src/__tests__/aiMediaPlanner.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit utility layer**

```bash
git add src/lib/aiMediaPlanner.ts src/__tests__/aiMediaPlanner.test.ts
git commit -m "feat: add AI media planner utility layer"
```

## Task 2: Gemini Planner Client With Local Fallback

**Files:**
- Create: `src/lib/googleAiMediaPlanner.ts`
- Create: `src/__tests__/googleAiMediaPlanner.test.ts`

- [ ] **Step 1: Write failing tests for Gemini client**

Create `src/__tests__/googleAiMediaPlanner.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/__tests__/googleAiMediaPlanner.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/googleAiMediaPlanner'`.

- [ ] **Step 3: Implement Gemini client**

Create `src/lib/googleAiMediaPlanner.ts`:

```ts
import type { InventoryLocation } from '@/types/inventory';
import {
  buildFallbackMediaPlans,
  parseAiMediaPlanResponse,
  prepareAiPlannerCandidates,
  type AiMediaPlanResponse,
  type AiPlannerCandidate,
  type AiPlannerInput,
} from '@/lib/aiMediaPlanner';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function generateAiMediaPlans(
  input: AiPlannerInput,
  inventory: InventoryLocation[],
): Promise<AiMediaPlanResponse> {
  const candidates = prepareAiPlannerCandidates(input, inventory);
  if (candidates.length === 0) {
    return {
      source: 'fallback',
      notice: '目前沒有符合條件的版位，請放寬預算、天數或目標描述。',
      options: [],
    };
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
  if (!apiKey) return buildFallbackMediaPlans(input, candidates);

  try {
    const first = await requestGeminiPlan(apiKey, input, candidates, false);
    const firstParsed = parseAiMediaPlanResponse(first, candidates, input);
    if (firstParsed.ok) return firstParsed.value;

    const second = await requestGeminiPlan(apiKey, input, candidates, true);
    const secondParsed = parseAiMediaPlanResponse(second, candidates, input);
    if (secondParsed.ok) return secondParsed.value;
  } catch {
    return buildFallbackMediaPlans(input, candidates);
  }

  return buildFallbackMediaPlans(input, candidates);
}

async function requestGeminiPlan(
  apiKey: string,
  input: AiPlannerInput,
  candidates: AiPlannerCandidate[],
  repairMode: boolean,
): Promise<string> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPrompt(input, candidates, repairMode) }],
        },
      ],
      generationConfig: {
        temperature: repairMode ? 0.1 : 0.35,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new Error('Gemini response did not include text.');
  return text;
}

function buildPrompt(
  input: AiPlannerInput,
  candidates: AiPlannerCandidate[],
  repairMode: boolean,
): string {
  return [
    repairMode
      ? 'Return only valid JSON. Do not include markdown fences or commentary.'
      : 'You are a DOOH media planning assistant for Advertisers.',
    'Use only the provided InventoryLocations. Do not invent IDs.',
    'Return exactly three options with IDs exposure, efficiency, balanced.',
    'Each option should include 2 to 5 items when possible.',
    'Total budget must not exceed the requested budget.',
    'Use Traditional Chinese for title, summary, reason, and caveats.',
    '',
    `Campaign goal: ${input.goalText}`,
    `Total budget NTD: ${input.budget}`,
    `Start date: ${input.startDate}`,
    `Campaign days: ${input.days}`,
    '',
    'Required JSON shape:',
    '{"options":[{"id":"exposure|efficiency|balanced","title":"string","summary":"string","items":[{"inventoryId":"string","days":number,"budget":number,"estimatedImpressions":number,"reason":"string"}],"totalBudget":number,"estimatedImpressions":number,"averageCpm":number,"creativeFormats":[],"caveats":["string"]}]}',
    '',
    `Candidate InventoryLocations: ${JSON.stringify(candidates)}`,
  ].join('\n');
}
```

- [ ] **Step 4: Run Gemini client tests**

Run:

```bash
npx vitest run src/__tests__/googleAiMediaPlanner.test.ts src/__tests__/aiMediaPlanner.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Gemini client layer**

```bash
git add src/lib/googleAiMediaPlanner.ts src/__tests__/googleAiMediaPlanner.test.ts
git commit -m "feat: add Gemini media planner client"
```

## Task 3: Structured AI Planner UI

**Files:**
- Create: `src/components/campaign-planner/AiMediaPlannerView.tsx`
- Modify: `src/components/campaign-planner/InventoryDiscovery.tsx`

- [ ] **Step 1: Create structured AI planner component**

Create `src/components/campaign-planner/AiMediaPlannerView.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Calendar, CheckCircle, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { generateAiMediaPlans } from '@/lib/googleAiMediaPlanner';
import {
  getUnselectedPlanLocations,
  validateAiPlannerInput,
  type AiMediaPlanOption,
  type AiMediaPlanResponse,
  type AiPlannerInput,
} from '@/lib/aiMediaPlanner';
import type { InventoryLocation, MediaPlanItem } from '@/types/inventory';

interface Props {
  allInventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onAdd: (item: InventoryLocation) => void;
}

const today = new Date().toISOString().slice(0, 10);

export function AiMediaPlannerView({ allInventory, selectedItems, onAdd }: Props) {
  const [input, setInput] = useState<AiPlannerInput>({
    goalText: '台北通勤族品牌曝光，兼顧預算效率',
    budget: 100000,
    startDate: today,
    days: 14,
  });
  const [result, setResult] = useState<AiMediaPlanResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedOptionId, setAppliedOptionId] = useState<string | null>(null);

  const inventoryById = useMemo(
    () => new Map(allInventory.map(item => [item.id, item])),
    [allInventory],
  );

  async function handleGenerate() {
    const nextErrors = validateAiPlannerInput(input);
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    setIsLoading(true);
    setAppliedOptionId(null);
    try {
      const nextResult = await generateAiMediaPlans(input, allInventory);
      setResult(nextResult);
    } catch {
      setErrors(['AI 規劃暫時無法產生，請稍後再試。']);
    } finally {
      setIsLoading(false);
    }
  }

  function applyOption(option: AiMediaPlanOption) {
    const locations = getUnselectedPlanLocations(option, selectedItems, allInventory);
    locations.forEach(onAdd);
    setAppliedOptionId(option.id);
  }

  return (
    <div className="p-6 space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">AI Media Planner</h2>
            <p className="text-xs text-slate-500">輸入目標後產生三個 Media Plan 草案，確認後再套用。</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 items-end">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Campaign 目標</span>
            <textarea
              value={input.goalText}
              onChange={event => setInput(prev => ({ ...prev, goalText: event.target.value }))}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
              placeholder="例如：台北通勤族，預算 10 萬，兩週曝光"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">總預算 NTD</span>
            <input
              type="number"
              value={input.budget}
              onChange={event => setInput(prev => ({ ...prev, budget: Number(event.target.value) }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">開始日期</span>
            <input
              type="date"
              value={input.startDate}
              onChange={event => setInput(prev => ({ ...prev, startDate: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">天數</span>
            <input
              type="number"
              min={1}
              value={input.days}
              onChange={event => setInput(prev => ({ ...prev, days: Number(event.target.value) }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />
          </label>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-slate-300 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
            產生 AI 規劃
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
            {errors.join('、')}
          </div>
        )}
      </section>

      {isLoading && <SkeletonOptions />}

      {result?.notice && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800">
          {result.notice}
        </div>
      )}

      {result && result.options.length === 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-500">
          目前沒有符合條件的版位，請調整條件後重新產生。
        </div>
      )}

      {result && result.options.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {result.options.map(option => (
            <PlanOptionCard
              key={option.id}
              option={option}
              inventoryById={inventoryById}
              isApplied={appliedOptionId === option.id}
              onApply={() => applyOption(option)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonOptions() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {[0, 1, 2].map(index => (
        <div key={index} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
          <div className="h-3 bg-slate-100 rounded w-full mb-2" />
          <div className="h-3 bg-slate-100 rounded w-4/5 mb-5" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function PlanOptionCard({
  option,
  inventoryById,
  isApplied,
  onApply,
}: {
  option: AiMediaPlanOption;
  inventoryById: Map<string, InventoryLocation>;
  isApplied: boolean;
  onApply: () => void;
}) {
  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{option.title}</h3>
          {isApplied && <CheckCircle className="w-5 h-5 text-emerald-600" />}
        </div>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{option.summary}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Metric label="預算" value={`NT$${option.totalBudget.toLocaleString()}`} />
        <Metric label="曝光" value={option.estimatedImpressions.toLocaleString()} />
        <Metric label="CPM" value={`NT$${option.averageCpm.toFixed(1)}`} />
      </div>

      <div className="space-y-2">
        {option.items.map(item => {
          const venue = inventoryById.get(item.inventoryId);
          return (
            <div key={item.inventoryId} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{venue?.name ?? item.inventoryId}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {venue ? `${venue.district} · ${venue.screenType}` : 'InventoryLocation'}
                  </p>
                </div>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {item.days} 天
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.reason}</p>
            </div>
          );
        })}
      </div>

      {option.creativeFormats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {option.creativeFormats.map(format => (
            <span key={format} className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700">
              {format}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={onApply}
        className="mt-auto rounded-xl bg-slate-900 text-white text-sm font-semibold py-2.5 hover:bg-slate-800"
      >
        {isApplied ? '已套用到 Media Plan' : '套用到 Media Plan'}
      </button>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Modify `InventoryDiscovery.tsx` to render the new component**

In `src/components/campaign-planner/InventoryDiscovery.tsx`, replace imports at the top with:

```tsx
'use client';

import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { ListView } from './ListView';
import { MapWrapper } from './MapWrapper';
import { PlannerTopbar } from './PlannerTopbar';
import { ViewMode } from './ViewToggle';
import { AiMediaPlannerView } from './AiMediaPlannerView';
```

Delete the local `Message` interface, `streamText`, `WELCOME`, and `AIView` function.

Replace the `currentView === 'ai'` branch with:

```tsx
          <AiMediaPlannerView
            allInventory={allInventory}
            selectedItems={selectedItems}
            onAdd={onAdd}
          />
```

- [ ] **Step 3: Run TypeScript/build check**

Run:

```bash
npm run build
```

Expected: PASS. If TypeScript flags unused imports in `InventoryDiscovery.tsx`, remove them and rerun.

- [ ] **Step 4: Commit UI integration**

```bash
git add src/components/campaign-planner/AiMediaPlannerView.tsx src/components/campaign-planner/InventoryDiscovery.tsx
git commit -m "feat: add structured AI media planner view"
```

## Task 4: Verification And Manual Browser QA

**Files:**
- No new files expected.
- Possible fixups only in files touched by Tasks 1-3.

- [ ] **Step 1: Run targeted unit tests**

Run:

```bash
npx vitest run src/__tests__/aiMediaPlanner.test.ts src/__tests__/googleAiMediaPlanner.test.ts src/__tests__/mockAI.test.ts src/__tests__/creativeRequirements.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full build**

Run:

```bash
npm run build
```

Expected: PASS with static routes generated.

- [ ] **Step 3: Start local dev server**

Run:

```bash
npm run dev
```

Expected: Next.js dev server starts and prints a local URL such as `http://localhost:3000`.

- [ ] **Step 4: Manual browser check**

Open the dev server URL and verify:

1. Login as `advertiser@demo.com` / `demo1234` if redirected to `/login`.
2. Navigate to `/campaign-planner`.
3. Click `AI 建議`.
4. Confirm the four inputs are visible: Campaign goal, budget, start date, days.
5. Click `產生 AI 規劃`.
6. Confirm three option cards render: `曝光最大化`, `預算效率`, `平衡方案`.
7. Confirm each option shows budget, impressions, CPM, venues, reasons, and creative format chips when formats exist.
8. Click `套用到 Media Plan` on one option.
9. Confirm selected InventoryLocations appear in the existing Media Plan summary and no duplicate is added when applying the same option again.
10. Adjust the input budget or days and regenerate; confirm draft options update and existing Media Plan selections remain.

- [ ] **Step 5: Final status check**

Run:

```bash
git status --short
```

Expected: Only intended files are modified or the worktree is clean after commits. Existing unrelated user changes may still appear; do not revert them.
