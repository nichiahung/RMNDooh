# Admin Dashboard UX Quick Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four high-impact usability bugs in the Admin Dashboard: raw UUID display, broken search, emoji status indicators, and non-navigable Work Queue cards.

**Architecture:** All fixes are isolated to existing components and one new utility file. No structural changes to navigation or data model. The UUID resolver uses a static lookup map appropriate for the current demo/mock data context. Launch Readiness and Creative Coverage enrich their API responses server-side by joining with campaign draft state.

**Tech Stack:** Next.js App Router, React, TypeScript, TailwindCSS, Vitest, `src/components/ui/StatusBadge`

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `src/utils/adminResolvers.ts` | `resolveAdvertiserName(id)` + `resolveCampaignName(id, drafts)` lookup helpers |
| Modify | `src/lib/tradingIterationActions.ts` | Enrich `listAdminLaunchReadiness` + `listAdminCreativeCoverage` to include `campaignName` |
| Modify | `src/types/trading-models.ts` | Add `campaignName?: string` to `CampaignReadinessResult`; add coverage enrichment type |
| Modify | `src/components/admin/AdminProposalsPanel.tsx` | Show advertiser name instead of UUID |
| Modify | `src/components/admin/AdminCampaignDraftsPanel.tsx` | Show advertiser name instead of UUID |
| Modify | `src/components/admin/AdminLaunchReadinessPanel.tsx` | Show campaign name instead of UUID |
| Modify | `src/components/admin/AdminCreativeCoveragePanel.tsx` | Show campaign name instead of UUID |
| Modify | `src/components/admin/AdminWorkQueuesPanel.tsx` | Accept `onNavigate` prop, make cards clickable |
| Modify | `src/components/admin/AdminDashboardPage.tsx` | Wire `onNavigate` from Work Queue cards to tab + filter state |
| Modify | `src/components/admin/CampaignTable.tsx` | Add `searchQuery` state + `onChange` filter |
| Modify | `src/components/admin/AdminBookingsPanel.tsx` | Replace ✅❌ with `StatusBadge`; truncate booking ID |
| Create | `src/__tests__/adminResolvers.test.ts` | Unit tests for resolver utilities |
| Create | `src/__tests__/adminWorkQueueNav.test.ts` | Test Work Queue navigation wiring |

---

## Task 1: UUID Resolver Utility

**Files:**
- Create: `src/utils/adminResolvers.ts`
- Create: `src/__tests__/adminResolvers.test.ts`

- [ ] **Step 1.1: Write the failing tests**

```ts
// src/__tests__/adminResolvers.test.ts
import { describe, it, expect } from 'vitest';
import { resolveAdvertiserName, resolveCampaignName } from '@/utils/adminResolvers';
import type { CampaignDraftProfile } from '@/types/trading-models';

describe('resolveAdvertiserName', () => {
  it('returns known advertiser name for adv-01', () => {
    expect(resolveAdvertiserName('adv-01')).toBe('TechNova Solutions');
  });

  it('returns known advertiser name for adv-02', () => {
    expect(resolveAdvertiserName('adv-02')).toBe('Luxe Retail Group');
  });

  it('returns truncated ID for unknown advertiser', () => {
    expect(resolveAdvertiserName('xxxxxxxx-yyyy-zzzz-0000-111111111111')).toBe('xxxxxxxx...');
  });

  it('returns truncated ID for adv-default', () => {
    expect(resolveAdvertiserName('adv-default')).toBe('Demo Advertiser');
  });
});

describe('resolveCampaignName', () => {
  const drafts: Pick<CampaignDraftProfile, 'id' | 'name'>[] = [
    { id: 'draft-001', name: 'Spring Campaign' },
    { id: 'draft-002', name: 'Summer Blast' },
  ];

  it('returns campaign name when found', () => {
    expect(resolveCampaignName('draft-001', drafts)).toBe('Spring Campaign');
  });

  it('returns truncated ID when not found', () => {
    expect(resolveCampaignName('unknown-id-abc', drafts)).toBe('unknown-...');
  });
});
```

- [ ] **Step 1.2: Run to verify tests fail**

```bash
npm run test -- adminResolvers
```

Expected: FAIL — "Cannot find module '@/utils/adminResolvers'"

- [ ] **Step 1.3: Create the resolver utility**

