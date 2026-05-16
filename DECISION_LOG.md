# DOOH Product Decision Log

## D-008｜Flight dates define creative approval deadline and launch readiness urgency
- Decision: Flight dates are modeled at both campaign level (requested flight) and line-item level (actual active flight).
- Impact: Creative review deadlines and readiness urgency are computed from line-item earliest playback and active period alignment.

## D-009｜Pricing must support multiple price books and price snapshots
- Decision: Pricing uses explicit price book + rules + snapshot architecture, with sales/public/approval views separated.
- Impact: Support at least `self_service_msrp`, `sales_rate_card`, `vip_rate_card`, `agency_rate_card`, `seasonal_rate_card`, and `manual_override`.

## D-010｜Admin manages shared operational modules for Proposal and Self-service
- Decision: Admin console remains a shared operational surface for Proposal and Campaign Draft workflows.
- Impact: Inventory, pricing, creative, booking, launch readiness, and reporting tools are shared modules with source-aware context.

## D-011｜Creative Library supports independent asset review and replacement versioning
- Decision: Creative assets can be reviewed/approved independent from assignment.
- Impact: Replacement uploads create a new version and only become active after validation + approval flow.

## D-012｜Activity approval, creative asset review, and creative coverage are separate workflows
- Decision: Booking activity approval, creative asset review, and coverage checks are independent state machines.
- Impact: No single status can represent all three outcomes; launch readiness is derived.

