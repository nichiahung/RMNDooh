# Campaign Draft — Self-Service Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Campaign Draft lifecycle backend — DB schema, TypeScript API functions, state machine logic, and frontend wiring — so advertisers can save drafts, submit creatives for review, and confirm bookings.

**Architecture:** This project uses Next.js static export; there is no API server. "Backend" means Supabase client calls from the browser wrapped in `src/lib/api/` TypeScript functions. The DB schema is defined as SQL migrations. State machine transition logic is extracted into pure functions so it can be unit-tested without hitting Supabase.

**Tech Stack:** Supabase (PostgreSQL + Storage), TypeScript, React 19, Vitest

---

## Spec Reference

`docs/superpowers/specs/2026-05-16-campaign-draft-self-service-design.md`

Read this before implementing. Key decisions:
- Campaign and CampaignBooking are separate objects (1:1)
- `campaign.status` stays `ready_to_book` after booking; `CampaignBooking.booking_status` tracks the booking
- `GET /creative-requirements` derives formats in real time — does NOT read from `campaign_creative_requirements` table
- Auto-trigger: when `blocked_by_creative` campaign gets all requirements re-uploaded → auto-transition to `pending_creative_review`
- `save-draft` = semantic alias for `PATCH`; same DB operation

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `supabase/migrations/20260516_campaign_draft.sql` | New tables + campaign status constraint |
| Create | `src/types/campaign-draft.ts` | TypeScript types for Campaign, CampaignBooking, CampaignCreativeRequirement, LaunchReadiness |
| Create | `src/utils/campaignStateMachine.ts` | Pure functions: `isValidTransition`, `computeLaunchReadiness`, `shouldAutoTransition` |
| Create | `src/__tests__/campaignStateMachine.test.ts` | Unit tests for state machine logic |
| Create | `src/lib/api/campaign-draft.ts` | Supabase API functions: createDraft, updateDraft, addInventoryItem, removeInventoryItem, getCreativeRequirements, submitCreativesForReview, uploadCreativeAsset (per-requirement), getLaunchReadiness, confirmBooking |
| Modify | `src/components/campaign-planner/CampaignPlannerPage.tsx` | Wire up to new API functions |
| Modify | `src/components/campaign-planner/CreativeUploadStep.tsx` | Import `uploadAssetToRequirement` from campaign-draft.ts (handles auto-transition) |

---

### Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260516_campaign_draft.sql`

**Context:** The existing `campaigns` table (see `docs/backend/step14-schema-design.md` A-4) has a `status` column. We need to add our new status values and create two new tables. The migration does NOT drop or alter existing columns — only additive changes.

Run migrations via Supabase dashboard SQL editor or `supabase db push` if CLI is set up.

- [ ] **Step 1: Create the migrations directory and SQL file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/20260516_campaign_draft.sql`:

```sql
-- ============================================================
-- Campaign Draft: add new status values + new tables
-- ============================================================

-- 1. Add new campaign statuses to the campaigns table
-- The existing status column is TEXT with no CHECK constraint,
-- so new values can be inserted immediately.
-- Document the new allowed values:
COMMENT ON COLUMN campaigns.status IS
  'draft | pending_creative_review | blocked_by_creative | ready_to_book | cancelled | pending_review | approved | rejected | scheduled | live | completed';

-- 2. campaign_creative_requirements
-- Snapshot of required canonical formats, created at submit-for-review time.
CREATE TABLE IF NOT EXISTS campaign_creative_requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  canonical_format  TEXT NOT NULL,
  -- 'landscape_16_9' | 'portrait_9_16' | 'square_1_1' | 'ultra_wide'
  status            TEXT NOT NULL DEFAULT 'pending_upload',
  -- 'pending_upload' | 'uploaded' | 'approved' | 'rejected'
  media_asset_id    UUID REFERENCES media_assets(id),
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, canonical_format)
);

CREATE INDEX IF NOT EXISTS idx_ccr_campaign_id
  ON campaign_creative_requirements(campaign_id);

CREATE INDEX IF NOT EXISTS idx_ccr_status
  ON campaign_creative_requirements(status);

