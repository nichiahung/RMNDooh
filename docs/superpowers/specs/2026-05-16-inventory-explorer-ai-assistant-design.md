# Inventory Explorer + AI Planning Assistant — Design Spec

**Date:** 2026-05-16  
**Status:** Approved

---

## Goal

Transform the workspace home page from a passive map preview into an immersive inventory exploration experience, with contextual past-order awareness and a mock AI planning assistant that recommends venues based on natural-language goals.

## Architecture

Three focused additions to the workspace:

1. **`InventoryExplorer`** — replaces `InventoryMapPreview`. Full-featured map with filters, 4-state pins, and click-to-open detail panel.
2. **`VenueDetailPanel`** — slide-in overlay inside the map container, shows venue stats and CTA.
3. **`AIAssistant`** — floating chat panel fixed to bottom-right of the page, powered by `mockAI.ts`.

Supporting module:
- **`src/lib/mockAI.ts`** — pure client-side function that parses a natural-language query and returns ranked `InventoryLocation[]`.

`WorkspacePage` passes `usedInventoryIds: Set<string>` (derived from already-loaded `drafts`) down to `InventoryExplorer`. No new API calls.

---

## Section 1: Layout & Map

- **Map height:** 500px inside a rounded card (`rounded-2xl`), full container width.
- **Filter bar** sits above the map (inside the same card section):
  - City tabs: 全部 / 台北 / 新北 / 桃園 — filters pins to matching `city` field.
  - Venue type pills: 捷運站 (`Station`, `Subway`) / 看板 (`Billboard`, `Street`, `Highway`) / 商場 (`Mall`) / 機場 (`Airport`) / 全部. Multiple pills can be active simultaneously; default = all active.
  - Filters are pure client-side — no re-fetching.
- **Count badge** (top-left of map): "台北 12 個版位" — updates live as filters change.
- **"開始規劃" CTA** (top-right of map): navigates to `/campaign-planner`.
- Scroll-wheel zoom: **enabled** (changed from current `scrollWheelZoom: false`).
- The existing **自助購買 / Sales Proposals** sections remain below, unchanged.

---

## Section 2: Pin System

Four pin states rendered as `L.divIcon` circles:

| State | Condition | Color | Size |
|---|---|---|---|
| 可用 | `availability >= 0.7` AND not used | Indigo `#6366f1` | 12px |
| 有限 | `availability >= 0.3` AND not used | Amber `#f59e0b` | 12px |
| 不可用 | `availability < 0.3` AND not used | Slate `#94a3b8` | 12px |
| 已使用 | `usedInventoryIds.has(item.id)` | Emerald `#10b981` | 16px, `★` inside |

"已使用" overrides availability color — a used venue always shows emerald regardless of availability.

Legend (bottom-left of map) gains a 4th item: `● 已使用`.

**`usedInventoryIds` derivation** in `WorkspacePage`:
```ts
const usedInventoryIds = useMemo(() => {
  const ids = new Set<string>();
  drafts.forEach(draft => draft.inventoryIds?.forEach(id => ids.add(id)));
  return ids;
}, [drafts]);
```

`CampaignSummary` must expose `inventoryIds: string[]`. If not already present, add it to `listCampaignSummaries()` return type and the Supabase query.

---

## Section 3: Venue Detail Panel

Rendered inside the `InventoryExplorer` container as `position: absolute; right: 0; top: 0; bottom: 0; width: 320px; z-index: 1000`.

