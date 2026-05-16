# Data Contracts

This file summarizes the practical contracts agents must preserve.

## Naming Conventions

Frontend TypeScript uses camelCase.

Supabase rows use snake_case.

Mapping belongs in API helper files, not scattered through UI components.

Examples:

| Frontend | Supabase |
| --- | --- |
| `dailyImpressions` | `daily_impressions` |
| `pricePerDay` | `price_per_day` |
| `audienceTags` | `audience_tags` |
| `screenType` | `screen_type` |
| `venueType` | `venue_type` |
| `bookingStatus` | `booking_status` |
| `creativeStatus` | `creative_status` |
| `launchReadiness` | `launch_readiness` |

## InventoryLocation Contract

Frontend shape is defined in `src/types/inventory.ts`.

Required business fields:

- `id`
- `name`
- `city`
- `district`
- `address`
- `latitude`
- `longitude`
- `venueType`
- `screenType`
- `dailyImpressions`
- `cpm`
- `pricePerDay`
- `availability`
- `audienceTags`
- `imageUrl`
- `description`
- `dna`

If Supabase `dna` is missing, `fetchInventoryLocations()` supplies a fallback DNA structure. Preserve this fallback unless all seed data is guaranteed complete.

## MediaPlanItem Contract

```ts
interface MediaPlanItem {
  inventoryId: string;
  days: number;
}
```

Business rules:

- No duplicate `inventoryId` in one Media Plan.
- Default `days` is 7.
- `days` must behave as at least 1 in calculations.

## Campaign Status Models

There are multiple active/planned status models. Do not merge them casually.

General Campaign UI status:

```text
draft, pending_review, approved, rejected, scheduled, live, completed
```

Step 15 three-status model:

```text
booking_status
creative_status
launch_readiness
```

Campaign draft lifecycle:

```text
draft
pending_creative_review
blocked_by_creative
ready_to_book
cancelled
```

Business meaning:

- `campaigns.booking_status` answers where the campaign is in the booking workflow.
- `campaign_bookings.booking_status` answers whether a formal commercial booking record is confirmed or cancelled.
- Creative status answers whether creative assets are acceptable.
- Launch readiness is computed from prerequisites.
- Draft lifecycle is the self-service workflow state.

Booking boundary:

- Advertiser submit writes `campaigns.booking_status = pending_confirmation`.
- Advertiser submit must not insert into `campaign_bookings`.
- Admin confirm writes `campaign_bookings.booking_status = confirmed` and `campaigns.booking_status = confirmed`.
- `campaign_bookings.booking_status` currently allows only `confirmed | cancelled`.

Before changing statuses, update tests and docs together.

## Creative Requirement Contract

Canonical formats are defined in `src/types/creative.ts` and implemented in `src/utils/creativeRequirements.ts`.

Current mappings:

| Format | Screens | Dimensions |
| --- | --- | --- |
| `landscape_16_9` | Billboard, Transit, Mega Screen | 1920 x 1080 |
| `portrait_9_16` | Kiosk, Indoor | 1080 x 1920 |
| `square_1_1` | Street Furniture | 1080 x 1080 |
| `ultra_wide` | none currently mapped | 3840 x 1280 |

Accepted MIME types:

- `image/jpeg`
- `image/png`
- `video/mp4`

Current validation max size:

- 50 MB in `FORMAT_SPECS`

Current upload behavior:

- `CreativeUploadModal` validates a selected file against the target `FormatSpec`.
- Valid files are uploaded through `uploadCreativeAsset()`.
- Uploaded media assets are linked to `campaign_creative_requirements` through `uploadAssetToRequirement()`.
- UI readiness is currently tracked by uploaded canonical formats in the planner/review components.

## Report Data Contract

Reports currently consume `CampaignReport` from mock data.

Key fields:

- `totalPlays`
- `completedPlays`
- `failedPlays`
- `estimatedImpressionsDelivered`
- `budgetSpent`
- `dailyDelivery`
- `locationDelivery`
- `creativeDelivery`
- `recentPoPLogs`

Do not wire live reporting without defining how POP logs, estimated impressions, and spend are joined.

## Player Contract

Player route depends on statically known screen IDs.

`Screen` requires:

- `screenId`
- `inventoryLocationId`
- `screenName`
- `status`
- `lastHeartbeatAt`
- `resolution`
- `orientation`

`PlaylistItem` duration controls playback loop timing.

`ProofOfPlayLog` is local in the player MVP and includes playback status plus device status.
