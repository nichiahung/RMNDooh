# DOOH Product Overview

## Scope

This iteration introduces a shared product layer for sales-assisted Proposal and self-service Campaign Draft flows with explicit boundaries:

- **Proposal**: core commercial object for sales-assisted buying.
- **Campaign Draft**: core object for self-service buying.
- **Booking**: generated from approved Proposal confirmation or eligible self-service confirmation.

## Core concepts

- Proposal and campaign draft stay as separate domain objects.
- Booking is a distinct stateful artifact and is not interchangeable with either Proposal Draft or Campaign Draft.
- Inventory line items carry explicit flight periods; campaign-level requested flight remains a user intent surface only.

## Operational intent

The next iteration keeps existing DOOH MVP architecture and adds shared modules for:

- Pricing (multi-price-book + snapshot)
- Flight/date model (campaign requested + line-item actual)
- Creative requirements and independent review
- Coverage checks per requirement/location
- Launch readiness derived from booking/inventory/creative/playlist/policy/payment/schedule checks