Opens when user clicks a pin. Closes when user clicks `×` or clicks a different pin (which opens that pin's panel instead).

**Slide animation:** CSS `transform: translateX(100%)` → `translateX(0)` over 150ms ease-out, driven by a `selectedVenue: InventoryLocation | null` state variable.

**Panel content (top to bottom):**

1. **Header row:** Venue name (font-semibold, text-slate-900) + `×` close button (right-aligned).
2. **Badge row:** District chip + screenType chip (slate-100 background).
3. **Availability row:** Colored dot (`#6366f1` / `#f59e0b` / `#94a3b8`) + label text + thin `<progress>` bar showing `availability * 100`%.
4. **Stats row (3 columns):**
   - `NT$X,XXX / 天`
   - `XXX,XXX 日曝光`
   - `CPM NT$XX`
5. **Audience tags:** Indigo-50 chips, comma-joined from `audienceTags`.
6. **Peak hours:** "尖峰時段 HH:00 · HH:00 · HH:00" — derived by finding the top 3 indices in `dna.peakHours`.
7. **已使用 badge** (conditional): emerald chip `★ 已使用於過去活動` — shown only if `usedInventoryIds.has(venue.id)`.
8. **CTA button:** Full-width, indigo-600, `開始規劃此版位 →` → `router.push('/campaign-planner?inventoryId=' + venue.id)`.

Clicking a pin must **not** open Leaflet's default popup (call `marker.unbindPopup()` or omit `.bindPopup()`). Instead it calls `setSelectedVenue(item)` via a callback prop.

---

## Section 4: Mock AI Planning Assistant

### Floating Action Button

- Fixed position: `bottom-6 right-6`, `z-50`.
- Appearance: indigo gradient pill, `✦ AI 規劃`, subtle CSS `animate-pulse` on the `✦` glyph only (on first render, stops after first interaction).
- Click → `isPanelOpen` toggles to `true`.

### Chat Panel

- Dimensions: `w-[360px] h-[480px]`, fixed `bottom-20 right-6`, white card with shadow-xl and rounded-2xl.
- **Header:** `✦ AI 規劃助手` + `−` minimize button (sets `isPanelOpen = false`).
- **Message list:** scrollable, `flex-col gap-3`. Two bubble styles:
  - User: right-aligned, indigo-600 background, white text.
  - AI: left-aligned, slate-100 background, slate-800 text.
- **Input bar:** text `<input>` + send `<button>` (arrow icon). Submit on Enter or button click.
- **Initial AI message** shown on open: *"告訴我你的廣告目標，我來推薦最適合的版位。例如：「台北通勤族，預算每天5000以下」"*

### Mock AI Logic (`src/lib/mockAI.ts`)

```ts
export function queryInventory(query: string, inventory: InventoryLocation[]): InventoryLocation[]
```

Parsing rules (applied in order, all case-insensitive):

| Keyword detected | Filter applied |
|---|---|
| 台北 | `city === '台北市'` |
| 新北 | `city === '新北市'` |
| 桃園 | `city === '桃園市'` |
| 通勤 | `audienceTags.includes('Commuters')` |
| 上班 | `audienceTags.includes('Professionals')` |
| 學生 | `audienceTags.includes('Students')` |
| 購物 / 消費 | `audienceTags.includes('Shoppers')` |
| 科技 | `audienceTags.includes('Tech Workers')` |
| 旅客 / 觀光 | `audienceTags.includes('Tourists')` |
| 捷運 / 站 | `venueType === 'Station'` or `'Subway'` |
| 看板 | `screenType === 'Billboard'` |
| 機場 | `venueType === 'Airport'` |
| Number (e.g. 5000) | `pricePerDay <= number` |

Filters are ANDed together. If no filters match, return top 5 by `dna.baseMatchScore`. Result is always top 3 by `dna.baseMatchScore` among filtered set.

### Streaming Response

`streamAIResponse(venues: InventoryLocation[], query: string, onChunk: (text: string) => void): void`

Builds a response string then replays it character-by-character using `setTimeout` at 20ms intervals:

```
根據你的目標，我找到 {N} 個適合的版位：

① {name}
   NT${pricePerDay}/天 · {dailyImpressions} 日曝光 · {audienceTags[0]} {audienceTags[1]}

② ...

③ ...
```

After the text is fully streamed, render venue cards as React components (not streamed text) — each card shows name + price + a `開始規劃` button → `/campaign-planner?inventoryId=xxx`.

If `venues.length === 0`, stream: *"找不到符合條件的版位，試試調整預算或地區範圍。"*

---

## Files Created / Modified

| File | Action |
|---|---|
| `src/components/workspace/InventoryExplorer.tsx` | Create — replaces InventoryMapPreview |
| `src/components/workspace/VenueDetailPanel.tsx` | Create |
| `src/components/workspace/AIAssistant.tsx` | Create |
| `src/lib/mockAI.ts` | Create |
| `src/components/workspace/WorkspacePage.tsx` | Modify — swap InventoryMapPreview → InventoryExplorer, add AIAssistant, derive usedInventoryIds |
| `src/lib/api/campaign-draft.ts` | Modify — ensure `inventoryIds` is returned in campaign summaries |

`InventoryMapPreview.tsx` is deleted (superseded by InventoryExplorer).

---

## Out of Scope

- Real Claude API calls
- Saving AI recommendations to the database
- Multi-turn conversation memory (each session is stateless)
- Animations beyond the slide-in panel and streaming text
