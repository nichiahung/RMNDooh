# Sales-Assisted Buying — Proposal Draft & Versioning

> **Status:** Draft spec. Pending brainstorming review before implementation.

## Overview

Sales-assisted buying uses a **Proposal** as the core commercial object. The flow:

1. Sales creates a Proposal (directly, or optionally from a Brief)
2. Sales saves draft internally
3. Sales sends Proposal to advertiser for review
4. Advertiser comments, requests changes, or approves
5. Material changes create a new Proposal Version
6. Approved Proposal Version triggers booking confirmation
7. Creative upload is requested after booking confirmation

---

## Key Rules

- **Proposal Draft is not a booking.** No inventory reservation.
- **Brief is optional.** Sales can create a Proposal without a Brief.
- **Advertiser cannot edit** final pricing, discount, or inventory reservation directly.
- **Material changes create a new version.** Minor edits (typos, notes) do not.
- **Only the approved version** can be used to confirm booking.
- **Sales confirms booking** — this is the action that reserves inventory.
- **Creative upload after booking.** Campaign cannot go live until all creatives are uploaded, valid, and approved.
- **Creative Requirement Preview** is shown on the Proposal review page so advertiser understands format requirements before approval.

---

## Proposal Status State Machine

```
draft                        (sales is editing, not yet sent)
  → sent_for_review          (advertiser can now see it)
  → changes_requested        (advertiser requested edits)
  → approved                 (advertiser approved this version)
  → superseded               (a new version was created)
  → booking_confirmed        (sales confirmed booking on this version)
  → cancelled
```

---

## Proposal Versioning

- Each Proposal has a `version` number starting at `1`.
- A new version is created when Sales makes material changes after sending.
- The previous version transitions to `superseded`.
- Only one version can be in `approved` state at a time.
- Advertiser approval is version-specific — approving v1 does not auto-approve v2.

**What counts as a material change:**
- Adding/removing inventory items
- Changing pricing or discount
- Changing campaign dates
- Changing the objective or targeting

**What does NOT create a new version:**
- Updating internal notes
- Fixing typos in the proposal description

---

## Proposal Review Page — Creative Requirement Preview

The advertiser's proposal review page should include a read-only section:

> **Creative Formats Required**
> Based on this proposal's inventory selection, you will need to provide:
> - 橫式 16:9 (1920×1080) — used by 3 locations
> - 直式 9:16 (1080×1920) — used by 2 locations

This is derived from `GET /proposals/:id/creative-requirements` (preview-only, not uploaded yet).

---

## API Endpoints (Proposed)

### Proposal CRUD

| Method | Path | Description |
|---|---|---|
| `POST` | `/proposals` | Create new proposal draft (optionally linked to brief) |
| `GET` | `/proposals/:id` | Get proposal with current version |
| `PATCH` | `/proposals/:id` | Update draft (before sending) |
| `POST` | `/proposals/:id/save-draft` | Explicit save checkpoint |

### Versioning & Review Flow

| Method | Path | Description |
|---|---|---|
| `POST` | `/proposals/:id/send` | Send to advertiser (transitions to sent_for_review) |
| `POST` | `/proposals/:id/request-changes` | Advertiser requests changes |
| `POST` | `/proposals/:id/approve` | Advertiser approves this version |
| `POST` | `/proposals/:id/new-version` | Sales creates new version (material change) |

### Inventory

| Method | Path | Description |
|---|---|---|
| `POST` | `/proposals/:id/inventory-items` | Add inventory to proposal |
| `DELETE` | `/proposals/:id/inventory-items/:itemId` | Remove inventory |

### Creative Requirements Preview

| Method | Path | Description |
|---|---|---|
| `GET` | `/proposals/:id/creative-requirements` | Preview required formats (read-only, no upload) |

### Booking

| Method | Path | Description |
|---|---|---|
| `GET` | `/proposals/:id/booking-readiness` | Check conditions before confirming |
| `POST` | `/proposals/:id/confirm-booking` | Sales confirms booking, reserves inventory |

---

## Relationship to Campaign

When Sales confirms booking on a Proposal:
- A `Campaign` record is created (or linked)
- The Campaign inherits inventory from the approved Proposal
- Creative upload begins against the Campaign's creative requirements
- Campaign cannot go live until all creatives are approved

---

## Open Questions (for brainstorming)

1. Is the Proposal the parent of the Campaign, or do they stay as separate objects linked by a foreign key?
2. Who can call `approve` — any advertiser user, or only a specific contact on the proposal?
3. What triggers the `superseded` transition — is it automatic when `new-version` is called, or manual?
4. Should minor edits (notes/typos) on a `sent_for_review` proposal require a new version, or can they be patched in place?
5. How does the Brief → Proposal flow work — does creating from a Brief copy inventory/pricing, or just metadata?
6. Is there a proposal expiration (e.g., valid for 30 days)?
7. Can an advertiser approve via email link (without logging in), or is full auth required?
