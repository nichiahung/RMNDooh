# Feature Map

This map connects user-facing routes to implementation and data sources.

## Route Map

All non-admin, non-login routes are wrapped in the `(shell)` route group (`src/app/(shell)/`), which applies `AuthGuard + AppShell` (persistent collapsible sidebar) via `src/app/(shell)/layout.tsx`.

| Route | Entry point | Main responsibility |
| --- | --- | --- |
| `/` | `src/app/(shell)/page.tsx` | Role-aware HomeView: AdvertiserHome or SalesHome. Admin role redirects to `/admin`. |
| `/campaign-planner` | `src/app/(shell)/campaign-planner/page.tsx` | Advertiser planning, inventory discovery, media plan, creative upload, review, and submit. |
| `/assets` | `src/app/(shell)/assets/page.tsx` | Creative asset library listing from Supabase `media_assets`. |
| `/reports` | `src/app/(shell)/reports/page.tsx` | Advertiser delivery report dashboard (mock data). |
| `/proposal-builder` | `src/app/(shell)/proposal-builder/page.tsx` | Sales proposal creation flow. |
| `/proposal-review` | `src/app/(shell)/proposal-review/page.tsx` | Proposal review for advertiser and sales. |
| `/admin` | `src/app/admin/page.tsx` | Internal dashboard for campaigns, creative review, inventory, screens. Uses `AdminSidebar` (no AppShell). |
| `/login` | `src/app/login/page.tsx` | Auth page. On success redirects admin → `/admin`, others → `/`. |
| `/player/[screenId]` | `src/app/player/[screenId]/page.tsx` | Static-export screen player simulator. |

## App Shell

| Component | File | Purpose |
| --- | --- | --- |
| `AppShell` | `src/components/shell/AppShell.tsx` | Layout wrapper: `h-screen flex overflow-hidden`, sidebar + scrollable content |
| `AppSidebar` | `src/components/shell/AppSidebar.tsx` | Collapsible sidebar 220px ↔ 60px icon rail, role-filtered nav, badge counts, campaign sub-items |
| `navConfig` | `src/components/shell/navConfig.ts` | Static `NAV_CONFIG: Record<Role, NavSection[]>`, `admin` maps to `[]` |
| `HomeView` | `src/components/shell/HomeView.tsx` | Role-specific home: `AdvertiserHome` (campaign hero, metrics, AI insights) / `SalesHome` (pipeline, follow-up queue) |
| `useSidebarCollapse` | `src/hooks/useSidebarCollapse.ts` | localStorage-backed collapse state, key `sidebar_collapsed` |

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
- Selecting the first InventoryLocation creates a draft Campaign when Supabase is available. The campaign is auto-named `Campaign_YYYYMMDD_NNN` (date + sequential count); the user can rename it in the Review step.
- Selected items default to 7 days and are persisted as campaign inventory items in the draft flow.
- Budget is `pricePerDay * days` per InventoryLocation.
- Estimated impressions are `dailyImpressions * days` per InventoryLocation.
- Required creative formats are grouped by selected screen types.
- The current planner worktree removes the separate `CreativeUploadStep` from the main step flow and embeds upload actions in Media Plan / Review.
- Review submission updates `campaigns.booking_status` to `pending_confirmation`; it does not create `campaign_bookings`.

## Admin Dashboard

Active component:

- `src/components/admin/AdminDashboardPage.tsx`

The Admin Dashboard serves two distinct business paths that converge at Bookings:
- **Advertiser self-service path**: Advertiser creates Campaign Draft via planner → Admin reviews Draft → Booking created
- **Sales-assisted path**: Sales builds Proposal → Advertiser approves → Admin converts to Booking

Tabs (current 12-tab layout, grouped by sidebar section):