-- 3. campaign_bookings
-- Created once at confirm-booking. 1:1 with campaign.
CREATE TABLE IF NOT EXISTS campaign_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  confirmed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount    NUMERIC(12, 2) NOT NULL,
  booking_status  TEXT NOT NULL DEFAULT 'confirmed',
  -- 'confirmed' | 'cancelled'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cb_campaign_id
  ON campaign_bookings(campaign_id);
```

- [ ] **Step 2: Run the migration**

Open the Supabase dashboard → SQL Editor → paste and run the file contents.

Verify with:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campaign_creative_requirements', 'campaign_bookings');
```

Expected: 2 rows returned.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260516_campaign_draft.sql
git commit -m "feat: add campaign_creative_requirements and campaign_bookings migration"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `src/types/campaign-draft.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/campaign-draft.ts

export type CampaignDraftStatus =
  | 'draft'
  | 'pending_creative_review'
  | 'blocked_by_creative'
  | 'ready_to_book'
  | 'cancelled';

export type CreativeRequirementStatus =
  | 'pending_upload'
  | 'uploaded'
  | 'approved'
  | 'rejected';

export type BookingStatus = 'confirmed' | 'cancelled';

export interface CampaignDraft {
  id: string;
  advertiserId: string;
  name: string;
  objective: string | null;
  startDate: string | null; // ISO date
  endDate: string | null;
  status: CampaignDraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignInventoryItemRow {
  id: string;
  campaignId: string;
  inventoryLocationId: string;
  days: number;
  pricePerDaySnapshot: number;
}

export interface CampaignCreativeRequirement {
  id: string;
  campaignId: string;
  canonicalFormat: string; // CanonicalFormat from creative.ts
  status: CreativeRequirementStatus;
  mediaAssetId: string | null;
  rejectionReason: string | null;
}

export interface CampaignBooking {
  id: string;
  campaignId: string;
  confirmedAt: string;
  totalAmount: number;
  bookingStatus: BookingStatus;
}

export interface LaunchReadiness {
  ready: boolean;
  checks: {
    hasInventory: boolean;
    allCreativesApproved: boolean;
  };
}

export interface DerivedCreativeRequirement {
  format: string;          // CanonicalFormat
  label: string;
  dimensions: string;
  venueCount: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/campaign-draft.ts
git commit -m "feat: add CampaignDraft and related TypeScript types"
```

---

### Task 3: State machine pure functions + tests

**Files:**
- Create: `src/utils/campaignStateMachine.ts`
- Create: `src/__tests__/campaignStateMachine.test.ts`

**Why pure functions:** These are the business logic rules. By extracting them from Supabase calls, they can be unit-tested without a DB connection.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/campaignStateMachine.test.ts
import { describe, it, expect } from 'vitest';
import {
  canSubmitCreatives,
  computeLaunchReadiness,
  shouldAutoTransitionToReview,
} from '@/utils/campaignStateMachine';
import type { CampaignDraftStatus, CampaignCreativeRequirement } from '@/types/campaign-draft';

describe('canSubmitCreatives', () => {
  it('allows submit from draft', () => {
    expect(canSubmitCreatives('draft')).toBe(true);
  });

  it('allows resubmit from blocked_by_creative', () => {
    expect(canSubmitCreatives('blocked_by_creative')).toBe(true);
  });

  it('rejects submit from pending_creative_review', () => {
    expect(canSubmitCreatives('pending_creative_review')).toBe(false);
  });

  it('rejects submit from ready_to_book', () => {
    expect(canSubmitCreatives('ready_to_book')).toBe(false);
  });

  it('rejects submit from cancelled', () => {
    expect(canSubmitCreatives('cancelled')).toBe(false);
  });
});

