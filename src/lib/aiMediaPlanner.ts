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
    const affordableDays = Math.floor(remainingBudget / candidate.pricePerDay);
    if (affordableDays < 1) continue;
    const days = Math.min(input.days, affordableDays);
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
  return finalizeOption({ id, title: PLAN_LABELS[id], summary, items, caveats: DEFAULT_CAVEATS }, rankedCandidates);
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
  }, candidates);
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
