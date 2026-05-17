# Changelog

## 2026-05-16 — Shared Proposal + Self-Service Trading Iteration

### Added

#### Service modules
- `src/lib/services/flightService.ts` — Inclusive date arithmetic, campaign ↔ line-item flight comparison, date-match status derivation, creative deadline calculation, mixed-flight summarisation.
- `src/lib/services/creativeLibraryService.ts` — In-memory creative asset management with versioning, validation, review, assignment, and replacement workflow. Supports independent review before assignment.
- `src/lib/services/creativeRequirementsService.ts` — Generates creative requirements from inventory, groups same-spec items into single requirement.
- `src/lib/services/launchReadinessService.ts` — Derives campaign-level readiness from line-item check results. Supports `partially_ready` when some items ready and some blocked.

#### Admin Operations Console (12 tabs)
- `AdminWorkQueuesPanel` — Dashboard summary cards for items needing sales / booking / creative / coverage / launch action.
- `AdminProposalsPanel` — Proposal list with status badges, flight dates, and quote.
- `AdminCampaignDraftsPanel` — Campaign draft list with status, buying method, flight, estimated budget.
- `AdminBookingsPanel` — Booking list with source, status, inventory count, check statuses.
- `AdminPricingPanel` — Price books, items, rules, approval queue (sub-tabs).
- `AdminCreativeLibraryPanel` — Filterable asset cards with status badges, version, dimensions.
- `AdminCreativeCoveragePanel` — Per-campaign requirement coverage matrix.
- `AdminLaunchReadinessPanel` — Per-campaign readiness status with blocker reasons and ready/blocked counts.
- Expanded `AdminSidebar` from 5 tabs → 12 tabs in 4 sections (Operations, Commerce, Creative, Launch).

#### Proposal Builder
- `/proposal-builder` route with 4-step flow: Setup → Inventory → Pricing → Send.
- Integrates with trading iteration API for proposal creation, versioning, and pricing estimation.

#### Unit tests (4 new test files, 82 total tests)
- `flightService.test.ts` — Inclusive days, date match, flight comparison, mixed flight, creative due date.
- `pricingService.test.ts` — Self-service MSRP, proposal pricing, floor checks, approval, snapshot, advertiser sanitization.
- `creativeLibraryService.test.ts` — Versioning, approval, replacement, rejected replacement preserving active, coverage.
- `launchReadinessService.test.ts` — All blocker scenarios, partially_ready, ready_for_launch.

### Changed
- `AdminDashboardPage.tsx` — Wired all 12 tabs. Overview now shows work queues + legacy overview.
- `AdminSidebar.tsx` — Restructured into 4 nav sections with new icons.

### Previous (same date)
- Added planning baseline for Proposal + Self-service shared iteration in DOOH product.
- Documented product decisions D-008 to D-012 in `DECISION_LOG.md`.
- Added shared trading domain doc set for buying model, flight, pricing, creative review, and launch readiness alignment.
- Added shared domain types scaffold for new enums:
  - `BuyingMethod`, `BookingSource`, `ProposalStatus`, `CampaignDraftStatus`
  - `BookingStatus`, `CreativeAssetStatus`, `CreativeRequirementStatus`, `CreativeUploadRequestStatus`
  - `LaunchReadinessStatus`, `DateMatchStatus`, `PriceBookType`, `PriceVisibility`, `PricingApprovalStatus`
- No runtime behavior changes were made to existing campaign/proposal flows in this phase.
