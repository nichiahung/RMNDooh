# Business Context For Agents

## Product Summary

RMNDooh is a Digital Out-Of-Home marketplace prototype. It helps Advertisers discover physical ad inventory, build a media plan, upload creative assets, submit a Campaign for review, and later inspect Proof-of-Play reporting.

The product is currently a hybrid MVP:

- Advertiser-facing planning flow is active.
- Admin review and operations UI exists.
- Report and player simulations exist.
- Some flows are wired to Supabase helpers, while reports/player remain mock-backed.

## Required Vocabulary

Use these terms exactly:

| Term | Meaning |
| --- | --- |
| Advertiser | A company buying ads. |
| Campaign | An advertising initiative created by an Advertiser. |
| InventoryLocation / Venue | A physical location such as Taipei 101, SOGO, station, airport, or mall. |
| Screen | A digital billboard/display located inside an InventoryLocation. |
| Media Plan | The Advertiser's selected InventoryLocations plus booking days and estimated budget/reach. |
| Creative Asset | A JPG, PNG, or MP4 file uploaded for campaign playback. |
| Playlist / Loop | A repeated playback cycle on a Screen. |
| Slot | A time segment inside a Loop. The commercial unit is usually a fixed duration such as 10 or 15 seconds. |
| Direct-sold Slot | A reserved Slot sold directly to an Advertiser/Campaign. |
| Programmatic Slot | A Slot filled by real-time bidding or PMP-style programmatic demand. |
| Proof-of-Play / POP | A device-level playback log proving a creative actually rendered on a Screen. |

## User Roles

| Role | Primary jobs | Current UI |
| --- | --- | --- |
| Advertiser | Find inventory, build Media Plan, upload creative, submit campaign, review reports. | `/campaign-planner`, `/reports` |
| Sales (業務) | Build proposals for advertisers, negotiate pricing, manage the sales pipeline. | `/proposal-builder`, `/proposal-review`, SalesHome at `/` |
| Admin / Ad Ops | Operational fulfillment: review campaign drafts, lock inventory, confirm bookings, review creatives, schedule campaigns, manage inventory and screens. NOT a second-approval role — the admin handles fulfillment after commercial agreement is reached. | `/admin` |
| Screen Runtime | Play assigned content, emit heartbeat, produce POP logs. | `/player/[screenId]` |
| Platform Operator | Maintain schema, API contracts, deploy pipeline, and seed data. | Docs, Supabase, GitHub Pages |

## Two Business Paths

The platform supports two distinct paths for bringing a campaign to air. Both converge at the Booking stage.

### Path 1: Advertiser Self-Service

1. Advertiser searches or filters InventoryLocations by city, district, venue type, screen type, audience, budget, impressions, and availability.
2. Advertiser compares List and Map views, then opens InventoryLocation details.
3. Advertiser adds InventoryLocations to a Media Plan. Each selection has booking days and contributes to estimated impressions, average CPM, and total budget.
4. The app creates a draft Campaign and persists selected InventoryLocations as campaign inventory items when Supabase is available.
5. Required creative formats are derived from selected Screen types and can be uploaded from the Media Plan or Review surfaces.
6. Advertiser reviews the Campaign summary and submits only after required creative formats are uploaded.
7. Admin sees the Campaign Draft and performs fulfillment operations (inventory check, booking confirmation).
8. Campaign proceeds through Creative Review → Launch Readiness → goes live.

### Path 2: Sales-Assisted (Proposal Flow)

1. Sales builds a Proposal (media plan) on behalf of an Advertiser using the Proposal Builder.
2. Proposal is sent to the Advertiser for review and negotiation.
3. Advertiser comments, requests changes, or approves. Once approved, commercial agreement is reached.
4. Admin converts the approved Proposal to a Booking — this is an operational step (inventory lock, schedule setup), not a second approval.
5. Campaign proceeds through Creative Review → Launch Readiness → goes live.

## Admin / Ad Ops Flow

The Admin role is operational fulfillment (Ad Ops), not a gatekeeper. By the time an item reaches Admin for booking confirmation, the commercial decision is already made.

1. Admin checks Dashboard work queue to see what needs attention today (pending drafts, booking actions, creative reviews, launch blockers).
2. For Campaign Drafts: verify inventory availability, confirm the booking (locks inventory).
3. For Proposals: after advertiser approval, convert to booking (lock inventory, set up schedule).
4. For Bookings: verify payment cleared, mark fulfilled.
5. For Creative Review: approve or reject creative assets. Check that all screen formats are covered.
6. For Launch Readiness: verify all prerequisites (booking confirmed, creative approved, inventory locked, payment cleared). Schedule the campaign to go live.
7. Monitor InventoryLocations and Screen status via CMS integration.

## Commercial Rules

- A draft Media Plan is not a confirmed booking.
- Inventory availability and pricing can change before booking confirmation.
- Final delivery depends on booking confirmation, creative approval, and screen/runtime readiness.
- Estimates are planning numbers, not guaranteed delivery.
- Average CPM is `total cost / estimated impressions * 1000`.
- Availability is represented as a 0-1 value in current frontend types:
  - `>= 0.7`: Available
  - `>= 0.3` and `< 0.7`: Limited
  - `< 0.3`: Unavailable

## Creative Rules

- Supported MVP file types: JPG, PNG, MP4.
- Current creative requirement utility and upload modal use 50 MB max per format.
- Recommended format mapping:
  - `Billboard`, `Transit`, `Mega Screen`: landscape 16:9, `1920 x 1080`
  - `Kiosk`, `Indoor`: portrait 9:16, `1080 x 1920`
  - `Street Furniture`: square 1:1, `1080 x 1080`
- Creative approval is a business gate for production launch, but the current self-service MVP path treats uploaded required formats as sufficient to proceed to booking confirmation in the draft helper path. Verify the exact flow before tightening this rule.

## Reporting Rules

- Verified Plays come from POP-style playback logs.
- Estimated Impressions are derived from venue footfall assumptions.
- Spend and average CPM are report-level calculations, not real billing in the current MVP.
- Report UI currently uses local mock report data.

## Programmatic DOOH Direction

The planned model is hybrid:

- Fixed Loop is the playback/commercial skeleton.
- Slot is the minimum sales/playback unit.
- Some Slots are direct-sold and guaranteed.
- Some Slots may be programmatic open/PMP.
- Fallback/house content must exist when programmatic demand does not fill.
- POP, pacing, creative approval, and reporting must stay aligned with the same Loop/Slot model.

Before changing programmatic behavior, read `docs/backend/programmatic-schema-design.md`.
