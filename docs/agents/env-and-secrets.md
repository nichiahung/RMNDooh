# Environment And Secrets

## Required Local Runtime

- Node.js 20+ recommended.
- Package manager: npm.
- App framework: Next.js 16 with App Router and static export.

Common commands:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

## Supabase Environment Variables

Required for Supabase-backed flows:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Used by:

- `src/lib/supabase.ts`
- inventory loading
- campaign submission
- creative upload
- admin dashboard fetch/update helpers
- campaign draft helper functions

## Behavior Without Supabase Env

If env vars are missing:

- `createClient()` receives undefined values.
- Supabase-backed fetches/actions may fail at runtime.
- Planner inventory may appear empty.
- Admin tables may appear empty.
- Upload/submission can fail.

Do not report this as a UI bug until env and seed data are checked.

## Current Supabase Assumptions

Expected tables/buckets from code and backend docs include:

- `inventory_locations`
- `campaigns`
- `campaign_inventory_items`
- `media_assets`
- `creative_assets`
- `campaign_creative_requirements`
- `campaign_bookings`
- `screens`
- Storage bucket: `creative-assets`

The code uses fixed MVP IDs for advertiser and user:

```text
advertiser_id = aaaaaaaa-0000-0000-0000-000000000001
created_by_user_id / uploaded_by_user_id = 00000000-0000-0000-0000-000000000002
```

These rows must exist in seeded data for write flows to work.

## Public Static Export

Production build uses:

- base path: `/RMNDooh`
- asset prefix: `/RMNDooh/`
- output directory: `out`

Local dev routes do not include `/RMNDooh`.

## Secret Handling Rules

- Do not commit `.env.local`.
- Do not paste real Supabase keys into docs.
- Use `NEXT_PUBLIC_*` only for client-safe anon values.
- Do not introduce service-role keys into the browser app.
- If backend/admin privileged actions are required, document the need for a server-side boundary instead of putting secrets in Next client code.
