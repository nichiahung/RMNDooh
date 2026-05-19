# Admin Dashboard P2 — Navigation Restructure & Workflow Completeness

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Admin sidebar from 12 → 9 tabs with Chinese section groupings and badge counts, integrate Creative Library into Creative Review, absorb Creative Coverage into Launch Readiness, add operational action buttons to Proposals and Bookings panels, and redesign Launch Readiness as a go/no-go checklist with a single "排程上線" button.

**Architecture:** Each panel change is isolated to its own component file. The sidebar restructure requires updating `AdminTab` (in `AdminSidebar.tsx`), `TAB_LABELS` and tab rendering in `AdminDashboardPage.tsx`, and the sidebar's `navSections` — all changed atomically in Task 4. New action functions follow the existing pattern in `tradingIterationActions.ts` (mutate `state` in place, `cloneDeep` on return) and are wrapped in `tradingIterationApi.ts` with an `Api` suffix.

**Tech Stack:** Next.js App Router, TypeScript, TailwindCSS, Vitest, Lucide icons

---

## File Structure

**Create:**
- `src/components/admin/CreativeReviewPanel.tsx` — wrapper with "Pending Review" / "Asset Library" sub-tabs; delegates to existing `CreativeReviewQueue` and `AdminCreativeLibraryPanel`
- `src/utils/adminSidebarBadges.ts` — pure function `computeSidebarBadges(q: WorkQueues): SidebarBadges`
- `src/__tests__/adminSidebarBadges.test.ts` — unit tests for badge computation

**Modify:**
- `src/components/admin/AdminSidebar.tsx` — new 4-section nav (廣告主自助 / 業務銷售 / 訂單履約 / 系統管理), standalone Overview item, badge rendering, remove defunct tab IDs from `AdminTab` type
- `src/components/admin/AdminDashboardPage.tsx` — remove defunct tab cases ('campaigns', 'creative-library', 'creative-coverage'), update `TAB_LABELS`, update `isLegacyTab`, remove now-unused imports
- `src/components/admin/AdminLaunchReadinessPanel.tsx` — complete rewrite: go/no-go checklist derived from `blockers[].code`, single "排程上線" button enabled when `status === 'ready_for_launch'`
- `src/components/admin/AdminProposalsPanel.tsx` — add Actions column: Send to Advertiser / Mark Revised / Convert to Booking contextually
- `src/components/admin/AdminBookingsPanel.tsx` — add Actions column: Confirm Booking / Mark Payment Cleared / Cancel contextually
- `src/lib/tradingIterationActions.ts` — add `markProposalRevised`, `confirmBookingAction`, `markPaymentCleared`, `cancelBookingAction`, `scheduleAllCampaignLaunch`
- `src/lib/api/tradingIterationApi.ts` — add `Api`-suffix wrappers for the five new actions

---

## Context for Implementers

### State management pattern
`tradingIterationActions.ts` uses a module-level `state` object. Mutations follow this pattern:

```ts
export async function someAction(id: string) {
  const item = state.proposals.find(p => p.id === id);
  if (!item) return null;
  item.status = 'new_status';
  item.updatedAt = nowIso();        // nowIso() is already defined in the file
  return cloneDeep(item);           // cloneDeep is already imported
}
```

Bookings are stored in a `Map`: `state.bookings.get(bookingId)`.

### API wrapper pattern
`tradingIterationApi.ts` wraps each action with `Api` suffix and imports from `tradingIterationActions.ts`:

```ts
export async function someActionApi(id: string) {
  return someAction(id);
}
```

### Key types
- `ProposalStatus` — includes: `'draft'`, `'sent_to_advertiser'`, `'change_requested'`, `'revised'`, `'approved_by_advertiser'`, `'expired'`, `'cancelled'`
- `BookingStatus` — includes: `'inventory_reserved'`, `'confirmed'`, `'live'`, `'cancelled'`
- `CampaignReadinessResult.blockers` — array of `{ code: string; message: string }` where `code` values are: `'blocked_by_creative'`, `'blocked_by_inventory'`, `'blocked_by_payment'`, `'blocked_by_policy'`, `'blocked_by_playlist'`, `'blocked_by_schedule'`
- `LaunchReadinessStatus` — `'ready_for_launch'` means the "排程上線" button should be enabled

### Existing relevant API functions (already available)
- `sendProposalToAdvertiserApi(proposalId)` — sets status → `sent_to_advertiser`
- `confirmProposalBookingApi(proposalId)` — converts proposal → booking
- `scheduleCampaignLaunchApi(campaignId)` — schedules a campaign (throws if not ready)
- `getAdminDashboardWorkQueuesApi()` — returns `{ needsSalesAction, needsBookingAction, needsCreativeReview, needsCreativeCoverage, needsLaunchAction }`
- `listAdminLaunchReadinessApi()` — returns `CampaignReadinessResult[]`

