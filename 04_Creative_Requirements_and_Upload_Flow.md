# Creative Requirements and Upload Flow

## Principle

Creative requirements are generated from selected inventory and grouped by required specs.

## Upload rules

- Uploads must target a specific requirement.
- Generic uploads without requirement target are rejected by default policy.
- Partial uploads only satisfy partial coverage, never full-line readiness.

## Coverage model

- A location/line-item is launch-ready only when all required requirements for that line item are approved and effective.
- Missing/invalid/rejected requirement assets block launch readiness for affected line items.

## Creative Library and replacement

- Assets can be reviewed in Creative Library independently from assignment.
- New replacement generates new version and must pass validation + review before playback switch.
- Previously approved versions remain active until replacement becomes approved.

