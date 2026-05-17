# AI Media Planner Design Spec

**Date:** 2026-05-17  
**Status:** Approved for implementation planning

## Goal

Upgrade the existing Campaign Planner `AI 建議` view from rule-based venue recommendations into a planning assistant that generates complete Media Plan drafts. The AI should help an Advertiser turn a campaign goal into comparable plan options, then let the Advertiser choose one draft and explicitly apply it to the current Media Plan.

The first version must stay inside the current Campaign Planner flow. It should not auto-book inventory, create Campaigns by itself, or replace the existing Media Plan editing surface.

## Current Context

The app already has:

- `src/components/campaign-planner/InventoryDiscovery.tsx` with an `AIView` under `currentView === 'ai'`.
- `src/lib/mockAI.ts` for deterministic query parsing and top-3 InventoryLocation recommendations.
- Campaign Planner state that can add selected InventoryLocations into the Media Plan through the existing `onAdd(item)` path.
- A browser-visible Google AI key configured as `NEXT_PUBLIC_GOOGLE_AI_API_KEY` for future Gemini-backed client-side calls.

This design keeps the AI entry point in the existing `AI 建議` view and replaces the simple chat recommendation behavior with a structured plan-generation workflow.

## User Flow

1. Advertiser opens `/campaign-planner`.
2. Advertiser switches to `AI 建議`.
3. Advertiser enters planning inputs:
   - Campaign goal text
   - Total budget
   - Start date
   - Number of days
4. User clicks `產生 AI 規劃`.
5. The app sends the structured planning context plus candidate InventoryLocations to the AI planner.
6. AI returns three Media Plan draft options:
   - `曝光最大化`
   - `預算效率`
   - `平衡方案`
7. User reviews the options side by side.
8. User can adjust the same four input fields and regenerate.
9. User selects one option and clicks `套用到 Media Plan`.
10. The app adds the option's InventoryLocations to the current Media Plan using existing add/select behavior. The user can still edit the Media Plan afterward.

## Input Model

The first version uses a hybrid input model:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `goalText` | text | yes | Natural-language business goal, audience, geography, or KPI preference. |
| `budget` | number | yes | Total planning budget in NTD. Must be greater than 0. |
| `startDate` | date | yes | Used for draft period display and future availability checks. |
| `days` | number | yes | Campaign duration. Must be at least 1. |

The AI should not ask follow-up questions in v1. If inputs are incomplete, the UI should block generation and show inline validation.

## Plan Options

Every AI generation returns exactly three options:

### 1. Exposure Maximization

Prioritizes high daily impressions and high visibility InventoryLocations. It can spend closer to the full budget if the plan remains plausible.

### 2. Budget Efficiency

Prioritizes lower estimated CPM and lower cost per day. It may choose fewer or less premium InventoryLocations if that better matches the cost goal.

### 3. Balanced Plan

Balances audience fit, estimated impressions, availability, and budget usage. This is the default recommendation when the AI cannot infer a stronger preference from the goal text.

## Option Output Requirements

Each option must include:

| Field | Notes |
| --- | --- |
| Option name | One of the three fixed labels above. |
| Summary | Short plain-language explanation of the strategy. |
| InventoryLocations | 2-5 recommended InventoryLocations by ID. |
| Per-location allocation | Days, budget allocation, estimated impressions, and reason. |
| Total budget | Sum of allocated location cost. Must not exceed user budget. |
| Estimated impressions | Sum of allocated location impressions. |
| Average CPM | `total budget / estimated impressions * 1000`. |
| Creative formats | Derived from selected screen types using existing creative requirement logic where possible. |
| Caveats | Short list of planning assumptions such as availability or final booking confirmation. |

## AI Data Boundary

The AI receives a compact candidate set rather than unlimited app state.

The app prepares candidate InventoryLocations from the currently loaded inventory:

- Prefer locations that match query text, city, venue type, audience tags, budget, and availability.
- Cap the candidate set to a small number, such as 12-20 records, before sending to the AI.
- Send only fields needed for planning: ID, name, city, district, venue type, screen type, price per day, daily impressions, availability, audience tags, and DNA score.

