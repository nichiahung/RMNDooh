# Self-Service Booking — Campaign Draft Lifecycle

> **Status:** Draft spec. Pending brainstorming review before implementation.

## Overview

Self-service advertisers can build a campaign incrementally:
1. Select inventory
2. Generate creative requirements
3. Save as draft (no inventory reservation)
4. Return later to continue editing
5. Upload creatives against required formats
6. Submit creatives for review
7. Confirm booking only after all checks pass

---

## Key Rules

- **Campaign Draft is not a confirmed booking.** It does not reserve inventory.
- **Availability and pricing may change** between draft creation and booking confirmation.
- **Confirm Booking is disabled** until all required creatives are uploaded, valid, and approved.
- **Blocked state:** If a creative is rejected, campaign becomes `blocked_by_creative` until a replacement is approved.
- **Draft lifecycle:** Can be cancelled or abandoned at any time.
- **Future feature (optional):** Soft inventory hold with expiration timer.

---

## Campaign Status State Machine

```
draft
  → pending_creative_review   (after submit-creatives-for-review)
  → blocked_by_creative       (if any creative is rejected)
  → ready_to_book             (all creatives approved)
  → confirmed                 (after confirm-booking)
  → cancelled
```

---

## API Endpoints

### Campaign CRUD

| Method | Path | Description |
|---|---|---|
| `POST` | `/campaigns` | Create new campaign draft |
| `GET` | `/campaigns/:id` | Get campaign details |
| `PATCH` | `/campaigns/:id` | Update campaign metadata (name, dates, objective) |
| `POST` | `/campaigns/:id/save-draft` | Explicit save checkpoint |

### Inventory Items

| Method | Path | Description |
|---|---|---|
| `POST` | `/campaigns/:id/inventory-items` | Add inventory location to campaign |
| `DELETE` | `/campaigns/:id/inventory-items/:itemId` | Remove inventory location |

### Creative Requirements

| Method | Path | Description |
|---|---|---|
| `GET` | `/campaigns/:id/creative-requirements` | Get current requirements (derived or saved) |
| `POST` | `/campaigns/:id/creative-requirements/generate` | (Re)generate requirements from current inventory |

### Creative Upload & Review

| Method | Path | Description |
|---|---|---|
| `POST` | `/creative-requirements/:requirementId/assets` | Upload asset for a specific format requirement |
| `POST` | `/campaigns/:id/submit-creatives-for-review` | Submit all uploaded creatives for admin review |

### Booking

| Method | Path | Description |
|---|---|---|
| `GET` | `/campaigns/:id/launch-readiness` | Check all conditions before booking confirmation |
| `POST` | `/campaigns/:id/confirm-booking` | Confirm booking (requires launch-readiness pass) |

---

## Launch Readiness Checks (`GET /campaigns/:id/launch-readiness`)

Response should indicate pass/fail for each condition:

```json
{
  "ready": false,
  "checks": {
    "hasInventory": true,
    "allCreativesUploaded": true,
    "allCreativesApproved": false,
    "noPendingReview": false
  }
}
```

`confirm-booking` should return 422 if `ready: false`.

---

## Open Questions (for brainstorming)

1. Should `POST /campaigns` create an empty draft, or accept initial inventory in the body?
2. How does `generate` differ from `GET` creative-requirements — does generating overwrite manual edits?
3. Does `save-draft` do anything distinct from `PATCH`, or is it a UI-only concept?
4. What triggers transition from `pending_creative_review` → `blocked_by_creative` vs `ready_to_book`?
5. How is the soft inventory hold (future) modelled — separate endpoint or flag on confirm-booking?
6. Does cancelling a `confirmed` booking free inventory immediately?
