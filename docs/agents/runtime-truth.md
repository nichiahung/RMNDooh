# Runtime Truth

This file describes what the app actually does today. Treat it as higher priority than stale comments that still say the MVP is fully mocked.

## Current Runtime Summary

| Surface | Route | Current data source | Notes |
| --- | --- | --- | --- |
| Campaign Planner | `/campaign-planner` | Supabase inventory via `fetchInventoryLocations()` | The planner fetches real inventory rows when env vars and tables exist. |
| Media Plan | `/campaign-planner` | Client state + Supabase draft helpers | Selected items live in React state and are persisted as draft inventory items when a draft Campaign exists. |
| Creative Upload | `/campaign-planner` | Supabase Storage + `media_assets` + requirement link | `CreativeUploadModal` validates against format specs, uploads the file, then links it to a campaign creative requirement. |
| Campaign Submit / Booking | `/campaign-planner` | Supabase campaign draft helpers | Current worktree is moving toward `confirmBooking(campaignId)` after required creative formats are uploaded. |
| Campaign Draft API Helpers | `/campaign-planner` draft flow | Supabase | `src/lib/api/campaign-draft.ts` is now wired into planner add/remove/requirements/confirm paths in the current worktree. |
| Admin Dashboard | `/admin` | Supabase campaigns, inventory, screens | Falls back to empty lists on fetch errors in some helpers. |
| Reports | `/reports` | `src/data/mockReportData.ts` | No live Supabase reporting integration yet. |
| Web Player | `/player/[screenId]` | `src/data/mockScreens.ts`, `src/data/mockPlaylists.ts` | Simulates heartbeat, playback loop, and POP logs locally. |
| i18n | global layout/provider | `src/i18n` dictionaries | Lightweight custom provider, no heavy i18n framework. |
| Deployment | GitHub Pages static export | `next.config.ts` basePath `/RMNDooh` in production | Build output is static `out/`. |

## Supabase-Backed Code Paths

Current Supabase client:

- `src/lib/supabase.ts`
- requires `NEXT_PUBLIC_SUPABASE_URL`
- requires `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Current API helpers using Supabase:

- `src/lib/api/inventory.ts`
- `src/lib/api/campaigns.ts`
- `src/lib/api/creatives.ts`
- `src/lib/api/admin.ts`
- `src/lib/api/campaign-draft.ts`

Current known default IDs:

- Advertiser: `aaaaaaaa-0000-0000-0000-000000000001`
- User: `00000000-0000-0000-0000-000000000002`

These are MVP constants. Do not build production auth assumptions on them.

## Mock-Backed Code Paths

Reports:

- `src/components/reports/AdvertiserReportsPage.tsx`
- `src/data/mockReportData.ts`

Player:

- `src/components/player/WebPlayerPage.tsx`
- `src/data/mockScreens.ts`
- `src/data/mockPlaylists.ts`

Legacy/parallel planner components:

- `src/components/planner/*`
- `src/components/campaign-planner/*`

The active route imports `src/components/campaign-planner/CampaignPlannerPage.tsx`. Check imports before editing duplicated components.

## Placeholder Or Partial Features

| Feature | Current behavior |
| --- | --- |
| Save Draft button in planner header | UI only in the main planner header. Review step has a simulated save-draft confirmation. |
| Settings / Sign Out in admin sidebar | UI placeholders. |
| Reports location filter | Disabled, labelled as coming soon. |
| Auth / role-based access | Not implemented as production UI auth. |
| Programmatic bidding | Spec exists; no real OpenRTB/SSP/DSP runtime. |
| Player POP persistence | Local simulated logs only. |

## Known Drift To Resolve Before Editing

- Current dirty worktree shows a planner/review prop-interface mismatch around `CampaignReviewStep` props; verify compile before treating the draft upload flow as stable.
- `viewMode` defaults to `map` in Zustand, but `CampaignPlannerPage` local state initializes `currentView` to `list`.
- Campaign status models are split between `CampaignStatus`, Step 15 three-status model, and draft lifecycle types. Do not collapse them without checking the business flow.

## Agent Rule

When implementing behavior, inspect the active component and API helper first. Do not assume docs alone describe current runtime.
