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
const USE_GOOGLE_AI_API = false;

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

  if (!USE_GOOGLE_AI_API) return buildFallbackMediaPlans(input, candidates);

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
