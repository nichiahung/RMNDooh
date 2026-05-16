# Step 15 API Contract Prompt (Iteration)

## Contract-first APIs to implement

### Pricing
- `GET /admin/price-books`
- `POST /admin/price-books`
- `GET /admin/price-books/:id`
- `PATCH /admin/price-books/:id`
- `GET /admin/price-book-items`
- `POST /admin/price-book-items`
- `POST /pricing/estimate`
- `POST /pricing/snapshot`
- `POST /pricing/approval-requests`
- `POST /pricing/approval-requests/:id/approve`
- `POST /pricing/approval-requests/:id/reject`

### Flight
- `POST /inventory/availability/check`
- `POST /inventory/line-items/flight/compare`
- `POST /campaign-drafts/:id/recalculate-flight`
- `POST /proposals/:id/recalculate-flight`

### Campaign Draft
- `POST /campaign-drafts`
- `PATCH /campaign-drafts/:id`
- `POST /campaign-drafts/:id/select-inventory`
- `POST /campaign-drafts/:id/generate-creative-requirements`
- `POST /campaign-drafts/:id/estimate-price`
- `POST /campaign-drafts/:id/confirm-booking`

### Proposal
- `POST /proposals`
- `POST /proposals/:id/versions`
- `POST /proposals/:id/generate-creative-requirements`
- `POST /proposals/:id/estimate-price`
- `POST /proposals/:id/send-to-advertiser`
- `POST /proposals/:id/approve`
- `POST /proposals/:id/confirm-booking`

### Creative / Coverage / Readiness
- Creative Library endpoints (`/creative-library/*`, `/creative-review/*`)
- Creative coverage endpoints (`/campaigns/:id/creative-coverage`, `/creative-requirements/:id/coverage`)
- Launch readiness endpoints (`/campaigns/:id/launch-readiness`, `/campaigns/:id/launch-readiness/check`, `/campaigns/:id/schedule`)

## Security/model rules

- Advertiser-facing output must hide floor/internal approval data.
- Sales views show final quote + rate-book exposure according to authorization.

