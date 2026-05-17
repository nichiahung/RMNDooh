# Proposal and Booking Flow

## Proposal flow

1. Advertiser brief + line-item inventory selection.
2. Proposal versioning and pricing preview.
3. Proposal send and advertiser review.
4. Advertiser approves / comments / requests change.
5. Sales confirms booking from approved version.
6. Booking becomes the handoff point for scheduling/readiness checks.

## Booking derivation

- Proposal Draft is **not** booking.
- Proposal is **not** booking.
- Booking status is created from approved commercial intent and confirmation path, and carries booking-oriented checks.

## Readiness and restrictions

- Booking cannot be launched unless launch readiness checks pass.
- Creative and scheduling constraints are checked independently and combined in readiness derivation.

---

## 4. Relationship with Self-service Purchase

The platform supports two human-driven buying flows:

### 1. Self-service Purchase

- **Core object:** Campaign Draft
- **Primary user:** Advertiser
- Advertiser selects inventory directly.
- Advertiser sets flight dates directly.
- Advertiser sees MSRP / public self-service price.
- Advertiser uploads creatives before booking confirmation or before scheduling, depending on business rule.
- Advertiser confirms booking after required checks pass.

### 2. Sales-assisted Proposal

- **Core object:** Proposal
- **Primary user:** Sales / AM
- Sales creates proposal for advertiser review.
- Sales selects inventory package or recommended inventory.
- Sales sets pricing using sales rate card, VIP / agency price, discount, or manual adjustment.
- Advertiser reviews, comments, requests changes, or approves.
- Sales confirms booking after advertiser approval.
- Creative upload is usually requested after booking confirmation.

### Structural relationship

- Proposal and Self-service are **different frontend flows** but they share **operational backend modules**.
- Proposal does **not** replace Self-service.
- Self-service does **not** replace Proposal.
- Both are valid human-driven buying flows.
- Both converge into **Booking**.
- Both require **Creative Approval**.
- Both require **Launch Readiness** before schedule / live.
- Both should eventually support **Proof-of-Play** and **Reporting**.

### Shared backend modules

| Module | Used by Proposal | Used by Self-service |
|--------|:---:|:---:|
| Advertisers | ✓ | ✓ |
| Inventory | ✓ | ✓ |
| Screens | ✓ | ✓ |
| Inventory Packages | ✓ | ✓ |
| Pricing / Rate Cards | ✓ | ✓ |
| Flight Dates | ✓ | ✓ |
| Creative Requirements | ✓ | ✓ |
| Creative Library | ✓ | ✓ |
| Creative Review | ✓ | ✓ |
| Creative Coverage | ✓ | ✓ |
| Booking | ✓ | ✓ |
| Inventory Reservation | ✓ | ✓ |
| Launch Readiness | ✓ | ✓ |
| Reporting | ✓ | ✓ |
| Audit Logs | ✓ | ✓ |

---

## 4.1 Flow Comparison

| Area | Proposal | Self-service Purchase |
|---|---|---|
| Core object | Proposal | Campaign Draft |
| Primary user | Sales / AM | Advertiser |
| Who selects inventory | Sales | Advertiser |
| Who sees / controls pricing | Sales | Advertiser sees public price only |
| Pricing model | Sales rate, VIP rate, agency rate, negotiated price | MSRP / public self-service price |
| Creative requirement timing | Preview during proposal | Generated during inventory selection |
| Creative upload timing | Usually after booking confirmation | Before confirm booking or before scheduling |
| Booking trigger | Approved Proposal + Sales Confirm Booking | Advertiser Confirm Campaign / Confirm Booking |
| Inventory reservation | After Sales Confirm Booking | After advertiser confirmation |
| Change workflow | Proposal Versioning | Draft editing |
| Main status object | Proposal Status | Campaign Draft Status |
| Shared downstream object | Booking | Booking |
| Launch requirement | Creative approval + launch readiness | Creative approval + launch readiness |

---

## 4.2 Shared Backend Model

The backend must **not** duplicate inventory, pricing, creative, booking, or launch readiness logic for Proposal and Self-service.

### Architecture

```
Frontend flows:
├── Proposal Flow
└── Self-service Purchase Flow

Shared backend:
├── Inventory
├── Pricing
├── Creative Requirements
├── Creative Library
├── Creative Review
├── Creative Coverage
├── Booking
├── Reservation
├── Launch Readiness
├── Reporting
└── Audit Logs
```

### Data path — Proposal

```
Sales-assisted Proposal
→ Approved Proposal Version
→ Sales Confirm Booking
→ Booking
→ Inventory Reservation
→ Creative Upload Request
→ Creative Approval
→ Launch Readiness
→ Schedule / Live
```

### Data path — Self-service

```
Campaign Draft
→ Advertiser Confirm Campaign
→ Booking
→ Inventory Reservation
→ Creative Approval
→ Launch Readiness
→ Schedule / Live
```

### Both paths produce a Booking with a source field

```
booking_source:
  - proposal
  - self_service
  - manual_admin

campaign.buying_method:
  - sales_assisted
  - self_service
  - programmatic

campaign.source_type:
  - proposal
  - campaign_draft
  - manual_admin

campaign.source_id:
  - proposal_id or campaign_draft_id
```

---

## 4.3 Pricing Relationship

Self-service and Proposal use the **same pricing engine** but **different price books and visibility rules**.

