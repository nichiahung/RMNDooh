# Testing Playbook

Use this before claiming a change is complete.

## Baseline Checks

Run after most code changes:

```bash
npm run lint
npm run test
npm run build
```

For docs-only changes:

```bash
git diff --check
```

## Campaign Planner Verification

Verify on desktop and mobile when changing planner UI:

- `/campaign-planner` loads without console/runtime errors.
- Search filters by location name, district, or address.
- City/district filters combine correctly.
- Venue type, screen type, audience, budget, impressions, and availability filters work together.
- List/Map toggle remains usable.
- Inventory detail modal opens and closes.
- Add to Plan prevents duplicate items.
- Media Plan totals update when days change.
- Continue/review action is disabled until at least one location is selected.
- Media Plan shows requirements derived from selected screen types.
- Format upload modal validates file type and 50 MB max size.
- Review step shows selected locations, budget, impressions, and required creative format status.
- Submit/booking action is disabled until all required creative formats are uploaded.
- Draft creation, inventory-item persistence, requirement creation, upload link, and confirm booking are tested with valid Supabase env/seed data if the change touches submit behavior.

## Admin Verification

Verify `/admin` when changing admin or Supabase helper code:

- Overview totals render.
- Campaign tab can search/filter and open details.
- Campaign detail panel shows selected inventory and creatives.
- Approve/reject actions update local UI after Supabase returns.
- Confirm booking refetches campaigns.
- Creative Review approve/reject updates creative status.
- Inventory table renders fetched locations.
- Screens table renders heartbeat/status values.

## Reports Verification

Verify `/reports` when changing reports:

- Campaign selector changes report content.
- Date range filter changes filtered report where applicable.
- KPI cards match selected report data.
- Delivery trend chart renders.
- Delivery by Location and Delivery by Creative tables render.
- POP logs table renders.
- Export CSV downloads a CSV with POP fields.

## Player Verification

Verify `/player/SCR-1000` or another generated screen ID:

- Valid screen route renders the player.
- Unknown screen ID renders Screen Not Found.
- Playlist advances by item duration.
- `Shift + D` toggles debug panel.
- POP logs show started/completed playback events.
- Heartbeat appears in browser console every 10 seconds.

## i18n Verification

When changing visible text:

- Update English and Traditional Chinese dictionaries if the text is in both experiences.
- Check `src/i18n/filterLabels.ts` for option labels.
- Verify no mixed English/Traditional Chinese strings remain in the target flow unless intended.
- Verify labels fit on mobile.

## Business Calculation Verification

When changing estimate logic:

- Budget = sum of `pricePerDay * days`.
- Estimated impressions = sum of `dailyImpressions * days`.
- Average CPM = `totalBudget / totalImpressions * 1000`.
- Empty selections return zero totals and disabled next actions.
- Availability labels follow current thresholds from `inventoryFilters.ts`.

## Supabase Flow Verification

When touching Supabase-backed behavior:

- Check env vars exist.
- Confirm expected seed rows exist for default advertiser/user.
- Confirm storage bucket exists before testing creative upload.
- Test both success and failure messaging.
- Do not treat empty returned arrays as success until the expected table contents are verified.
