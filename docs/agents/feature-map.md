# Feature Map

This map connects user-facing routes to implementation and data sources.

## Route Map

| Route | Entry point | Main responsibility |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Redirects to `/campaign-planner`, with GitHub Pages SPA redirect recovery. |
| `/campaign-planner` | `src/app/campaign-planner/page.tsx` | Advertiser planning, inventory discovery, media plan, required-format upload, review, and submit/booking confirmation. |
| `/admin` | `src/app/admin/page.tsx` | Internal dashboard for campaigns, creative review, inventory, screens. |
| `/reports` | `src/app/reports/page.tsx` | Advertiser delivery report dashboard using mock report data. |
| `/player/[screenId]` | `src/app/player/[screenId]/page.tsx` | Static-export screen player simulator using known mock screen IDs. |

## Campaign Planner

Active component:

- `src/components/campaign-planner/CampaignPlannerPage.tsx`

Main subsystems:

| Subsystem | Files | Data source |
| --- | --- | --- |
| Inventory fetch | `usePlannerStore.ts`, `lib/api/inventory.ts` | Supabase `inventory_locations` |
| Search/filter/sort | `FilterSidebar`, `inventoryFilters.ts` | Client-side over fetched inventory |
| List/map discovery | `InventoryDiscovery`, `ListView`, `MapWrapper` | Filtered inventory array |
| Detail card | `InventoryDetailCard` | Selected InventoryLocation object |
| Media Plan | `MediaPlanSummary`, `mediaPlanCalculations.ts` | React local selected items + draft campaign inventory rows |
| Creative upload | `CreativeUploadModal`, `lib/api/creatives.ts`, `lib/api/campaign-draft.ts` | Supabase Storage + `media_assets` + `campaign_creative_requirements` |
| Review submit | `CampaignReviewStep`, `lib/api/campaign-draft.ts` | `submitCampaignForConfirmation(campaignId)` after required formats are uploaded |
| Creative requirements | `creativeRequirements.ts`, `MediaPlanSummary`, `CampaignReviewStep` | Derived from selected screen types, stored per draft campaign |

Business behavior:

- Search matches name, district, or address.
- Filters are exact client-side comparisons.
- Selected inventory cannot be duplicated.
- Selecting the first InventoryLocation creates a draft Campaign when Supabase is available.
- Selected items default to 7 days and are persisted as campaign inventory items in the draft flow.
- Budget is `pricePerDay * days` per InventoryLocation.
- Estimated impressions are `dailyImpressions * days` per InventoryLocation.
- Required creative formats are grouped by selected screen types.
- The current planner worktree removes the separate `CreativeUploadStep` from the main step flow and embeds upload actions in Media Plan / Review.
- Review submission updates `campaigns.booking_status` to `pending_confirmation`; it does not create `campaign_bookings`.

## Admin Dashboard

Active component:

- `src/components/admin/AdminDashboardPage.tsx`

Tabs:

| Tab | Component | Data/action source |
| --- | --- | --- |
| Overview | `OverviewPanel` | campaigns, inventory, screens from Supabase helpers |
| Campaigns | `CampaignTable`, `CampaignDetailPanel` | `fetchAllCampaigns`, `updateCampaignStatus`, `confirmBooking` |
| Creative Review | `CreativeReviewQueue` | `updateCreativeApprovalStatus` |
| Inventory | `InventoryManagementTable` | `fetchInventoryLocations` |
| Screens | `ScreenManagementTable` | `fetchAllScreens` |

Business behavior:

- Campaign status is reviewed separately from creative status and booking status in the Step 15 model.
- `confirmBooking()` in admin creates or updates the formal `campaign_bookings` record, then updates campaign booking status to confirmed and campaign status to approved.
- Creative approval updates `creative_assets.approval_status` and recomputes parent campaign creative status.

## Reports

Active component:

- `src/components/reports/AdvertiserReportsPage.tsx`

Data source:

- `src/data/mockReportData.ts`

Business behavior:

- Default selected campaign is `camp-rep-1`.
- Date range filter is available.
- Location filter is disabled.
- CSV export downloads current recent POP logs.
- Verified Plays are playback events.
- Estimated Impressions are footfall-based estimates.

## Web Player

Active component:

- `src/components/player/WebPlayerPage.tsx`

Data source:

- `src/data/mockScreens.ts`
- `src/data/mockPlaylists.ts`

Business behavior:

- Valid `screenId` values are generated from `mockScreens` for static export.
- Player loops through playlist items by duration.
- Local POP logs are emitted for started/completed playback events.
- Heartbeat logs to browser console every 10 seconds.
- `Shift + D` toggles debug panel.

## Duplicate Or Legacy Areas

There are both:

- `src/components/campaign-planner/*`
- `src/components/planner/*`

The active route currently uses `campaign-planner`. Do not edit `planner` unless a route or import proves it is used.