The AI must return IDs from the provided candidate list only. Any unknown ID is ignored by the parser.

## Structured Response Contract

Gemini output should be requested as strict JSON. The parser should validate shape before rendering.

```ts
interface AiMediaPlanResponse {
  options: AiMediaPlanOption[];
}

interface AiMediaPlanOption {
  id: 'exposure' | 'efficiency' | 'balanced';
  title: string;
  summary: string;
  items: AiMediaPlanItem[];
  totalBudget: number;
  estimatedImpressions: number;
  averageCpm: number;
  creativeFormats: string[];
  caveats: string[];
}

interface AiMediaPlanItem {
  inventoryId: string;
  days: number;
  budget: number;
  estimatedImpressions: number;
  reason: string;
}
```

Validation rules:

- `options.length === 3`.
- Each option has a known `id`.
- Each `inventoryId` exists in the candidate set.
- `days` must be between 1 and requested campaign days.
- `totalBudget` must be less than or equal to requested budget.
- If numeric totals do not match the item rows, recompute totals locally and display local totals.

## Fallback Behavior

If AI configuration or generation fails:

- Keep the AI view usable with deterministic local planning.
- Generate the same three option types from local scoring rules.
- Show a small inline note: `目前使用本機規則產生草案，AI 服務暫時無法使用。`

If AI returns invalid JSON:

- Attempt one repair/retry with a stricter prompt.
- If still invalid, fall back to local deterministic planning.

If the candidate set is empty:

- Show an empty state asking the user to broaden budget, duration, or goal wording.
- Do not call the AI with an empty candidate list.

## UI Design

The `AI 建議` view becomes a structured planning workspace:

1. Input panel at the top:
   - Goal text area
   - Budget input
   - Start date input
   - Days stepper/input
   - `產生 AI 規劃` button
2. Loading state:
   - Keep inputs visible.
   - Show three skeleton option cards.
3. Results section:
   - Three comparable option cards.
   - Each card shows strategy label, summary, total budget, impressions, CPM, and selected InventoryLocations.
   - One primary action per card: `套用到 Media Plan`.
   - Secondary action near inputs: `調整條件` means edit fields and regenerate.
4. Applied state:
   - After applying an option, mark it as applied and rely on the existing Media Plan summary to show selected InventoryLocations.
   - Do not disable manual edits in the normal Media Plan.

The UI should avoid a freeform chat-first layout for v1. The feature is a planning assistant, not a general chatbot.

## Apply-To-Media-Plan Behavior

Applying a draft is explicit:

- User clicks `套用到 Media Plan` on one option.
- For each option item:
  - If the InventoryLocation is not already selected, call the existing add/select path.
  - If the InventoryLocation is already selected, do not duplicate it.
- The first implementation may ignore per-location `days` if the current add path only supports default days. If day allocation is supported locally, set the suggested days.
- Show a confirmation message after applying.

The AI never directly submits a Campaign or confirms booking.

## Testing

Unit tests:

- Candidate preparation caps and filters input safely.
- Response parser accepts valid JSON and rejects malformed output.
- Totals are recomputed locally when AI totals are inconsistent.
- Fallback planner returns three options with valid InventoryLocation IDs.
- Apply helper skips duplicates.

Manual browser checks:

- In `/campaign-planner`, AI tab accepts the four inputs.
- Loading and error states are readable.
- Three options render with real InventoryLocation names.
- `套用到 Media Plan` adds InventoryLocations without duplicates.
- Regenerating after adjusted inputs replaces draft options but does not overwrite already applied Media Plan items.

Build verification:

- `npm run build`
- Targeted Vitest tests for planner utilities.

## Out Of Scope

- Multi-turn AI chat memory.
- Saving AI-generated drafts to Supabase.
- Automatic booking, campaign submission, or admin confirmation.
- Creative asset generation.
- Programmatic DOOH bidding optimization.
- Server-side API proxy. This v1 may use the existing browser-visible API key, with the known limitation that `NEXT_PUBLIC_*` values are bundled into the static frontend.