| Section | Tab | Component | Data/action source |
| --- | --- | --- | --- |
| Operations | Overview | `OverviewPanel` + `AdminWorkQueuesPanel` | Supabase campaigns/inventory/screens + `getAdminDashboardWorkQueuesApi()` |
| Operations | Proposals | `AdminProposalsPanel` | `listAdminProposalsApi()` (trading iteration) |
| Operations | Campaign Drafts | `AdminCampaignDraftsPanel` | `listAdminCampaignDraftsApi()` (trading iteration) |
| Operations | Bookings | `AdminBookingsPanel` | `listAdminBookingsApi()` (trading iteration) |
| Operations | Campaigns *(legacy)* | `CampaignTable`, `CampaignDetailPanel` | `fetchAllCampaigns`, `updateCampaignStatus`, `confirmBooking` |
| Commerce | Inventory | `InventoryManagementTable` | `fetchInventoryLocations` |
| Commerce | Pricing & Rate Cards | `AdminPricingPanel` | — |
| Commerce | Screens | `ScreenManagementTable` | `fetchAllScreens` |
| Creative | Creative Library | `AdminCreativeLibraryPanel` | — |
| Creative | Creative Review | `CreativeReviewQueue` | `updateCreativeApprovalStatus`, `fetchStandaloneCreatives` |
| Creative | Coverage | `AdminCreativeCoveragePanel` | `listAdminCreativeCoverageApi()` (trading iteration) |
| Launch | Launch Readiness | `AdminLaunchReadinessPanel` | `listAdminLaunchReadinessApi()` (trading iteration) |

Business behavior:

- Campaign status is reviewed separately from creative status and booking status in the Step 15 model.
- `confirmBooking()` in admin creates or updates the formal `campaign_bookings` record, then updates campaign booking status to confirmed and campaign status to approved.
- Creative approval updates `creative_assets.approval_status` and recomputes parent campaign creative status.
- The "Campaigns" tab is a legacy Supabase-backed view; the Proposals/Drafts/Bookings tabs use the newer trading iteration API. Both paths produce Booking records.
- `AdminWorkQueuesPanel` shows 5 work-queue counts (needsSalesAction, needsBookingAction, needsCreativeReview, needsCreativeCoverage, needsLaunchAction) but cards are currently non-interactive.

## CMS Integration Architecture Direction

Screens in the DOOH platform may be controlled by different CMS systems depending on the venue operator (in-house CMS or third-party such as Broadsign, Scala, Signagelive). The intended architecture uses a **CMS Adapter pattern**:

- Each CMS type has an adapter implementing a common interface: `pushSchedule`, `cancelSchedule`, `getProofOfPlay`, `getScreenStatus`.
- The admin dashboard interacts only with the adapter interface — CMS differences are hidden from the UI.
- The `screens` table will need `cms_type` and `cms_screen_id` columns to support routing to the correct adapter.
- Current implementation is demo/mock; this architecture is the target direction.

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

## Shared UI Primitives

`src/components/ui/` contains design-system-level components. Use these instead of writing inline styles:

| Component | File | Usage |
| --- | --- | --- |
| `Button` | `ui/Button.tsx` | Variants: `primary` (indigo fill) · `secondary` (white + indigo border) · `ghost` (transparent) · `danger` (white + red border). Sizes: `sm` · `md`. |
| `Modal` | `ui/Modal.tsx` | Props: `onClose`, `maxWidth`, `title?`, `zIndex?`. Escape key + backdrop-click close built in. Use `zIndex="z-[200]"` for modals that must stack above others. |
| `StatusBadge` | `ui/StatusBadge.tsx` | Props: `value`, `map` (Record of status → Tailwind class), `label?`, `shape?: 'tag' \| 'pill'`. |

## planner/ vs campaign-planner/

`src/components/campaign-planner/` holds the canonical, feature-complete implementations.
`src/components/planner/` contains **thin store-connected wrappers** that delegate rendering to `campaign-planner`:

| planner/ file | Role |
| --- | --- |
| `InventoryCard.tsx` | Reads `usePlannerStore` (isSelected, add/remove), renders `campaign-planner/InventoryCard` |
| `ListView.tsx` | Grid wrapper aligned with campaign-planner breakpoints, uses i18n empty state |
| `FilterSidebar.tsx` | Manages `isOpen` + `searchQuery` local state, delegates to `campaign-planner/FilterSidebar` |

**Rule**: Edit `campaign-planner/` components for feature changes. Edit `planner/` wrappers only to adjust store wiring.
