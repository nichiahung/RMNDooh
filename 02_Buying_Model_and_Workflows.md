# Buying Model and Workflows

## Buying methods

- `self_service`: self-service campaign draft and confirmation path.
- `sales_assisted`: sales-assisted Proposal flow.
- `programmatic`: future module, intentionally out of this iteration scope.

## Shared model boundary

- A **Proposal** is created by sales, and can evolve independently from a Campaign Draft.
- A **Campaign Draft** is created by advertiser self-service users, and can be confirmed independently.
- A **Booking** is derived from either:
  - approved Proposal + sales confirm path, or
  - eligible self-service Campaign Draft confirmation.

## Workflow states (separate)

- Booking status
- Creative approval status
- Launch readiness status

These must remain independent to avoid coupling activity approval with creative completion.

