# Proposal + Self-Service Iteration — Implementation Note

## Current branch

- `codex/rmn-proposal-self-service`

## What was done in this phase

1. Repository context confirmed for Next.js + App Router + static export + hybrid Supabase/mock runtime.
2. Added baseline product decision/plan documentation required by this initiative:
   - `CHANGELOG.md`
   - `DECISION_LOG.md`
   - `01_DOOH_Product_Overview.md`
   - `02_Buying_Model_and_Workflows.md`
   - `03_Proposal_and_Booking_Flow.md`
   - `04_Creative_Requirements_and_Upload_Flow.md`
   - `06_Step_14_Backend_Schema_Plan.md`
   - `07_Step_15_API_Contract_Prompt.md`
3. Added shared trading-type definitions in `src/types/trading-models.ts` for Phase 2 enums and baseline data contracts.

## Constraint notes

- Existing runtime enums/types were intentionally left intact for now to avoid breaking current flows.
- No API, UI, or DB behavior was changed in this phase.

## Suggested next phase order

1. Lock shared service contracts (flight, pricing, creative requirements, launch readiness) against `trading-models.ts`.
2. Introduce non-invasive utility functions and unit tests first.
3. Add mock repositories for pricing/flight/coverage/launch-readiness tables not yet persisted.
4. Scaffold Admin / Proposal / Campaign Draft screens driven by the new contracts.
5. Connect real endpoints or existing service adapters in a backward-compatible way.
