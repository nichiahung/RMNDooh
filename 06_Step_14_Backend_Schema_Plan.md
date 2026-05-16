# Step 14 Backend Schema Plan (Iteration Baseline)

This document defines the schema additions required for the shared Proposal + Self-service iteration.

## New shared enums

- `BuyingMethod`: `self_service` | `sales_assisted` | `programmatic`
- `BookingSource`: `proposal` | `self_service` | `manual_admin`
- `ProposalStatus`
- `CampaignDraftStatus`
- `BookingStatus`
- `CreativeAssetStatus`
- `CreativeRequirementStatus`
- `CreativeUploadRequestStatus`
- `LaunchReadinessStatus`
- `DateMatchStatus`
- `PriceBookType`
- `PriceVisibility`
- `PricingApprovalStatus`

## Pricing tables to add

- `price_books`
- `price_book_items`
- `pricing_rules`
- `advertiser_price_agreements`
- `pricing_approval_requests`
- `pricing_snapshots`

## Campaign/proposal line-item flight fields

- `requested_start_date`, `requested_end_date`, `requested_days`, `timezone`
- per-inventory fields: `line_item_start_date`, `line_item_end_date`, `active_days`, `date_match_status`, `availability_status`, `price_for_active_days`, `estimated_impressions_for_active_days`, `creative_due_at`, `earliest_playback_at`

## Creative tables

- `creative_assets` (versioned root with approval/validation/active status)
- `creative_asset_versions` (when replacing, preserve old approved version until new approved)
- `creative_requirement_assets` (requirement-to-asset linking and effective dates)

## Note

If persistence is not yet safe, implement these as TypeScript contracts + mock repositories first, then migrate to SQL in phases.

