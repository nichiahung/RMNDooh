# Change Log For Agents

This is not a release changelog. It records decisions and drift warnings that affect future agent work.

## 2026-05-18 — UI Refactoring

Completed a component consolidation pass. Key changes for any agent working on the frontend:

- **`src/components/ui/`** now exists with three shared primitives:
  - `Button` — variants: primary / secondary / ghost / danger; sizes: sm / md
  - `Modal` — wraps all floating dialog overlays; supports `zIndex` override for stacked modals
  - `StatusBadge` — replaces inline `px-1.5 py-0.5 rounded` status span patterns
- **`planner/`** components are now thin wrappers, not independent implementations:
  - `InventoryCard`, `ListView`, `FilterSidebar` all delegate to `campaign-planner/` equivalents
  - Edit `campaign-planner/` for feature logic; `planner/` only for store-wiring changes
- **`FilterSidebar`** (campaign-planner) rebuilt with accordion sections, applied-filters chip bar, and per-section "Show N more" overflow — the old `planner/FilterSidebar` (checkbox-based, hardcoded arrays) is replaced
- **`usePlannerStore`** now surfaces `inventoryError: string | null`; `fetchInventory` wraps the API call in try/catch instead of silently swallowing errors
- Do **not** write a local `StatusBadge`, modal `fixed inset-0`, or inline button variant — use `components/ui/` instead

## 2026-05-16

- Added agent context docs under `docs/agents`.
- Treat current runtime as hybrid, not fully mocked:
  - planner inventory is Supabase-backed
  - creative upload is Supabase Storage + DB-backed
  - campaign submit writes Supabase rows
  - admin reads/writes Supabase helpers
  - reports and player remain mock-backed
- Keep business vocabulary aligned with `AGENTS.md`: Advertiser, Campaign, InventoryLocation, Screen, Playlist/Loop, Slot, POP.
- Preserve `/RMNDooh` GitHub Pages base path assumptions for production.
- Before editing duplicate planner components, trace route imports. Active route uses `src/components/campaign-planner`.
- Current dirty worktree refactors Campaign Planner from a three-step Inventory -> Creative -> Review flow to a two-step Inventory -> Review flow with required-format upload embedded in Media Plan / Review.
- Current dirty worktree wires planner selection to campaign draft helpers: create draft, add/remove inventory items, ensure requirements, upload asset to requirement, and confirm booking.

## Watch Items

- Confirm `CampaignPlannerPage` and `CampaignReviewStep` props compile after the dirty planner refactor; documentation reflects the intended flow, but the source was already dirty when this note was written.
- Campaign status naming differs across general Campaign, Step 15, and self-service draft flow.
- Supabase seed data must align with hardcoded MVP Advertiser/User IDs.
