# Campaign Draft — Self-Service Booking Design Spec

## Overview

Self-service advertisers can build a campaign incrementally through the planner UI, save progress as a draft at any point, and confirm booking only after all creative requirements are met. Campaign and booking are modelled as separate objects: Campaign holds the plan and creative lifecycle; CampaignBooking is the financial confirmation record.

---

## Scope

- **Frontend:** Already implemented (creative upload step, inventory selection). This spec covers backend API and data model only.
- **Phase:** MVP mock data → real Supabase integration.
- **Out of scope:** Self-service cancellation of confirmed bookings (manual handling only). Soft inventory hold. Brief-to-campaign flow (covered in Proposal spec).

---

## Data Model

### Campaign

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `advertiser_id` | uuid | FK → advertisers |
| `name` | string | Default: `"Unnamed Campaign"` |
| `objective` | string | Nullable |
| `start_date` / `end_date` | date | Nullable until booking confirmed |
| `status` | enum | See state machine below |
| `created_at` / `updated_at` | timestamptz | |

**Campaign status enum:** `draft` · `pending_creative_review` · `blocked_by_creative` · `ready_to_book` · `cancelled`

### CampaignInventoryItem

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `campaign_id` | uuid | FK → campaigns |
| `inventory_location_id` | uuid | FK → inventory_locations |
| `days` | integer | Booked duration |
| `price_per_day_snapshot` | numeric | Price at time of item creation |

### CampaignCreativeRequirement

Snapshot of required canonical formats — created when advertiser submits creatives for review. One row per canonical format required by the campaign's inventory.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `campaign_id` | uuid | FK → campaigns |
| `canonical_format` | enum | `landscape_16_9` · `portrait_9_16` · `square_1_1` · `ultra_wide` |
| `status` | enum | `pending_upload` · `uploaded` · `approved` · `rejected` |
| `media_asset_id` | uuid | FK → media_assets, nullable until uploaded |
| `reviewed_by` | uuid | FK → admin users, nullable |
| `reviewed_at` | timestamptz | Nullable |
| `rejection_reason` | string | Nullable |

### CampaignBooking

Created once, at `confirm-booking`. 1:1 with Campaign.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `campaign_id` | uuid | FK → campaigns, UNIQUE |
| `confirmed_at` | timestamptz | |
| `total_amount` | numeric | Sum of (price_per_day_snapshot × days) across all inventory items |
| `booking_status` | enum | `confirmed` · `cancelled` |

---

## Campaign Status State Machine

```
draft
  ├─→ pending_creative_review   POST /campaigns/:id/submit-creatives-for-review
  └─→ cancelled                 advertiser or admin action

pending_creative_review
  ├─→ blocked_by_creative       admin rejects any creative requirement
  ├─→ ready_to_book             admin approves all creative requirements
  └─→ pending_creative_review   advertiser re-submits (resets snapshot)

blocked_by_creative
  ├─→ pending_creative_review   auto-trigger: all requirements replaced with new uploads
  └─→ cancelled

ready_to_book
  ├─→ ready_to_book (unchanged)  POST /campaigns/:id/confirm-booking → creates CampaignBooking
  └─→ cancelled
```

Note: `campaign.status` stays `ready_to_book` after booking confirmation. Whether the booking itself is confirmed is tracked in `CampaignBooking.booking_status`, not in the campaign.

Note: `cancelled` is a terminal state. All operations on a cancelled campaign return `410 Gone`.

---

## API Endpoints

### Campaign CRUD

**`POST /campaigns`**
- Body: `{}` (empty — name auto-generated)
- Response: `201 { id, name, status: "draft", created_at }`
- Creates Campaign with `status: draft`, `name: "Unnamed Campaign"`

**`GET /campaigns/:id`**
- Response: Campaign with nested inventory items and (if exists) booking

**`PATCH /campaigns/:id`** (also aliased as `POST /campaigns/:id/save-draft`)
- `save-draft` is a semantic alias for PATCH — same handler, same behaviour. Frontend uses it to trigger a "Saving…" indicator without any different backend logic.
- Body: any subset of `{ name, objective, start_date, end_date }`
- Allowed in `draft` status only (returns `422` otherwise for date/objective fields)
- `name` can be updated in any non-cancelled status

