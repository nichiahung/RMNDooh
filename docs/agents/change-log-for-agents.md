# Change Log For Agents

This is not a release changelog. It records decisions and drift warnings that affect future agent work.

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