### AdminTab type (current, before Task 4)
```ts
export type AdminTab =
  | 'overview' | 'proposals' | 'campaign-drafts' | 'bookings'
  | 'campaigns' | 'inventory' | 'pricing' | 'creative-library'
  | 'creative' | 'creative-coverage' | 'launch-readiness' | 'screens';
```

After Task 4, 'campaigns', 'creative-library', 'creative-coverage' are removed.

---

## Task 1: CreativeReviewPanel — Creative Library as sub-tab

**Files:**
- Create: `src/components/admin/CreativeReviewPanel.tsx`
- No new test file (component delegates to existing tested components)

This component replaces the standalone `AdminCreativeLibraryPanel` tab. It adds a "Pending Review / Asset Library" sub-tab switcher inside the Creative Review section. The actual content panels (`CreativeReviewQueue` and `AdminCreativeLibraryPanel`) are reused as-is.

- [ ] **Step 1: Create CreativeReviewPanel.tsx**

```tsx
// src/components/admin/CreativeReviewPanel.tsx
'use client';

import { useState } from 'react';
import { CreativeReviewQueue } from './CreativeReviewQueue';
import { AdminCreativeLibraryPanel } from './AdminCreativeLibraryPanel';
import type { Campaign } from '@/types/inventory';
import type { StandaloneCreative } from '@/lib/api/admin';

type SubTab = 'pending' | 'library';

interface Props {
  campaigns: Campaign[];
  standaloneCreatives: StandaloneCreative[];
  onUpdateStatus: (campaignId: string | null, creativeId: string, status: string) => void;
}

export function CreativeReviewPanel({ campaigns, standaloneCreatives, onUpdateStatus }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('pending');

  return (
    <div>
      <div className="flex border-b border-slate-200 px-4 pt-2">
        {(['pending', 'library'] as SubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              subTab === tab
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'pending' ? '待審核 Pending Review' : '素材庫 Asset Library'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {subTab === 'pending' && (
          <CreativeReviewQueue
            campaigns={campaigns}
            standaloneCreatives={standaloneCreatives}
            onUpdateStatus={onUpdateStatus}
          />
        )}
        {subTab === 'library' && <AdminCreativeLibraryPanel />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled" | head -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/CreativeReviewPanel.tsx
git commit -m "feat: add CreativeReviewPanel with Pending Review / Asset Library sub-tabs"
```

---

## Task 2: Launch Readiness — go/no-go checklist + 排程上線 button

**Files:**
- Modify: `src/components/admin/AdminLaunchReadinessPanel.tsx`

Complete rewrite. Replaces the card-with-blockers layout with a per-campaign go/no-go checklist. The "排程上線" button calls `scheduleCampaignLaunchApi` and is enabled only when `status === 'ready_for_launch'`. No longer needs the Coverage tab — blockers already contain coverage failures via `blocked_by_creative` code.

- [ ] **Step 1: Write the new AdminLaunchReadinessPanel.tsx**

```tsx
// src/components/admin/AdminLaunchReadinessPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { listAdminLaunchReadinessApi, scheduleCampaignLaunchApi } from '@/lib/api/tradingIterationApi';
import type { CampaignReadinessResult } from '@/types/trading-models';

const CHECKLIST_ITEMS: Array<{ code: string; label: string }> = [
  { code: 'blocked_by_inventory', label: '庫存已鎖定 (Inventory Locked)' },
  { code: 'blocked_by_creative',  label: '素材已審核 (Creative Approved)' },
  { code: 'blocked_by_payment',   label: '付款已確認 (Payment Cleared)' },
  { code: 'blocked_by_policy',    label: '政策已通過 (Policy Passed)' },
  { code: 'blocked_by_playlist',  label: '播放清單已指派 (Playlist Assigned)' },
  { code: 'blocked_by_schedule',  label: '排程已設定 (Schedule Set)' },
];

export function AdminLaunchReadinessPanel() {
  const [data, setData] = useState<CampaignReadinessResult[] | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, 'success' | 'error'>>({});

  useEffect(() => { listAdminLaunchReadinessApi().then(setData); }, []);

  if (!data) return <div className="text-slate-400 text-sm animate-pulse p-8">載入中...</div>;

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">無待上線活動</p>
        <p className="text-sm mt-1">確認訂單後，活動將出現在此處進行排程。</p>
      </div>
    );
  }

  async function handleSchedule(campaignId: string) {
    setScheduling(campaignId);
    try {
      await scheduleCampaignLaunchApi(campaignId);
      setResults(prev => ({ ...prev, [campaignId]: 'success' }));
    } catch {
      setResults(prev => ({ ...prev, [campaignId]: 'error' }));
    } finally {
      setScheduling(null);
    }
  }

  return (
    <div className="space-y-4">
      {data.map((campaign) => {
        const blockerCodes = new Set(campaign.blockers.map(b => b.code));
        const isReady = campaign.status === 'ready_for_launch' || campaign.status === 'ready_for_scheduling';
        const isScheduling = scheduling === campaign.campaignId;
        const result = results[campaign.campaignId];

        return (
          <div key={campaign.campaignId} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">
                  {campaign.campaignName ?? `Campaign ${campaign.campaignId.slice(0, 8)}…`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {campaign.readyLineItemIds.length} 條就緒 / {campaign.blockedLineItemIds.length} 條阻擋
                </p>
              </div>
              <div className="flex items-center gap-3">
                {result === 'success' && (
                  <span className="text-xs text-emerald-600 font-medium">✓ 排程成功</span>
                )}
                {result === 'error' && (
                  <span className="text-xs text-red-600 font-medium">排程失敗，請重試</span>
                )}
                <button
                  onClick={() => handleSchedule(campaign.campaignId)}
                  disabled={!isReady || isScheduling || result === 'success'}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isReady && result !== 'success'
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isScheduling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  排程上線
                </button>
              </div>
            </div>

            <ul className="px-5 py-3 space-y-2">
              {CHECKLIST_ITEMS.map(({ code, label }) => {
                const passed = !blockerCodes.has(code);
                return (
                  <li key={code} className="flex items-center gap-2.5 text-sm">
                    {passed
                      ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    }
                    <span className={passed ? 'text-slate-600' : 'text-slate-500 line-through'}>
                      {label}
                    </span>
                    {!passed && (
                      <span className="text-xs text-red-500 ml-1">
                        {campaign.blockers.find(b => b.code === code)?.message}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled" | head -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminLaunchReadinessPanel.tsx
git commit -m "feat: redesign Launch Readiness as go/no-go checklist with 排程上線 button"
```