### Self-service Purchase pricing

- Uses MSRP / public self-service price.
- Must **not** expose VIP price, sales rate, internal floor price, or margin.
- Pricing is standardized and usually non-negotiated.
- Price is estimated before booking confirmation.
- Final price is locked into a **pricing snapshot** when booking is confirmed.

### Proposal pricing

- Uses Sales Rate Card, VIP Rate Card, Agency Rate Card, or negotiated price.
- Sales can apply discount or manual adjustment if authorized.
- If price is below floor price or exceeds discount threshold, **pricing approval** is required.
- Advertiser Review shows **final quote and client-facing pricing only**.
- Internal pricing details (floor price, margin, rate card internals) must **not** be exposed to advertiser.
- Approved Proposal Version must store an **immutable pricing snapshot**.
- Booking must store a **final locked pricing snapshot**.

### Shared pricing rule

> Self-service and Proposal use the same pricing engine but different price books and visibility rules.

---

## 4.4 Creative Relationship

### Self-service creative flow

- Creative Requirements are generated after advertiser selects inventory.
- Advertiser can upload creative inside the Campaign Draft flow.
- Confirm Booking should be disabled if required creative is missing, invalid, pending review, or rejected — unless the business explicitly allows pending booking.
- Missing creative blocks launch readiness.
- Partial upload means partial location coverage.

### Proposal creative flow

- Creative Requirements are generated from selected Proposal inventory.
- Proposal Review shows **Creative Requirements Preview only**.
- Advertiser can approve Proposal **without uploading creative**.
- Sales Confirm Booking triggers **Creative Upload Request**.
- Booking can be confirmed **before** creative approval.
- Campaign cannot schedule or go live until required creative is uploaded and approved.

### Shared creative rules

- **Creative Asset Review** is independent from activity approval (proposal approval or campaign draft confirmation).
- **Creative Coverage** determines whether approved assets satisfy all selected inventory requirements.
- **Launch Readiness** determines whether the campaign or line item can actually schedule / live.

---

## 4.5 Flight Date Relationship

Both Proposal and Self-service support flight dates.

### Shared flight rules

- There is a **campaign-level requested flight** (user intent).
- Each inventory line item may have its own **actual active flight**.
- Different selected inventory may have different active days.
- Price and impressions must be calculated from **line-item active days**.
- Creative approval deadline should be based on **earliest playback date**.

### Proposal-specific flight rules

- Sales can include line items with **partial flight**.
- Mixed flight should be clearly visible in Proposal Review.
- Advertiser can request changes if partial flight is unacceptable.

### Self-service-specific flight rules

- UI must warn advertiser when selected inventory only partially matches requested flight.
- User should acknowledge partial flight before confirming campaign.
- If an inventory item has **no available flight overlap**, it should not be confirmable.

---

## 4.6 Admin Relationship

Admin Operations Console manages **shared modules**, not separate backend products.

### Admin manages

- Proposal Management
- Campaign Draft Management
- Booking Management
- Inventory Management
- Pricing & Rate Cards
- Creative Library
- Creative Review
- Creative Coverage
- Launch Readiness
- Reporting
- Audit Logs

### Admin design principle

Admin must **not** treat Proposal and Self-service as separate backend systems.

Instead:
- Proposal and Self-service are different **sources**.
- Booking is shared downstream.
- Creative Review is shared.
- Launch Readiness is shared.
- Reporting is shared.

---

## 4.7 User Stories Connecting Proposal and Self-service

**US-X1: Compare buying method**
As an admin, I want to see whether a campaign came from Proposal or Self-service, so that I can understand its commercial workflow and required next action.

**US-X2: Shared booking management**
As an operator, I want Bookings from Proposal and Self-service to appear in the same Booking queue, so that I can manage inventory reservation consistently.

**US-X3: Shared creative review**
As a creative reviewer, I want creatives from Proposal bookings and Self-service drafts to appear in the same Creative Review queue, so that I can review assets consistently.

**US-X4: Shared launch readiness**
As an operator, I want Launch Readiness to use the same checks regardless of whether the campaign came from Proposal or Self-service, so that schedule / live decisions are consistent.

**US-X5: Buying method-specific pricing**
As a sales user, I want Proposal pricing to use sales / VIP rate cards, while Self-service uses MSRP, so that we can support both standard public pricing and negotiated sales pricing.

**US-X6: Source-aware reporting**
As an admin, I want reports to show `booking_source` and `buying_method`, so that I can compare Proposal performance and Self-service performance.

---

## 4.8 Acceptance Criteria Additions

- [ ] PRD explains how Proposal differs from Self-service Purchase.
- [ ] PRD explains that Proposal and Self-service share downstream Booking.
- [ ] PRD defines `booking_source` and `buying_method`.
- [ ] PRD explains that Pricing is shared but price books differ by buying method.
- [ ] PRD explains that Creative Requirements are shared but timing differs by buying method.
- [ ] PRD explains that Creative Review is independent from Proposal approval and Campaign Draft confirmation.
- [ ] PRD explains that Launch Readiness applies to both Proposal and Self-service.
- [ ] PRD explains that Admin manages shared modules across both flows.
- [ ] PRD includes a Proposal vs Self-service comparison table.
- [ ] PRD includes user stories for cross-flow Admin, Booking, Creative Review, and Launch Readiness.