```ts
// src/utils/adminResolvers.ts

const ADVERTISER_NAMES: Record<string, string> = {
  'adv-01': 'TechNova Solutions',
  'adv-02': 'Luxe Retail Group',
  'adv-03': 'Urban Outfitters Taiwan',
  'adv-04': 'NextGen Studios',
  'adv-05': 'Global Brands Inc',
  'adv-default': 'Demo Advertiser',
  'aaaaaaaa-0000-0000-0000-000000000001': 'Demo Advertiser',
};

export function resolveAdvertiserName(advertiserId: string): string {
  return ADVERTISER_NAMES[advertiserId] ?? `${advertiserId.slice(0, 8)}...`;
}

export function resolveCampaignName(
  campaignId: string,
  drafts: Array<{ id: string; name: string }>,
): string {
  const draft = drafts.find(d => d.id === campaignId);
  return draft?.name ?? `${campaignId.slice(0, 8)}...`;
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
npm run test -- adminResolvers
```

Expected: PASS (5 tests)

- [ ] **Step 1.5: Commit**

```bash
git add src/utils/adminResolvers.ts src/__tests__/adminResolvers.test.ts
git commit -m "feat: add adminResolvers utility for human-readable UUID display"
```

---

## Task 2: Enrich Launch Readiness API Response with Campaign Name

**Files:**
- Modify: `src/types/trading-models.ts` (lines 356–362)
- Modify: `src/lib/tradingIterationActions.ts` (function `listAdminLaunchReadiness`, line ~1194)

- [ ] **Step 2.1: Add `campaignName` to `CampaignReadinessResult` type**

In `src/types/trading-models.ts`, find the `CampaignReadinessResult` interface and add `campaignName`:

```ts
export interface CampaignReadinessResult {
  campaignId: string;
  campaignName?: string;   // ← add this line
  status: LaunchReadinessStatus;
  readyLineItemIds: string[];
  blockedLineItemIds: string[];
  blockers: CampaignReadinessBlockingReason[];
}
```

- [ ] **Step 2.2: Enrich `listAdminLaunchReadiness` to join campaign name**

In `src/lib/tradingIterationActions.ts`, replace the `listAdminLaunchReadiness` function (around line 1194):

```ts
export async function listAdminLaunchReadiness() {
  const campaigns = Array.from(state.campaignDraftInventory.keys());
  const values = await Promise.all(campaigns.map(async id => {
    const result = await getCampaignLaunchReadiness(id);
    const draft = state.campaignDrafts.find(d => d.id === id);
    return { ...result, campaignName: draft?.name };
  }));
  return values;
}
```

- [ ] **Step 2.3: Run existing launch readiness tests to verify no regression**

```bash
npm run test -- launchReadiness
```

Expected: all existing tests PASS

- [ ] **Step 2.4: Commit**

```bash
git add src/types/trading-models.ts src/lib/tradingIterationActions.ts
git commit -m "feat: enrich listAdminLaunchReadiness response with campaignName"
```

---

## Task 3: Enrich Creative Coverage API Response with Campaign Name

**Files:**
- Modify: `src/lib/tradingIterationActions.ts` (function `listAdminCreativeCoverage`, line ~1187)

The coverage result is typed as an array of objects returned by `getCampaignCreativeCoverage`. Add the campaign name via the same join pattern.

- [ ] **Step 3.1: Update `listAdminCreativeCoverage` to join campaign name**

In `src/lib/tradingIterationActions.ts`, replace `listAdminCreativeCoverage` (around line 1187):

```ts
export async function listAdminCreativeCoverage() {
  const payload = state.campaignDraftInventory.size > 0
    ? Array.from(state.campaignDraftInventory.keys())
    : [];
  return Promise.all(payload.map(async id => {
    const coverage = await getCampaignCreativeCoverage(id);
    const draft = state.campaignDrafts.find(d => d.id === id);
    return { ...coverage, campaignName: draft?.name };
  }));
}
```

- [ ] **Step 3.2: Run lint to confirm TypeScript is happy**

```bash
npm run lint
```

Expected: no new errors

- [ ] **Step 3.3: Commit**

```bash
git add src/lib/tradingIterationActions.ts
git commit -m "feat: enrich listAdminCreativeCoverage response with campaignName"
```

---

## Task 4: Fix UUID Display in Proposals Panel

**Files:**
- Modify: `src/components/admin/AdminProposalsPanel.tsx`