describe('computeLaunchReadiness', () => {
  const approved = (id: string): CampaignCreativeRequirement => ({
    id,
    campaignId: 'c1',
    canonicalFormat: 'landscape_16_9',
    status: 'approved',
    mediaAssetId: 'a1',
    rejectionReason: null,
  });

  const pending = (id: string): CampaignCreativeRequirement => ({
    ...approved(id),
    status: 'pending_upload',
    mediaAssetId: null,
  });

  it('returns ready when inventory exists and all creatives approved', () => {
    const result = computeLaunchReadiness(3, [approved('r1'), approved('r2')]);
    expect(result.ready).toBe(true);
    expect(result.checks.hasInventory).toBe(true);
    expect(result.checks.allCreativesApproved).toBe(true);
  });

  it('returns not ready when no inventory', () => {
    const result = computeLaunchReadiness(0, [approved('r1')]);
    expect(result.ready).toBe(false);
    expect(result.checks.hasInventory).toBe(false);
  });

  it('returns not ready when some creatives not approved', () => {
    const result = computeLaunchReadiness(2, [approved('r1'), pending('r2')]);
    expect(result.ready).toBe(false);
    expect(result.checks.allCreativesApproved).toBe(false);
  });

  it('returns not ready when no requirements exist', () => {
    const result = computeLaunchReadiness(2, []);
    expect(result.ready).toBe(false);
    expect(result.checks.allCreativesApproved).toBe(false);
  });
});