### Inventory Items

**`POST /campaigns/:id/inventory-items`**
- Body: `{ inventory_location_id, days }`
- Snapshots `price_per_day` from inventory_locations at time of call
- Allowed in `draft` status

**`DELETE /campaigns/:id/inventory-items/:itemId`**
- Allowed in `draft` status

### Creative Requirements (derived, not stored)

**`GET /campaigns/:id/creative-requirements`**
- Derives canonical formats from current `CampaignInventoryItem` list in real time
- Does NOT read from `CampaignCreativeRequirement` table
- Response: `[{ format, label, dimensions, venueCount }]`
- Used by frontend to show upload zones before submission

### Creative Submission

**`POST /campaigns/:id/submit-creatives-for-review`**
- Requires at least one inventory item (`422 no_inventory` otherwise)
- Allowed in `draft` or `blocked_by_creative` status
- Deletes existing `CampaignCreativeRequirement` rows for this campaign
- Creates new rows (one per derived canonical format) with `status: pending_upload`
- Transitions campaign to `pending_creative_review`
- Response: `200 { requirements: [{ id, canonical_format, status }] }`

**`POST /creative-requirements/:requirementId/assets`**
- Body: multipart/form-data with file
- Validates MIME type and size (A-level, same rules as frontend)
- Uploads to Supabase Storage, creates media_asset record
- Sets `requirement.status → uploaded`, links `media_asset_id`
- **Auto-trigger check:** if `campaign.status === blocked_by_creative` AND all requirements for this campaign are now `uploaded` → transition campaign to `pending_creative_review`
- Response: `200 { requirementId, status: "uploaded", mediaAssetId }`

### Launch Readiness

**`GET /campaigns/:id/launch-readiness`**
- Response:
```json
{
  "ready": false,
  "checks": {
    "hasInventory": true,
    "allCreativesApproved": false,
    "noPendingReview": false
  }
}
```
- `ready: true` only when all checks pass

### Booking Confirmation

**`POST /campaigns/:id/confirm-booking`**
- Returns `422 booking_not_ready` if `launch-readiness.ready === false`
- Returns `409 booking_already_exists` if CampaignBooking already exists for this campaign
- Creates `CampaignBooking { confirmed_at: now(), total_amount: sum(snapshot × days), booking_status: "confirmed" }`
- Does NOT change `campaign.status` (status is `ready_to_book` before and after — booking is tracked in CampaignBooking)
- Response: `201 { bookingId, confirmedAt, totalAmount }`

---

## Admin Creative Review (backend-triggered transitions)

These transitions are triggered by admin approval/rejection actions (not part of this spec — covered in admin panel spec):

**Approve requirement:**
- `requirement.status → approved`
- If ALL requirements for this campaign are now `approved` → `campaign.status → ready_to_book`

**Reject requirement:**
- `requirement.status → rejected`
- `campaign.status → blocked_by_creative`

---

## Error Reference

| Status | Code | Trigger |
|---|---|---|
| 422 | `booking_not_ready` | `confirm-booking` when launch-readiness fails |
| 422 | `no_inventory` | `submit-creatives-for-review` with no inventory items |
| 422 | `already_submitted` | `submit-creatives-for-review` when status is already `pending_creative_review` |
| 422 | `requirement_already_approved` | Uploading asset to an `approved` requirement |
| 409 | `booking_already_exists` | `confirm-booking` when CampaignBooking already exists |
| 410 | `campaign_cancelled` | Any mutation on a cancelled campaign |

---

## Edge Cases

- **Inventory changes after submit:** Allowed in `draft`. Adding/removing inventory in `draft` after a previous submit does not auto-update the existing requirement snapshot. Advertiser must call `submit-creatives-for-review` again to refresh snapshot.
- **Re-submit:** `submit-creatives-for-review` replaces the existing snapshot. Status resets to `pending_creative_review`. Previously uploaded assets are unlinked from requirements (but media_asset records remain in storage).
- **Price drift:** `price_per_day_snapshot` is fixed at item-creation time. Frontend should warn if dates change significantly after items are added.
- **Confirmed booking cancellation:** Not self-service in MVP. Requires manual handling by support team.