- [ ] **Step 4.1: Import resolver and replace UUID column**

Open `src/components/admin/AdminProposalsPanel.tsx`. Replace the advertiser `<td>` cell (currently showing raw `p.advertiserId`):

```tsx
// add import at top of file
import { resolveAdvertiserName } from '@/utils/adminResolvers';

// in the table row, replace:
// <td className="px-4 py-3 text-slate-500">{p.advertiserId}</td>
// with:
<td className="px-4 py-3 text-slate-600 font-medium">
  {resolveAdvertiserName(p.advertiserId)}
</td>
```

- [ ] **Step 4.2: Run lint and build check**

```bash
npm run lint && npm run build 2>&1 | tail -5
```

Expected: no errors

- [ ] **Step 4.3: Commit**

```bash
git add src/components/admin/AdminProposalsPanel.tsx
git commit -m "fix: show advertiser name instead of UUID in AdminProposalsPanel"
```

---

## Task 5: Fix UUID Display in Campaign Drafts Panel

**Files:**
- Modify: `src/components/admin/AdminCampaignDraftsPanel.tsx`

- [ ] **Step 5.1: Import resolver and replace UUID column**

Open `src/components/admin/AdminCampaignDraftsPanel.tsx`. Replace the advertiser `<td>` cell:

```tsx
// add import at top of file
import { resolveAdvertiserName } from '@/utils/adminResolvers';

// in the table row, replace:
// <td className="px-4 py-3 text-slate-500">{d.advertiserId}</td>
// with:
<td className="px-4 py-3 text-slate-600 font-medium">
  {resolveAdvertiserName(d.advertiserId)}
</td>
```

- [ ] **Step 5.2: Run lint**

```bash
npm run lint
```

- [ ] **Step 5.3: Commit**

```bash
git add src/components/admin/AdminCampaignDraftsPanel.tsx
git commit -m "fix: show advertiser name instead of UUID in AdminCampaignDraftsPanel"
```

---

## Task 6: Fix UUID Display in Launch Readiness Panel

**Files:**
- Modify: `src/components/admin/AdminLaunchReadinessPanel.tsx`

- [ ] **Step 6.1: Use `campaignName` from enriched response**

Open `src/components/admin/AdminLaunchReadinessPanel.tsx`. Replace the campaign header title:

```tsx
// Replace:
// <h3 className="font-semibold text-slate-800">Campaign: {campaign.campaignId}</h3>
// with:
<h3 className="font-semibold text-slate-800">
  {campaign.campaignName ?? `Campaign ${campaign.campaignId.slice(0, 8)}...`}
</h3>
```

- [ ] **Step 6.2: Run lint**

```bash
npm run lint
```

- [ ] **Step 6.3: Commit**

```bash
git add src/components/admin/AdminLaunchReadinessPanel.tsx
git commit -m "fix: show campaign name instead of UUID in AdminLaunchReadinessPanel"
```

---

## Task 7: Fix UUID Display in Creative Coverage Panel

**Files:**
- Modify: `src/components/admin/AdminCreativeCoveragePanel.tsx`

- [ ] **Step 7.1: Use `campaignName` from enriched response**

The coverage result type returned by `listAdminCreativeCoverageApi` now includes `campaignName`. Update the panel:

```tsx
// In AdminCreativeCoveragePanel.tsx, update CoverageResult interface:
interface CoverageResult {
  campaignId: string;
  campaignName?: string;  // ← add this
  requirements: Array<{ ... }>;
  requirementCoverageMatrix: Array<{ ... }>;
}

// Replace:
// <h3 className="font-semibold text-slate-800">Campaign: {campaign.campaignId}</h3>
// with:
<h3 className="font-semibold text-slate-800">
  {campaign.campaignName ?? `Campaign ${campaign.campaignId.slice(0, 8)}...`}
</h3>
```

- [ ] **Step 7.2: Run lint**

```bash
npm run lint
```

- [ ] **Step 7.3: Commit**

```bash
git add src/components/admin/AdminCreativeCoveragePanel.tsx
git commit -m "fix: show campaign name instead of UUID in AdminCreativeCoveragePanel"
```

---

## Task 8: Make Work Queue Cards Navigable

**Files:**
- Modify: `src/components/admin/AdminWorkQueuesPanel.tsx`
- Modify: `src/components/admin/AdminDashboardPage.tsx`
- Create: `src/__tests__/adminWorkQueueNav.test.ts`