describe('shouldAutoTransitionToReview', () => {
  const makeReq = (status: CampaignCreativeRequirement['status']): CampaignCreativeRequirement => ({
    id: 'r1',
    campaignId: 'c1',
    canonicalFormat: 'landscape_16_9',
    status,
    mediaAssetId: status !== 'pending_upload' ? 'a1' : null,
    rejectionReason: null,
  });

  it('returns true when campaign is blocked and all requirements are uploaded', () => {
    const reqs = [makeReq('uploaded'), makeReq('uploaded')];
    expect(shouldAutoTransitionToReview('blocked_by_creative', reqs)).toBe(true);
  });

  it('returns false when campaign is not blocked', () => {
    const reqs = [makeReq('uploaded')];
    expect(shouldAutoTransitionToReview('pending_creative_review', reqs)).toBe(false);
  });

  it('returns false when some requirements still rejected', () => {
    const reqs = [makeReq('uploaded'), makeReq('rejected')];
    expect(shouldAutoTransitionToReview('blocked_by_creative', reqs)).toBe(false);
  });

  it('returns false when some requirements still pending_upload', () => {
    const reqs = [makeReq('uploaded'), makeReq('pending_upload')];
    expect(shouldAutoTransitionToReview('blocked_by_creative', reqs)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run src/__tests__/campaignStateMachine.test.ts`
Expected: FAIL — `Cannot find module '@/utils/campaignStateMachine'`

- [ ] **Step 3: Implement the functions**

```ts
// src/utils/campaignStateMachine.ts
import type {
  CampaignDraftStatus,
  CampaignCreativeRequirement,
  LaunchReadiness,
} from '@/types/campaign-draft';

export function canSubmitCreatives(status: CampaignDraftStatus): boolean {
  return status === 'draft' || status === 'blocked_by_creative';
}

export function computeLaunchReadiness(
  inventoryItemCount: number,
  requirements: CampaignCreativeRequirement[],
): LaunchReadiness {
  const hasInventory = inventoryItemCount > 0;
  const allCreativesApproved =
    requirements.length > 0 &&
    requirements.every(r => r.status === 'approved');

  return {
    ready: hasInventory && allCreativesApproved,
    checks: { hasInventory, allCreativesApproved },
  };
}

export function shouldAutoTransitionToReview(
  currentStatus: CampaignDraftStatus,
  requirements: CampaignCreativeRequirement[],
): boolean {
  if (currentStatus !== 'blocked_by_creative') return false;
  if (requirements.length === 0) return false;
  return requirements.every(r => r.status === 'uploaded' || r.status === 'approved');
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/__tests__/campaignStateMachine.test.ts`
Expected: PASS — all 12 tests green

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/campaignStateMachine.ts src/__tests__/campaignStateMachine.test.ts
git commit -m "feat: add campaign state machine pure functions with tests"
```

---

### Task 4: Campaign Draft API functions

**Files:**
- Create: `src/lib/api/campaign-draft.ts`

**Context:** All functions use the Supabase client at `@/lib/supabase`. The DEFAULT_ADVERTISER_ID constant (`'aaaaaaaa-0000-0000-0000-000000000001'`) is the same hardcoded ID used in the existing `campaigns.ts` and `creatives.ts` — keep consistency for MVP. The existing `campaigns` table already has all needed columns (see `docs/backend/step14-schema-design.md` A-4 and A-5).

No unit tests for these functions — they require a live Supabase connection. Test manually using the dev app.

- [ ] **Step 1: Create the API file**

```ts
// src/lib/api/campaign-draft.ts
import { supabase } from '@/lib/supabase';
import type {
  CampaignDraft,
  CampaignInventoryItemRow,
  CampaignCreativeRequirement,
  CampaignBooking,
  LaunchReadiness,
  DerivedCreativeRequirement,
} from '@/types/campaign-draft';
import { FORMAT_SPECS, deriveRequiredFormats } from '@/utils/creativeRequirements';
import {
  canSubmitCreatives,
  computeLaunchReadiness,
  shouldAutoTransitionToReview,
} from '@/utils/campaignStateMachine';
import type { MediaPlanItem, InventoryLocation } from '@/types/inventory';

const DEFAULT_ADVERTISER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

// ─── Helpers ───────────────────────────────────────────────

function mapCampaignRow(row: Record<string, unknown>): CampaignDraft {
  return {
    id: row.id as string,
    advertiserId: row.advertiser_id as string,
    name: row.name as string,
    objective: (row.objective as string | null) ?? null,
    startDate: (row.start_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
    status: row.status as CampaignDraft['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRequirementRow(row: Record<string, unknown>): CampaignCreativeRequirement {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    canonicalFormat: row.canonical_format as string,
    status: row.status as CampaignCreativeRequirement['status'],
    mediaAssetId: (row.media_asset_id as string | null) ?? null,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
  };
}

// ─── Campaign CRUD ─────────────────────────────────────────

export async function createDraftCampaign(): Promise<CampaignDraft> {
  const name = `Unnamed Campaign`;
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      advertiser_id: DEFAULT_ADVERTISER_ID,
      created_by_user_id: DEFAULT_USER_ID,
      name,
      objective: null,
      status: 'draft',
      buying_type: 'direct',
      campaign_days: 7,
      total_budget: 0,
      estimated_impressions: 0,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create campaign');
  return mapCampaignRow(data);
}

export async function getCampaign(campaignId: string): Promise<CampaignDraft> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Campaign not found');
  return mapCampaignRow(data);
}

export async function updateDraftCampaign(
  campaignId: string,
  updates: Partial<Pick<CampaignDraft, 'name' | 'objective' | 'startDate' | 'endDate'>>,
): Promise<CampaignDraft> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.objective !== undefined) dbUpdates.objective = updates.objective;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;

  const { data, error } = await supabase
    .from('campaigns')
    .update(dbUpdates)
    .eq('id', campaignId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update campaign');
  return mapCampaignRow(data);
}

// save-draft is a semantic alias for updateDraftCampaign
export const saveDraftCampaign = updateDraftCampaign;

// ─── Inventory Items ───────────────────────────────────────

export async function addInventoryItem(
  campaignId: string,
  inventoryLocationId: string,
  days: number,
  pricePerDay: number,
  dailyImpressions: number,
): Promise<CampaignInventoryItemRow> {
  const { data, error } = await supabase
    .from('campaign_inventory_items')
    .insert({
      campaign_id: campaignId,
      inventory_location_id: inventoryLocationId,
      days,
      price_per_day: pricePerDay,
      daily_impressions: dailyImpressions,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to add inventory item');
  return {
    id: data.id as string,
    campaignId: data.campaign_id as string,
    inventoryLocationId: data.inventory_location_id as string,
    days: data.days as number,
    pricePerDaySnapshot: data.price_per_day as number,
  };
}

export async function removeInventoryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_inventory_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

export async function getInventoryItems(campaignId: string): Promise<CampaignInventoryItemRow[]> {
  const { data, error } = await supabase
    .from('campaign_inventory_items')
    .select('*')
    .eq('campaign_id', campaignId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id as string,
    campaignId: row.campaign_id as string,
    inventoryLocationId: row.inventory_location_id as string,
    days: row.days as number,
    pricePerDaySnapshot: row.price_per_day as number,
  }));
}

// ─── Creative Requirements (derived) ──────────────────────

export function getDerivedCreativeRequirements(
  selectedItems: MediaPlanItem[],
  allInventory: InventoryLocation[],
): DerivedCreativeRequirement[] {
  const formats = deriveRequiredFormats(selectedItems, allInventory);
  return formats.map(format => {
    const spec = FORMAT_SPECS.find(s => s.format === format)!;
    const venueCount = selectedItems.filter(item => {
      const venue = allInventory.find(v => v.id === item.inventoryId);
      return venue && spec.screenTypes.includes(venue.screenType);
    }).length;
    return {
      format,
      label: spec.label,
      dimensions: spec.dimensions,
      venueCount,
    };
  });
}

export async function getStoredCreativeRequirements(
  campaignId: string,
): Promise<CampaignCreativeRequirement[]> {
  const { data, error } = await supabase
    .from('campaign_creative_requirements')
    .select('*')
    .eq('campaign_id', campaignId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRequirementRow);
}

// ─── Submit Creatives for Review ───────────────────────────

export async function submitCreativesForReview(
  campaignId: string,
  selectedItems: MediaPlanItem[],
  allInventory: InventoryLocation[],
): Promise<CampaignCreativeRequirement[]> {
  // Validate campaign status allows submission
  const campaign = await getCampaign(campaignId);
  if (!canSubmitCreatives(campaign.status)) {
    throw new Error(`cannot_submit: campaign status is ${campaign.status}`);
  }

  // Validate inventory exists
  const items = await getInventoryItems(campaignId);
  if (items.length === 0) throw new Error('no_inventory');

  // Derive formats from current inventory
  const formats = deriveRequiredFormats(selectedItems, allInventory);

  // Delete existing requirement snapshot
  await supabase
    .from('campaign_creative_requirements')
    .delete()
    .eq('campaign_id', campaignId);

  // Insert fresh snapshot
  if (formats.length > 0) {
    const rows = formats.map(format => ({
      campaign_id: campaignId,
      canonical_format: format,
      status: 'pending_upload',
    }));
    const { error } = await supabase
      .from('campaign_creative_requirements')
      .insert(rows);
    if (error) throw new Error(error.message);
  }

  // Transition campaign to pending_creative_review
  await supabase
    .from('campaigns')
    .update({ status: 'pending_creative_review' })
    .eq('id', campaignId);

  return getStoredCreativeRequirements(campaignId);
}

// ─── Upload Asset to Requirement ──────────────────────────

export async function uploadAssetToRequirement(
  requirementId: string,
  mediaAssetId: string,
): Promise<void> {
  // Mark requirement as uploaded
  const { error: reqError } = await supabase
    .from('campaign_creative_requirements')
    .update({ status: 'uploaded', media_asset_id: mediaAssetId })
    .eq('id', requirementId);

  if (reqError) throw new Error(reqError.message);

  // Read requirement to get campaign_id
  const { data: req, error: readError } = await supabase
    .from('campaign_creative_requirements')
    .select('campaign_id')
    .eq('id', requirementId)
    .single();

  if (readError || !req) throw new Error(readError?.message ?? 'Requirement not found');

  const campaignId = req.campaign_id as string;

  // Auto-transition check
  const campaign = await getCampaign(campaignId);
  const allReqs = await getStoredCreativeRequirements(campaignId);

  if (shouldAutoTransitionToReview(campaign.status, allReqs)) {
    await supabase
      .from('campaigns')
      .update({ status: 'pending_creative_review' })
      .eq('id', campaignId);
  }
}

// ─── Launch Readiness ──────────────────────────────────────

export async function getLaunchReadiness(campaignId: string): Promise<LaunchReadiness> {
  const [items, requirements] = await Promise.all([
    getInventoryItems(campaignId),
    getStoredCreativeRequirements(campaignId),
  ]);
  return computeLaunchReadiness(items.length, requirements);
}

// ─── Confirm Booking ──────────────────────────────────────

export async function confirmBooking(campaignId: string): Promise<CampaignBooking> {
  // Check launch readiness
  const readiness = await getLaunchReadiness(campaignId);
  if (!readiness.ready) {
    throw new Error('booking_not_ready');
  }

  // Check no existing booking
  const { data: existing } = await supabase
    .from('campaign_bookings')
    .select('id')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (existing) throw new Error('booking_already_exists');

  // Compute total amount from inventory item snapshots
  const items = await getInventoryItems(campaignId);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.pricePerDaySnapshot * item.days,
    0,
  );

  // Create booking
  const { data: booking, error } = await supabase
    .from('campaign_bookings')
    .insert({
      campaign_id: campaignId,
      total_amount: totalAmount,
      booking_status: 'confirmed',
    })
    .select()
    .single();

  if (error || !booking) throw new Error(error?.message ?? 'Failed to create booking');

  return {
    id: booking.id as string,
    campaignId: booking.campaign_id as string,
    confirmedAt: booking.confirmed_at as string,
    totalAmount: booking.total_amount as number,
    bookingStatus: booking.booking_status as CampaignBooking['bookingStatus'],
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/campaign-draft.ts
git commit -m "feat: add campaign draft API functions"
```

---

### Task 5: Update CreativeUploadStep to use requirement-based upload

**Files:**
- Modify: `src/components/campaign-planner/CreativeUploadStep.tsx` — accept `storedRequirements` + use `uploadAssetToRequirement` from campaign-draft.ts

**Context:** Currently `CreativeUploadStep` calls `uploadCreativeAsset(file)` (generic, no format ID). Now it needs to:
1. Know which `CampaignCreativeRequirement` row each zone maps to (after `submitCreativesForReview` creates them)
2. Call `uploadAssetToRequirement(requirementId, mediaAssetId)` after the file uploads — this also handles the auto-transition from `blocked_by_creative → pending_creative_review` when all requirements are re-uploaded

**Why `uploadAssetToRequirement` from `campaign-draft.ts` and not a helper in `creatives.ts`:** The auto-transition check must run after every upload. This logic lives in `uploadAssetToRequirement` (campaign-draft.ts). A simpler `linkAssetToRequirement` in `creatives.ts` would skip the auto-transition, breaking the `blocked_by_creative` recovery flow.

- [ ] **Step 1: Update CreativeUploadStep Props interface**

In `src/components/campaign-planner/CreativeUploadStep.tsx`, update the `Props` interface to accept stored requirements:

```tsx
interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  creatives: CreativeAsset[];
  setCreatives: React.Dispatch<React.SetStateAction<CreativeAsset[]>>;
  onBack: () => void;
  onContinue: () => void;
  // New: stored requirement rows (present after submitCreativesForReview)
  // If null, falls back to derived-only mode (no DB linking)
  storedRequirements?: Array<{ id: string; canonicalFormat: string }> | null;
}
```

- [ ] **Step 3: Update handleFile to link asset to requirement when available**

In `handleFile`, after `const asset = await uploadCreativeAsset(file)` succeeds, add:

```ts
// If we have a stored requirement for this format, link the asset
// uploadAssetToRequirement also handles the blocked_by_creative auto-transition
if (storedRequirements) {
  const req = storedRequirements.find(r => r.canonicalFormat === format);
  if (req) {
    await uploadAssetToRequirement(req.id, asset.id);
  }
}
```

Import `uploadAssetToRequirement` at top (alongside existing imports):
```ts
import { uploadCreativeAsset } from '@/lib/api/creatives';
import { uploadAssetToRequirement } from '@/lib/api/campaign-draft';
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/campaign-planner/CreativeUploadStep.tsx
git commit -m "feat: link uploaded creatives to campaign_creative_requirements rows"
```

---

### Task 6: Frontend wiring — CampaignPlannerPage

**Files:**
- Modify: `src/components/campaign-planner/CampaignPlannerPage.tsx`

**Context:** Currently the planner creates the campaign only at the final review step via `createAndSubmitCampaign`. The new flow creates a draft early, persists inventory items, and uses `submitCreativesForReview` before the creative upload step.

Read the current `CampaignPlannerPage.tsx` before editing. Key state variables: `step`, `selectedItems`, `creatives`, `filters`. The component is at `/Users/jack.ni/Personal/DOOH/src/components/campaign-planner/CampaignPlannerPage.tsx`.

- [ ] **Step 1: Add campaign draft state**

At the top of the `CampaignPlannerPage` component, after existing `useState` declarations, add:

```ts
const [campaignId, setCampaignId] = useState<string | null>(null);
const [storedRequirements, setStoredRequirements] = useState<
  Array<{ id: string; canonicalFormat: string }> | null
>(null);
const [isSaving, setIsSaving] = useState(false);
```

Add imports at the top of the file:
```ts
import {
  createDraftCampaign,
  addInventoryItem,
  removeInventoryItem,
  submitCreativesForReview,
} from '@/lib/api/campaign-draft';
```

- [ ] **Step 2: Auto-create draft on first inventory add**

Find the function that handles adding an item to the media plan (it calls something like `setSelectedItems`). Wrap it to also create the campaign draft on first add:

```ts
const handleAddToPlan = async (item: InventoryLocation) => {
  // Create draft on first add
  let cId = campaignId;
  if (!cId) {
    try {
      const draft = await createDraftCampaign();
      cId = draft.id;
      setCampaignId(draft.id);
    } catch (err) {
      console.error('Failed to create campaign draft:', err);
    }
  }

  // Add to local state
  setSelectedItems(prev => [...prev, { inventoryId: item.id, days: 7 }]);

  // Persist to DB if we have an ID
  if (cId) {
    try {
      await addInventoryItem(cId, item.id, 7, item.pricePerDay, item.dailyImpressions);
    } catch (err) {
      console.error('Failed to persist inventory item:', err);
    }
  }
};
```

- [ ] **Step 3: Submit creatives for review before entering creative step**

Find `handleContinueToCreative` (the function that transitions from inventory step to creative step). Replace its body with:

```ts
const handleContinueToCreative = async () => {
  if (selectedItems.length === 0) return;
  setIsSaving(true);
  try {
    if (campaignId) {
      const reqs = await submitCreativesForReview(campaignId, selectedItems, allInventory);
      setStoredRequirements(reqs.map(r => ({
        id: r.id,
        canonicalFormat: r.canonicalFormat,
      })));
    }
    setStep('creative');
  } catch (err) {
    console.error('Failed to submit for review:', err);
    setStep('creative'); // still advance even if DB fails
  } finally {
    setIsSaving(false);
  }
};
```

- [ ] **Step 4: Pass storedRequirements to CreativeUploadStep**

In the JSX where `<CreativeUploadStep` is rendered, add the new prop:

```tsx
<CreativeUploadStep
  selectedItems={selectedItems}
  allInventory={allInventory}
  creatives={creatives}
  setCreatives={setCreatives}
  onBack={() => setStep('inventory')}
  onContinue={handleContinueToReview}
  storedRequirements={storedRequirements}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`

Test flow:
1. Open campaign planner at `http://localhost:3000`
2. Add a Billboard and a Kiosk to the plan
3. Check Supabase dashboard → `campaigns` table — new row with `status: draft` should appear
4. Check `campaign_inventory_items` — 2 rows linked to that campaign
5. Click "Continue to Creative Upload"
6. Check `campaign_creative_requirements` — 2 rows: `landscape_16_9` and `portrait_9_16`, status `pending_upload`
7. Upload test assets (use `public/test-assets/test-landscape.png` and `test-portrait.png`)
8. Check `campaign_creative_requirements` — both rows now `status: uploaded`

- [ ] **Step 7: Commit**

```bash
git add src/components/campaign-planner/CampaignPlannerPage.tsx
git commit -m "feat: wire campaign planner to draft API — persist inventory and creative requirements"
```

---

## Final verification

Run full test suite: `npx vitest run`
Expected: all tests pass (15 original + 12 new state machine tests = 27 total)

Check git log to confirm 6 commits in this feature:
```bash
git log --oneline -6
```