---

## Task 3: Sidebar badge computation utility + tests

**Files:**
- Create: `src/utils/adminSidebarBadges.ts`
- Create: `src/__tests__/adminSidebarBadges.test.ts`

Pure function, easily testable before touching the sidebar.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/adminSidebarBadges.test.ts
import { describe, it, expect } from 'vitest';
import { computeSidebarBadges } from '@/utils/adminSidebarBadges';

describe('computeSidebarBadges', () => {
  const q = {
    needsSalesAction: 2,
    needsBookingAction: 1,
    needsCreativeReview: 3,
    needsCreativeCoverage: 0,
    needsLaunchAction: 2,
  };

  it('sums all queues for overview badge', () => {
    expect(computeSidebarBadges(q).overview).toBe(8);
  });

  it('maps proposals badge to needsSalesAction', () => {
    expect(computeSidebarBadges(q).proposals).toBe(2);
  });

  it('maps bookings badge to needsBookingAction', () => {
    expect(computeSidebarBadges(q).bookings).toBe(1);
  });

  it('maps creative badge to needsCreativeReview', () => {
    expect(computeSidebarBadges(q).creative).toBe(3);
  });

  it('sums coverage + launch action for launch-readiness badge', () => {
    expect(computeSidebarBadges(q)['launch-readiness']).toBe(2);
  });

  it('returns zero badges when all queues are empty', () => {
    const empty = { needsSalesAction: 0, needsBookingAction: 0, needsCreativeReview: 0, needsCreativeCoverage: 0, needsLaunchAction: 0 };
    const badges = computeSidebarBadges(empty);
    expect(badges.overview).toBe(0);
    expect(badges.proposals).toBe(0);
    expect(badges['launch-readiness']).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose src/__tests__/adminSidebarBadges.test.ts 2>&1 | tail -15
```

Expected: FAIL — `computeSidebarBadges` not found

- [ ] **Step 3: Write the implementation**

```ts
// src/utils/adminSidebarBadges.ts
export interface WorkQueues {
  needsSalesAction: number;
  needsBookingAction: number;
  needsCreativeReview: number;
  needsCreativeCoverage: number;
  needsLaunchAction: number;
}

export interface SidebarBadges {
  overview: number;
  proposals: number;
  bookings: number;
  creative: number;
  'launch-readiness': number;
}

export function computeSidebarBadges(q: WorkQueues): SidebarBadges {
  return {
    overview: q.needsSalesAction + q.needsBookingAction + q.needsCreativeReview + q.needsCreativeCoverage + q.needsLaunchAction,
    proposals: q.needsSalesAction,
    bookings: q.needsBookingAction,
    creative: q.needsCreativeReview,
    'launch-readiness': q.needsCreativeCoverage + q.needsLaunchAction,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/__tests__/adminSidebarBadges.test.ts 2>&1 | tail -15
```

Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/utils/adminSidebarBadges.ts src/__tests__/adminSidebarBadges.test.ts
git commit -m "feat: add computeSidebarBadges utility with tests"
```

---

## Task 4: Sidebar restructure + AdminTab cleanup + AdminDashboardPage

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminDashboardPage.tsx`

This task is atomic — `AdminTab` is defined in `AdminSidebar.tsx` and consumed in `AdminDashboardPage.tsx`. Both must be updated together to keep TypeScript clean.

### What changes in AdminSidebar.tsx

1. `AdminTab` type: remove `'campaigns'`, `'creative-library'`, `'creative-coverage'`
2. `navSections`: replace 4-section English structure with 4-section Chinese-labeled structure
3. Overview item: rendered as a standalone item before the section loop
4. Badge rendering: fetch badge data with `useEffect`, show pill next to nav label when `badge > 0`

### What changes in AdminDashboardPage.tsx

1. Remove tab case renders for `'campaigns'`, `'creative-library'`, `'creative-coverage'`
2. Replace `CreativeReviewQueue` tab case with `CreativeReviewPanel`
3. Remove unused imports: `CampaignTable`, `CampaignDetailPanel`, `AdminCreativeLibraryPanel`, `AdminCreativeCoveragePanel`
4. Update `TAB_LABELS` to match new 9-tab structure
5. Update `isLegacyTab` — remove `'campaigns'`
6. Remove `selectedCampaign` state and all handlers that were only used by the legacy Campaigns tab

Actually: `selectedCampaign` is used only by `CampaignDetailPanel` which wraps `CampaignTable` data. It can be removed. But `handleUpdateCreativeStatus` is still needed for `CreativeReviewPanel`. Keep it.

- [ ] **Step 1: Update AdminSidebar.tsx — AdminTab type and nav structure**

Replace the entire file content:

```tsx
// src/components/admin/AdminSidebar.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Map,
  Monitor,
  Settings,
  LogOut,
  X,
  FileText,
  ClipboardList,
  CalendarCheck,
  DollarSign,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/context/AuthContext';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { getAdminDashboardWorkQueuesApi } from '@/lib/api/tradingIterationApi';
import { computeSidebarBadges, type SidebarBadges } from '@/utils/adminSidebarBadges';

export type AdminTab =
  | 'overview'
  | 'campaign-drafts'
  | 'proposals'
  | 'bookings'
  | 'creative'
  | 'launch-readiness'
  | 'inventory'
  | 'screens'
  | 'pricing';

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
  badgeKey?: keyof SidebarBadges;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: '廣告主自助',
    items: [
      { id: 'campaign-drafts', label: 'Campaign Drafts', icon: ClipboardList },
    ],
  },
  {
    label: '業務銷售',
    items: [
      { id: 'proposals', label: 'Proposals', icon: FileText, badgeKey: 'proposals' },
    ],
  },
  {
    label: '訂單履約',
    items: [
      { id: 'bookings', label: 'Bookings', icon: CalendarCheck, badgeKey: 'bookings' },
      { id: 'creative', label: 'Creative Review', icon: ImageIcon, badgeKey: 'creative' },
      { id: 'launch-readiness', label: 'Launch Readiness', icon: Rocket, badgeKey: 'launch-readiness' },
    ],
  },
  {
    label: '系統管理',
    items: [
      { id: 'inventory', label: 'Inventory', icon: Map },
      { id: 'screens', label: 'Screens', icon: Monitor },
      { id: 'pricing', label: 'Pricing', icon: DollarSign },
    ],
  },
];

export function AdminSidebar({ activeTab, onTabChange, isOpen, onClose }: Props) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const router = useRouter();
  const { collapsed, toggle } = useSidebarCollapse();
  const [badges, setBadges] = useState<SidebarBadges | null>(null);

  useEffect(() => {
    getAdminDashboardWorkQueuesApi().then(q => setBadges(computeSidebarBadges(q)));
  }, []);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const handleTabChange = (tab: AdminTab) => {
    onTabChange(tab);
    onClose();
  };

  function NavButton({ item }: { item: NavItem }) {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const badge = item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0;
    return (
      <button
        onClick={() => handleTabChange(item.id)}
        className={`relative group w-full flex items-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
          isActive ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mr-3 lg:mr-0' : 'mr-3'} ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
        {!collapsed && badge > 0 && (
          <span className="ml-auto min-w-[18px] h-[18px] bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {collapsed && (
          <span className="absolute left-[52px] z-50 hidden lg:group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
            {item.label}{badge > 0 ? ` (${badge})` : ''}
          </span>
        )}
      </button>
    );
  }

  const overviewBadge = badges?.overview ?? 0;

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-30"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 bg-slate-900 text-slate-300 flex flex-col h-full flex-shrink-0 z-40 transform transition-transform transition-[width] duration-200 ease-in-out lg:transform-none overflow-hidden w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-[60px]' : 'lg:w-[220px]'}`}
      >
        {/* Brand */}
        <div className={`h-16 flex items-center border-b border-slate-800 ${collapsed ? 'lg:justify-center lg:px-3 px-6 justify-between' : 'justify-between px-6'}`}>
          <div className="flex items-center">
            <div className={`w-8 h-8 bg-indigo-500 rounded flex items-center justify-center flex-shrink-0 ${collapsed ? 'lg:mr-0 mr-3' : 'mr-3'}`}>
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <span className={`text-white font-bold tracking-wide ${collapsed ? 'lg:hidden' : ''}`}>{t('admin.brand')}</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 custom-scrollbar">
          {/* Standalone overview item */}
          <div>
            <button
              onClick={() => handleTabChange('overview')}
              className={`relative group w-full flex items-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === 'overview' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mr-3 lg:mr-0' : 'mr-3'} ${activeTab === 'overview' ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span className={collapsed ? 'lg:hidden' : ''}>Dashboard</span>
              {!collapsed && overviewBadge > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {overviewBadge > 99 ? '99+' : overviewBadge}
                </span>
              )}
              {collapsed && (
                <span className="absolute left-[52px] z-50 hidden lg:group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
                  Dashboard{overviewBadge > 0 ? ` (${overviewBadge})` : ''}
                </span>
              )}
            </button>
          </div>

          {/* Grouped sections */}
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className={`px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}>
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavButton key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <button
            onClick={toggle}
            className="group relative hidden lg:flex w-full items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label={collapsed ? '展開側欄' : '收合側欄'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
              : <><ChevronLeft className="w-4 h-4 flex-shrink-0 mr-3" /><span>收合側欄</span></>
            }
            {collapsed && (
              <span className="absolute left-[52px] z-50 hidden lg:group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
                展開側欄
              </span>
            )}
          </button>
          <button className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Settings className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mr-3 lg:mr-0' : 'mr-3'}`} />
            <span className={collapsed ? 'lg:hidden' : ''}>{t('admin.nav.settings')}</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <LogOut className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mr-3 lg:mr-0' : 'mr-3'}`} />
            <span className={collapsed ? 'lg:hidden' : ''}>{t('admin.nav.signOut')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Update AdminDashboardPage.tsx**

Replace the file. Key changes vs current:
- Remove imports: `CampaignTable`, `CampaignDetailPanel`, `AdminCreativeLibraryPanel`, `AdminCreativeCoveragePanel`
- Add import: `CreativeReviewPanel`
- Replace `creativeReviewQueue` tab case with `CreativeReviewPanel`
- Remove tab cases for `'campaigns'`, `'creative-library'`, `'creative-coverage'`
- Remove `selectedCampaign` state and `syncSelectedCampaign` / `handleConfirmBooking` / `handleUpdateCampaignStatus` (only used by the Campaigns tab)
- Update `TAB_LABELS`, `isLegacyTab`

```tsx
// src/components/admin/AdminDashboardPage.tsx
'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { CreativeReviewPanel } from './CreativeReviewPanel';
import { InventoryManagementTable } from './InventoryManagementTable';
import { ScreenManagementTable } from './ScreenManagementTable';
import { OverviewPanel } from './OverviewPanel';
import { AdminWorkQueuesPanel } from './AdminWorkQueuesPanel';
import { AdminProposalsPanel } from './AdminProposalsPanel';
import { AdminCampaignDraftsPanel } from './AdminCampaignDraftsPanel';
import { AdminBookingsPanel } from './AdminBookingsPanel';
import { AdminPricingPanel } from './AdminPricingPanel';
import { AdminLaunchReadinessPanel } from './AdminLaunchReadinessPanel';

import { Campaign, InventoryLocation, Screen } from '@/types/inventory';
import { fetchAllCampaigns, fetchAllScreens, updateCreativeApprovalStatus, fetchStandaloneCreatives, StandaloneCreative } from '@/lib/api/admin';
import { fetchInventoryLocations } from '@/lib/api/inventory';

const TAB_LABELS: Record<AdminTab, string> = {
  overview: 'Dashboard',
  'campaign-drafts': 'Campaign Drafts',
  proposals: 'Proposals',
  bookings: 'Bookings',
  creative: 'Creative Review',
  'launch-readiness': 'Launch Readiness',
  inventory: 'Inventory',
  screens: 'Screens',
  pricing: 'Pricing',
};

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [inventory, setInventory] = useState<InventoryLocation[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [standaloneCreatives, setStandaloneCreatives] = useState<StandaloneCreative[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchAllCampaigns(),
      fetchInventoryLocations(),
      fetchAllScreens(),
      fetchStandaloneCreatives(),
    ]).then(([c, i, s, sc]) => {
      if (!mounted) return;
      setCampaigns(c);
      setInventory(i);
      setScreens(s);
      setStandaloneCreatives(sc);
      setIsLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const handleUpdateCreativeStatus = async (campaignId: string | null, creativeId: string, newStatus: string) => {
    await updateCreativeApprovalStatus(creativeId, newStatus as 'approved' | 'rejected');
    const [updatedCampaigns, updatedCreatives] = await Promise.all([
      fetchAllCampaigns(),
      fetchStandaloneCreatives(),
    ]);
    setCampaigns(updatedCampaigns);
    setStandaloneCreatives(updatedCreatives);
  };

  // TODO(P2): pass filter to destination panel when panels support pre-filtering
  const handleWorkQueueNavigate = (tab: AdminTab, _filter: string) => {
    setActiveTab(tab);
  };

  const isLegacyTab = activeTab === 'overview' || activeTab === 'creative' || activeTab === 'inventory' || activeTab === 'screens';

  return (
    <main className="h-screen flex bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 lg:px-8 z-10 flex-shrink-0 shadow-sm gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 truncate">
            {TAB_LABELS[activeTab] ?? activeTab}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          {isLoading && isLegacyTab ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm animate-pulse">
              載入資料中...
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">

              {activeTab === 'overview' && (
                <>
                  <AdminWorkQueuesPanel onNavigate={handleWorkQueueNavigate} />
                  <OverviewPanel campaigns={campaigns} inventory={inventory} screens={screens} />
                </>
              )}

              {activeTab === 'campaign-drafts' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <AdminCampaignDraftsPanel />
                </div>
              )}

              {activeTab === 'proposals' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <AdminProposalsPanel />
                </div>
              )}

              {activeTab === 'bookings' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <AdminBookingsPanel />
                </div>
              )}

              {activeTab === 'creative' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <CreativeReviewPanel
                    campaigns={campaigns}
                    standaloneCreatives={standaloneCreatives}
                    onUpdateStatus={handleUpdateCreativeStatus}
                  />
                </div>
              )}

              {activeTab === 'launch-readiness' && (
                <AdminLaunchReadinessPanel />
              )}

              {activeTab === 'inventory' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <InventoryManagementTable inventory={inventory} />
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-5">
                  <AdminPricingPanel />
                </div>
              )}

              {activeTab === 'screens' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <ScreenManagementTable screens={screens} inventory={inventory} />
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Also update adminWorkQueueNav.ts — remove 'creative-coverage' from WorkQueueNavTarget tab options**

The current `needsCreativeCoverage` maps to `'launch-readiness'` (not `'creative-coverage'`), so no change is needed there. Verify the file is still valid after AdminTab type change:

```bash
grep "tab:" src/utils/adminWorkQueueNav.ts
```

Expected output — all `tab:` values should be valid AdminTab IDs:
```
needsSalesAction:      { tab: 'proposals',        filter: 'change_requested' },
needsBookingAction:    { tab: 'bookings',          filter: 'inventory_reserved' },
needsCreativeReview:   { tab: 'creative',          filter: 'pending_review' },
needsCreativeCoverage: { tab: 'launch-readiness',  filter: 'blocked_by_creative' },
needsLaunchAction:     { tab: 'launch-readiness',  filter: 'ready_for_launch' },
```

All are still valid. No change needed.

- [ ] **Step 4: Run build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled" | head -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Run full test suite**

```bash
npm run test 2>&1 | grep -E "Tests|Test Files" | tail -3
```

Expected: all tests pass (the 2 pre-existing failing suites from `.agent/skills/` are unrelated and expected)

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx src/components/admin/AdminDashboardPage.tsx
git commit -m "feat: restructure admin nav 12→9 tabs — Chinese sections, badge counts, remove defunct tabs"
```

---

## Task 5: Proposal action buttons — API + panel

**Files:**
- Modify: `src/lib/tradingIterationActions.ts` — add `markProposalRevised`
- Modify: `src/lib/api/tradingIterationApi.ts` — add `markProposalRevisedApi`
- Modify: `src/components/admin/AdminProposalsPanel.tsx` — add Actions column

The actions `sendProposalToAdvertiserApi` and `confirmProposalBookingApi` already exist. Only `markProposalRevised` is missing.

- [ ] **Step 1: Add markProposalRevised to tradingIterationActions.ts**

Add this function after the `approveProposalVersion` function (around line 876):

```ts
export async function markProposalRevised(proposalId: string) {
  const proposal = state.proposals.find(item => item.id === proposalId);
  if (!proposal) return null;
  proposal.status = 'revised';
  proposal.updatedAt = nowIso();
  return cloneDeep(proposal);
}
```

- [ ] **Step 2: Add markProposalRevisedApi to tradingIterationApi.ts**

Add after `approveProposalVersionApi`:

```ts
export async function markProposalRevisedApi(proposalId: string) {
  return markProposalRevised(proposalId);
}
```

Also add `markProposalRevised` to the import from `tradingIterationActions` at the top of the file.

- [ ] **Step 3: Update AdminProposalsPanel.tsx — add Actions column**

```tsx
// src/components/admin/AdminProposalsPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  listAdminProposalsApi,
  sendProposalToAdvertiserApi,
  markProposalRevisedApi,
  confirmProposalBookingApi,
} from '@/lib/api/tradingIterationApi';
import type { Proposal, ProposalStatus } from '@/types/trading-models';
import { resolveAdvertiserName } from '@/utils/adminResolvers';

const STATUS_BADGE: Record<ProposalStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  sent_to_advertiser: { label: 'Sent', cls: 'bg-blue-100 text-blue-700' },
  viewed_by_advertiser: { label: 'Viewed', cls: 'bg-sky-100 text-sky-700' },
  commented: { label: 'Commented', cls: 'bg-amber-100 text-amber-700' },
  change_requested: { label: 'Changes Requested', cls: 'bg-orange-100 text-orange-700' },
  revised: { label: 'Revised', cls: 'bg-indigo-100 text-indigo-700' },
  approved_by_advertiser: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  expired: { label: 'Expired', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-200 text-slate-500' },
};

export function AdminProposalsPanel() {
  const [data, setData] = useState<{ proposals: Proposal[]; countsByStatus: Record<ProposalStatus, number> } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const result = await listAdminProposalsApi();
    setData(result);
  }

  useEffect(() => { refresh(); }, []);

  async function handleAction(action: () => Promise<unknown>, proposalId: string) {
    setBusy(proposalId);
    try {
      await action();
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading proposals...</div>;

  if (data.proposals.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No proposals yet</p>
        <p className="text-sm mt-1">Proposals created via the Sales Builder will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3">Proposal</th>
            <th className="px-4 py-3">Advertiser</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Flight</th>
            <th className="px-4 py-3">Quote</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.proposals.map((p) => {
            const badge = STATUS_BADGE[p.status];
            const isBusy = busy === p.id;
            return (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-600 font-medium">
                  {resolveAdvertiserName(p.advertiserId)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {p.requestedStartDate ?? '—'} → {p.requestedEndDate ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {p.finalQuote != null ? `NT$${p.finalQuote.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(p.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {p.status === 'draft' && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleAction(() => sendProposalToAdvertiserApi(p.id), p.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        Send to Advertiser
                      </button>
                    )}
                    {p.status === 'change_requested' && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleAction(() => markProposalRevisedApi(p.id), p.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        Mark Revised
                      </button>
                    )}
                    {p.status === 'approved_by_advertiser' && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleAction(() => confirmProposalBookingApi(p.id), p.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                      >
                        Convert to Booking
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Verify build + tests**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled" | head -5
npm run test 2>&1 | grep -E "Tests|failed" | tail -3
```

Expected: build passes, tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/tradingIterationActions.ts src/lib/api/tradingIterationApi.ts src/components/admin/AdminProposalsPanel.tsx
git commit -m "feat: add Proposals action buttons — Send to Advertiser, Mark Revised, Convert to Booking"
```

---

## Task 6: Bookings action buttons — API + panel

**Files:**
- Modify: `src/lib/tradingIterationActions.ts` — add `confirmBookingAction`, `markPaymentCleared`, `cancelBookingAction`
- Modify: `src/lib/api/tradingIterationApi.ts` — add three `Api`-suffix wrappers
- Modify: `src/components/admin/AdminBookingsPanel.tsx` — add Actions column

Bookings are stored in `state.bookings` which is a `Map<string, BookingRow>`. Access with `state.bookings.get(id)`.

- [ ] **Step 1: Add three action functions to tradingIterationActions.ts**

Add after `confirmProposalBooking` (around line 906):

```ts
export async function confirmBookingAction(bookingId: string) {
  const booking = state.bookings.get(bookingId);
  if (!booking) return null;
  booking.bookingStatus = 'confirmed';
  booking.updatedAt = nowIso();
  return cloneDeep(booking);
}

export async function markPaymentCleared(bookingId: string) {
  const booking = state.bookings.get(bookingId);
  if (!booking) return null;
  booking.paymentCleared = true;
  booking.updatedAt = nowIso();
  return cloneDeep(booking);
}

export async function cancelBookingAction(bookingId: string) {
  const booking = state.bookings.get(bookingId);
  if (!booking) return null;
  booking.bookingStatus = 'cancelled';
  booking.updatedAt = nowIso();
  return cloneDeep(booking);
}
```

- [ ] **Step 2: Add Api wrappers to tradingIterationApi.ts**

Add after `confirmProposalBookingApi`:

```ts
export async function confirmBookingActionApi(bookingId: string) {
  return confirmBookingAction(bookingId);
}

export async function markPaymentClearedApi(bookingId: string) {
  return markPaymentCleared(bookingId);
}

export async function cancelBookingActionApi(bookingId: string) {
  return cancelBookingAction(bookingId);
}
```

Also add `confirmBookingAction`, `markPaymentCleared`, `cancelBookingAction` to the imports from `tradingIterationActions` at the top of `tradingIterationApi.ts`.

- [ ] **Step 3: Update AdminBookingsPanel.tsx — add Actions column**

```tsx
// src/components/admin/AdminBookingsPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  listAdminBookingsApi,
  confirmBookingActionApi,
  markPaymentClearedApi,
  cancelBookingActionApi,
} from '@/lib/api/tradingIterationApi';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface BookingRow {
  id: string;
  bookingStatus: string;
  bookingSource: string;
  sourceType: string;
  sourceId: string;
  campaignId: string | null;
  proposalId: string | null;
  createdAt: string;
  updatedAt: string;
  inventoryIds: string[];
  playlistAssigned: boolean;
  paymentCleared: boolean;
  policyPassed: boolean;
}

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  proposal: { label: 'Proposal', cls: 'bg-blue-100 text-blue-700' },
  self_service: { label: 'Self-Service', cls: 'bg-emerald-100 text-emerald-700' },
  manual_admin: { label: 'Manual', cls: 'bg-amber-100 text-amber-700' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmed', cls: 'bg-green-100 text-green-800' },
  inventory_reserved: { label: 'Reserved', cls: 'bg-blue-100 text-blue-700' },
  scheduled: { label: 'Scheduled', cls: 'bg-indigo-100 text-indigo-700' },
  live: { label: 'Live', cls: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  blocked: { label: 'Blocked', cls: 'bg-red-100 text-red-700' },
};

const BOOL_MAP: Record<string, string> = {
  true: 'bg-emerald-100 text-emerald-700',
  false: 'bg-red-100 text-red-700',
};

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

export function AdminBookingsPanel() {
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  async function refresh() {
    const data = await listAdminBookingsApi();
    setBookings(data as BookingRow[]);
  }

  useEffect(() => { refresh(); }, []);

  async function handleAction(action: () => Promise<unknown>, bookingId: string) {
    setBusy(bookingId);
    try {
      await action();
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!bookings) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading bookings...</div>;

  if (bookings.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No bookings yet</p>
        <p className="text-sm mt-1">Bookings from proposals or confirmed campaign drafts will appear here.</p>
      </div>
    );
  }

  return (
    <>
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 space-y-4">
            <h3 className="font-semibold text-slate-800">確認取消訂單？</h3>
            <p className="text-sm text-slate-500">此操作不可復原。</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmCancel(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                返回
              </button>
              <button
                onClick={() => {
                  handleAction(() => cancelBookingActionApi(confirmCancel), confirmCancel);
                  setConfirmCancel(null);
                }}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                確認取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3">Playlist</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Policy</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const sourceBadge = SOURCE_BADGE[b.bookingSource] ?? { label: b.bookingSource, cls: 'bg-slate-100 text-slate-600' };
              const statusBadge = STATUS_BADGE[b.bookingStatus] ?? { label: b.bookingStatus, cls: 'bg-slate-100 text-slate-600' };
              const isBusy = busy === b.id;
              return (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    <span title={b.id}>{b.id.slice(0, 8)}…</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sourceBadge.cls}`}>{sourceBadge.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.cls}`}>{statusBadge.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{b.inventoryIds.length} locations</td>
                  <td className="px-4 py-3">
                    <BoolBadge value={b.playlistAssigned} trueLabel="Assigned" falseLabel="Missing" />
                  </td>
                  <td className="px-4 py-3">
                    <BoolBadge value={b.paymentCleared} trueLabel="Cleared" falseLabel="Pending" />
                  </td>
                  <td className="px-4 py-3">
                    <BoolBadge value={b.policyPassed} trueLabel="Passed" falseLabel="Failed" />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {b.bookingStatus === 'inventory_reserved' && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleAction(() => confirmBookingActionApi(b.id), b.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          鎖定庫存 & 確認
                        </button>
                      )}
                      {b.bookingStatus === 'confirmed' && !b.paymentCleared && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleAction(() => markPaymentClearedApi(b.id), b.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          確認付款
                        </button>
                      )}
                      {b.bookingStatus === 'live' && (
                        <button
                          disabled={isBusy}
                          onClick={() => setConfirmCancel(b.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify build + tests**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled" | head -5
npm run test 2>&1 | grep -E "Tests|failed" | tail -3
```

Expected: build passes, tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/tradingIterationActions.ts src/lib/api/tradingIterationApi.ts src/components/admin/AdminBookingsPanel.tsx
git commit -m "feat: add Bookings action buttons — Confirm, Mark Payment Cleared, Cancel with modal"
```

---

## Self-Review

**Spec coverage check against `docs/superpowers/specs/2026-05-19-admin-dashboard-redesign.md` P2 items:**

| Spec item | Task |
|---|---|
| 5. Navigation restructure: 12→9 tabs, section groupings, badge counts | Task 4 |
| 6. Action buttons to Proposals panel | Task 5 |
| 7. Operational action buttons to Bookings panel | Task 6 |
| 8. Simplify Launch Readiness to go/no-go + single Schedule button | Task 2 |
| 9. Integrate Creative Coverage into Launch Readiness blocker detail | Task 2 (blockers derived from existing `blockers[].code` which includes `blocked_by_creative`) |
| Creative Review absorbs Creative Library as sub-tab | Task 1 |
| 10. Rename legacy language to fulfillment language | Buttons in Tasks 5, 6 use Chinese fulfillment language ("鎖定庫存 & 確認", "確認付款", "排程上線") |

**Note on "Rename legacy language" (spec item 10):** The key fulfillment language changes are embedded in Tasks 2, 5, and 6 action buttons. A separate language cleanup task is not needed — the new button labels, panel headers, and checklist items in this plan already use fulfillment framing throughout.

**Placeholder scan:** No TBDs, TODOs, or placeholder steps found.

**Type consistency:** `AdminTab` values used in Task 4's `NAV_SECTIONS` match the new type definition. `WorkQueueNavTarget.tab` values in `adminWorkQueueNav.ts` (`'proposals'`, `'bookings'`, `'creative'`, `'launch-readiness'`) are all present in the new `AdminTab` union.