The Work Queue panel needs to accept an `onNavigate` callback and call it when a card is clicked. `AdminDashboardPage` provides the callback and maps each card to the correct tab + filter.

- [ ] **Step 8.1: Write failing test for onNavigate prop**

```ts
// src/__tests__/adminWorkQueueNav.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getWorkQueueNavTarget } from '@/utils/adminWorkQueueNav';
import type { AdminTab } from '@/components/admin/AdminSidebar';

describe('getWorkQueueNavTarget', () => {
  it('routes needsSalesAction to proposals tab', () => {
    const result = getWorkQueueNavTarget('needsSalesAction');
    expect(result.tab).toBe('proposals');
    expect(result.filter).toBe('change_requested');
  });

  it('routes needsBookingAction to bookings tab', () => {
    const result = getWorkQueueNavTarget('needsBookingAction');
    expect(result.tab).toBe('bookings');
    expect(result.filter).toBe('inventory_reserved');
  });

  it('routes needsCreativeReview to creative tab', () => {
    const result = getWorkQueueNavTarget('needsCreativeReview');
    expect(result.tab).toBe('creative');
    expect(result.filter).toBe('pending_review');
  });

  it('routes needsCreativeCoverage to launch-readiness tab', () => {
    const result = getWorkQueueNavTarget('needsCreativeCoverage');
    expect(result.tab).toBe('launch-readiness');
    expect(result.filter).toBe('blocked_by_creative');
  });

  it('routes needsLaunchAction to launch-readiness tab', () => {
    const result = getWorkQueueNavTarget('needsLaunchAction');
    expect(result.tab).toBe('launch-readiness');
    expect(result.filter).toBe('ready_for_launch');
  });
});
```

- [ ] **Step 8.2: Run to verify tests fail**

```bash
npm run test -- adminWorkQueueNav
```

Expected: FAIL — "Cannot find module '@/utils/adminWorkQueueNav'"

- [ ] **Step 8.3: Create the nav target utility**

```ts
// src/utils/adminWorkQueueNav.ts
import type { AdminTab } from '@/components/admin/AdminSidebar';

export type WorkQueueKey =
  | 'needsSalesAction'
  | 'needsBookingAction'
  | 'needsCreativeReview'
  | 'needsCreativeCoverage'
  | 'needsLaunchAction';

export interface WorkQueueNavTarget {
  tab: AdminTab;
  filter: string;
}

const NAV_MAP: Record<WorkQueueKey, WorkQueueNavTarget> = {
  needsSalesAction:     { tab: 'proposals',       filter: 'change_requested' },
  needsBookingAction:   { tab: 'bookings',         filter: 'inventory_reserved' },
  needsCreativeReview:  { tab: 'creative',         filter: 'pending_review' },
  needsCreativeCoverage:{ tab: 'launch-readiness', filter: 'blocked_by_creative' },
  needsLaunchAction:    { tab: 'launch-readiness', filter: 'ready_for_launch' },
};

export function getWorkQueueNavTarget(key: WorkQueueKey): WorkQueueNavTarget {
  return NAV_MAP[key];
}
```

- [ ] **Step 8.4: Run tests to verify pass**

```bash
npm run test -- adminWorkQueueNav
```

Expected: PASS (5 tests)

- [ ] **Step 8.5: Update `AdminWorkQueuesPanel` to accept and fire `onNavigate`**

Open `src/components/admin/AdminWorkQueuesPanel.tsx` and update as follows:

```tsx
import { getWorkQueueNavTarget, type WorkQueueKey } from '@/utils/adminWorkQueueNav';
import type { AdminTab } from '@/components/admin/AdminSidebar';

// Update the component signature:
interface Props {
  onNavigate?: (tab: AdminTab, filter: string) => void;
}

export function AdminWorkQueuesPanel({ onNavigate }: Props) {
  // ... existing state/effect ...

  const cards = [
    { key: 'needsSalesAction'     as WorkQueueKey, label: 'Needs Sales Action',      value: queues.needsSalesAction,      icon: FileText,      color: 'bg-blue-500/10 text-blue-500',    ring: 'ring-blue-500/20' },
    { key: 'needsBookingAction'   as WorkQueueKey, label: 'Needs Booking Action',    value: queues.needsBookingAction,    icon: CalendarCheck, color: 'bg-amber-500/10 text-amber-500',  ring: 'ring-amber-500/20' },
    { key: 'needsCreativeReview'  as WorkQueueKey, label: 'Needs Creative Review',   value: queues.needsCreativeReview,   icon: ClipboardList, color: 'bg-purple-500/10 text-purple-500',ring: 'ring-purple-500/20' },
    { key: 'needsCreativeCoverage'as WorkQueueKey, label: 'Needs Creative Coverage', value: queues.needsCreativeCoverage, icon: CheckCircle,   color: 'bg-emerald-500/10 text-emerald-500',ring:'ring-emerald-500/20' },
    { key: 'needsLaunchAction'    as WorkQueueKey, label: 'Needs Launch Action',     value: queues.needsLaunchAction,     icon: Rocket,        color: 'bg-rose-500/10 text-rose-500',    ring: 'ring-rose-500/20' },
  ];

  // in the card render, replace the <div> with a <button>:
  return (
    <div className="space-y-6">
      {/* ... alert banner ... */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const target = getWorkQueueNavTarget(card.key);
          return (
            <button
              key={card.key}
              onClick={() => onNavigate?.(target.tab, target.filter)}
              className={`relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all ring-1 ${card.ring} text-left w-full ${onNavigate ? 'cursor-pointer hover:border-slate-300' : 'cursor-default'}`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${card.color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-500 mt-1">{card.label}</div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-slate-400">
        Last updated: {new Date(queues.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
```

- [ ] **Step 8.6: Wire `onNavigate` in `AdminDashboardPage`**

Open `src/components/admin/AdminDashboardPage.tsx`. Add a `activeFilter` state and wire navigation:

```tsx
// Add state for active filter (used by panels to pre-filter):
const [activeFilter, setActiveFilter] = useState<string | null>(null);

const handleWorkQueueNavigate = (tab: AdminTab, filter: string) => {
  setActiveTab(tab);
  setActiveFilter(filter);
};

// Pass to AdminWorkQueuesPanel:
<AdminWorkQueuesPanel onNavigate={handleWorkQueueNavigate} />
```

Note: `activeFilter` is threaded as a prop to panels in a future plan (Plan 2). For this plan, setting the state is sufficient — the tab navigation already works and panels will pick up the filter in Plan 2.

- [ ] **Step 8.7: Run lint and full test suite**

```bash
npm run lint && npm run test
```

Expected: no new errors, all existing tests pass

- [ ] **Step 8.8: Commit**

```bash
git add src/utils/adminWorkQueueNav.ts src/__tests__/adminWorkQueueNav.test.ts src/components/admin/AdminWorkQueuesPanel.tsx src/components/admin/AdminDashboardPage.tsx
git commit -m "feat: make Work Queue cards navigable — clicking routes to correct admin tab"
```

---

## Task 9: Fix CampaignTable Search

**Files:**
- Modify: `src/components/admin/CampaignTable.tsx`

The search input currently has no `onChange` handler. This task adds controlled state and client-side filtering.

- [ ] **Step 9.1: Add search state and filtered list**

Open `src/components/admin/CampaignTable.tsx`. Add state and filter logic:

```tsx
// Add import at top:
import { useState } from 'react';

// Inside CampaignTable component, before the return:
const [searchQuery, setSearchQuery] = useState('');

const filteredCampaigns = campaigns.filter(c => {
  if (!searchQuery.trim()) return true;
  const q = searchQuery.toLowerCase();
  return (
    c.name.toLowerCase().includes(q) ||
    c.advertiserName.toLowerCase().includes(q)
  );
});

// Update search input:
// Replace: <input type="text" placeholder={...} className={...} />
// With:
<input
  type="text"
  value={searchQuery}
  onChange={e => setSearchQuery(e.target.value)}
  placeholder={t('admin.campaigns.searchPlaceholder')}
  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
/>

// Update table body to use filteredCampaigns instead of campaigns:
// Replace: {campaigns.map(campaign => (
// With:    {filteredCampaigns.map(campaign => (

// Update empty state colSpan and condition:
// Replace: {campaigns.length === 0 && (
// With:    {filteredCampaigns.length === 0 && (
```

- [ ] **Step 9.2: Run lint**

```bash
npm run lint
```

- [ ] **Step 9.3: Commit**

