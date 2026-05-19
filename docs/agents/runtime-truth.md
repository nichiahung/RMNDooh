# Runtime Truth

This file describes what the app actually does today. Treat it as higher priority than stale comments that still say the MVP is fully mocked.

## Current Runtime Summary

| Surface | Route | Current data source | Notes |
| --- | --- | --- | --- |
| Home (Advertiser) | `/` | `listCampaignSummaries()` + `mockReportData` | AdvertiserHome: hero campaign card, 5 perf metrics, pending actions. |
| Home (Sales) | `/` | `listAdminProposalsApi()` | SalesHome: proposal pipeline counts, follow-up queue. |
| Campaign Planner | `/campaign-planner` | Supabase inventory via `fetchInventoryLocations()` | Fetches real inventory rows when env vars and tables exist. |
| Media Plan | `/campaign-planner` | Client state + Supabase draft helpers | Selected items in React state, persisted as draft inventory items when a draft Campaign exists. |
| Creative Upload | `/campaign-planner` | Supabase Storage + `media_assets` + requirement link | `CreativeUploadModal` validates format specs, uploads file, links to campaign creative requirement. |
| Campaign Submit / Booking | `/campaign-planner` | Supabase campaign draft helpers | `submitCampaignForConfirmation(campaignId)` marks `pending_confirmation`; booking rows created only by Admin. |
| Campaign Draft API Helpers | `/campaign-planner` draft flow | Supabase | `src/lib/api/campaign-draft.ts`. New campaigns auto-named `Campaign_YYYYMMDD_NNN` on create. |
| Creative Library | `/assets` | Supabase `media_assets` via `listMediaAssets()` | Lists all uploaded assets for the current advertiser. |
| Admin Dashboard | `/admin` | Mixed: legacy tabs use Supabase helpers; trading-iteration tabs use `tradingIterationApi` | 12 tabs across 4 sidebar sections. Legacy tabs (Overview, Campaigns, Creative Review, Inventory, Screens) pull from Supabase. Trading-iteration tabs (Proposals, Campaign Drafts, Bookings, Coverage, Launch Readiness) pull from `src/lib/api/tradingIterationApi.ts`. `AdminWorkQueuesPanel` work-queue cards are non-interactive (counts only, no navigation). UUID displayed raw in Proposals, Campaign Drafts, and Launch Readiness panels instead of human-readable names. CampaignTable search input has no onChange handler (non-functional). |
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

Planner component structure (post-refactor):

- `src/components/campaign-planner/*` — canonical implementations (InventoryCard, ListView, FilterSidebar, etc.)
- `src/components/planner/*` — store-connected wrappers; delegate to `campaign-planner` for rendering
- `src/components/ui/*` — shared primitives (Button, Modal, StatusBadge)

The active route imports `src/components/campaign-planner/CampaignPlannerPage.tsx`.
`planner/` files are no longer independent duplicates — they are intentional thin wrappers.

## Placeholder Or Partial Features

| Feature | Current behavior |
| --- | --- |
| Save Draft button in planner header | UI only in the main planner header. Review step has a simulated save-draft confirmation. |
| Settings in admin sidebar | UI placeholder, no action. |
| Reports location filter | Disabled, labelled as coming soon. |
| Auth / role-based access | Not implemented as production UI auth. |
| Programmatic bidding | Spec exists; no real OpenRTB/SSP/DSP runtime. |
| Player POP persistence | Local simulated logs only. |

## Known Drift To Resolve Before Editing

- `viewMode` defaults to `map` in Zustand, but `CampaignPlannerPage` local state initializes `currentView` to `list`.
- Campaign status models are split between `CampaignStatus`, Step 15 three-status model, and draft lifecycle types. Do not collapse them without checking the business flow.
- Existing campaigns in DB with null/empty names display as `Campaign_YYYYMMDD_NNN` fallback in HomeView only. They are not backfilled in DB — only new campaigns get the auto-generated name on insert.

## CMS Integration Direction

This platform is the **business logic layer** (booking decisions, creative approval, scheduling intent). Actual content delivery to physical screens is handled by CMS systems, which vary by venue operator.

Current state: `ScreenManagementTable` shows screen records from Supabase. No CMS push integration exists yet — the Web Player (`/player/[screenId]`) is a local simulator only.

Target architecture:
- A **CMS Adapter Layer** sits between the Admin Dashboard and the downstream CMS systems.
- Each adapter implements a common interface: `pushSchedule`, `cancelSchedule`, `getProofOfPlay`, `getScreenStatus`.
- The `screens` table will need `cms_type` (`'inhouse' | 'broadsign' | 'scala' | 'signagelive' | ...`) and `cms_screen_id` columns.
- Admin triggers "Schedule Campaign" once; the platform routes to the correct adapter based on `cms_type`.
- Proof-of-Play logs flow back through the same adapter layer into the Reports surface.

Do not build CMS-specific logic directly into admin components. Route through the adapter interface.

## Agent Rule

When implementing behavior, inspect the active component and API helper first. Do not assume docs alone describe current runtime.