```bash
git add src/components/admin/CampaignTable.tsx
git commit -m "fix: wire CampaignTable search input — was missing onChange handler"
```

---

## Task 10: Fix Bookings Panel — Replace Emoji + Truncate ID

**Files:**
- Modify: `src/components/admin/AdminBookingsPanel.tsx`

- [ ] **Step 10.1: Import StatusBadge and update Booking ID + boolean columns**

Open `src/components/admin/AdminBookingsPanel.tsx`. Make these changes:

```tsx
// Add import at top:
import { StatusBadge } from '@/components/ui/StatusBadge';

// Add boolean status maps after the existing STATUS_BADGE:
const BOOL_TRUE_CLS = 'bg-emerald-100 text-emerald-700';
const BOOL_FALSE_CLS = 'bg-red-100 text-red-700';
const BOOL_MAP: Record<string, string> = {
  true: BOOL_TRUE_CLS,
  false: BOOL_FALSE_CLS,
};

// Helper for boolean display:
function BoolBadge({ value, trueLabel, falseLabel }: { value: boolean; trueLabel: string; falseLabel: string }) {
  return (
    <StatusBadge
      value={String(value)}
      map={BOOL_MAP}
      label={value ? trueLabel : falseLabel}
      shape="pill"
    />
  );
}

// In the table row, replace the ID cell:
// Replace: <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.id}</td>
// With:
<td className="px-4 py-3 font-mono text-xs text-slate-600">
  <span title={b.id}>{b.id.slice(0, 8)}…</span>
</td>

// Replace the three boolean cells:
// Replace: <td className="px-4 py-3">{b.playlistAssigned ? '✅' : '❌'}</td>
// With:
<td className="px-4 py-3">
  <BoolBadge value={b.playlistAssigned} trueLabel="Assigned" falseLabel="Missing" />
</td>

// Replace: <td className="px-4 py-3">{b.paymentCleared ? '✅' : '❌'}</td>
// With:
<td className="px-4 py-3">
  <BoolBadge value={b.paymentCleared} trueLabel="Cleared" falseLabel="Pending" />
</td>

// Replace: <td className="px-4 py-3">{b.policyPassed ? '✅' : '❌'}</td>
// With:
<td className="px-4 py-3">
  <BoolBadge value={b.policyPassed} trueLabel="Passed" falseLabel="Failed" />
</td>
```

- [ ] **Step 10.2: Run lint and build check**

```bash
npm run lint && npm run build 2>&1 | tail -5
```

Expected: no errors

- [ ] **Step 10.3: Commit**

```bash
git add src/components/admin/AdminBookingsPanel.tsx
git commit -m "fix: replace emoji with StatusBadge in AdminBookingsPanel; truncate booking ID"
```

---

## Task 11: Final Verification

- [ ] **Step 11.1: Run full test suite**

```bash
npm run test
```

Expected: all tests pass, no regressions

- [ ] **Step 11.2: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build

- [ ] **Step 11.3: Run lint**

```bash
npm run lint
```

Expected: no errors

---

## Self-Review Checklist (already completed)

- **Spec P1 coverage:**
  - ✅ Work Queue cards clickable → Task 8
  - ✅ UUID display fixed (Proposals, Drafts, Launch Readiness, Coverage) → Tasks 1–7
  - ✅ CampaignTable search fixed → Task 9
  - ✅ Bookings emoji replaced → Task 10

- **Spec P4 coverage:**
  - ✅ Booking ID truncated to 8 chars + tooltip → Task 10
  - ⏭ Unify loading state language → deferred to Plan 2 (structural changes)
  - ⏭ Remove legacy Campaigns tab → deferred to Plan 2

- **No placeholders:** All tasks contain complete code.

- **Type consistency:** `WorkQueueKey` defined in Task 8.3, used in 8.5. `campaignName?: string` added to type in Task 2.1, consumed in Tasks 6 and 7. `resolveAdvertiserName` defined in Task 1.3, imported in Tasks 4 and 5.

---

## What Comes Next

- **Plan 2:** Admin Navigation Restructure — sidebar reorganization (12→9 tabs), section groupings, badge counts on tabs, panel action buttons (Proposals, Bookings), Launch Readiness go/no-go redesign
- **Plan 3:** CMS Adapter Foundation — `screens` table schema additions, `CMSAdapter` interface scaffold, Screens panel CMS columns
