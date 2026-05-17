# App Shell Redesign — B+C Hybrid Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the top-header `AppNav` with a persistent role-based collapsible sidebar (`AppShell`), eliminate the redundant "我的活動" tab, give each role a tailored home view, and restyle the admin sidebar to match the new design system.

**Architecture:** A new `(shell)` Next.js route group shares a layout that wraps every non-login, non-admin page in `AppShell`. The shell renders a collapsible `AppSidebar` (220px ↔ 60px icon rail) whose nav items come from a static role-filtered config. `WorkspacePage` is replaced by `HomeView`. `AppNav` is deleted. The admin route keeps its own `AdminSidebar`, restyled to use the same CSS tokens and collapse behavior.

**Tech Stack:** Next.js 16.2.6 App Router (static export), React 19.2.4, TailwindCSS, Lucide React, TypeScript, Vitest (node environment — no jsdom; component tests are manual browser checks)

**Next.js 16 note:** Before implementing Task 6 route-group/layout changes, read the relevant docs under `node_modules/next/dist/docs/` for App Router layouts and route groups. This repo's `AGENTS.md` explicitly warns that this Next.js version has breaking changes from older assumptions.

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-05-17-app-shell-redesign.md`
- Auth: `src/context/AuthContext.tsx`, `src/utils/mockAuth.ts`
- APIs used: `listCampaignSummaries()` from `src/lib/api/campaign-draft.ts`, `listAdminProposalsApi()` from `src/lib/api/tradingIterationApi.ts`
- Types: `src/types/campaign-draft.ts` (CampaignDraft, CampaignDraftStatus), `src/types/trading-models.ts` (Proposal, ProposalStatus)
- `listAdminProposalsApi()` returns `{ proposals: Proposal[], countsByStatus: Record<ProposalStatus, number> }`
- `listCampaignSummaries()` returns `Array<CampaignDraft & { inventoryIds: string[]; inventoryCount: number; uploadedCount: number; totalCount: number }>`

---

## File Map

### New files

| File | Purpose |
|---|---|
| `src/hooks/useSidebarCollapse.ts` | localStorage-backed collapse state |
| `src/components/shell/navConfig.ts` | Static role-filtered nav config |
| `src/components/shell/AppSidebar.tsx` | Collapsible sidebar component |
| `src/components/shell/AppShell.tsx` | Layout wrapper: sidebar + content area |
| `src/components/shell/HomeView.tsx` | Home dashboard replacing WorkspacePage |
| `src/app/(shell)/layout.tsx` | Route group layout: AuthGuard + AppShell |
| `src/app/(shell)/page.tsx` | Root route (replaces `src/app/page.tsx`) |
| `src/app/(shell)/campaign-planner/page.tsx` | Replaces `src/app/campaign-planner/page.tsx` |
| `src/app/(shell)/assets/page.tsx` | Replaces `src/app/assets/page.tsx` |
| `src/app/(shell)/reports/page.tsx` | Replaces `src/app/reports/page.tsx` |
| `src/app/(shell)/proposal-builder/page.tsx` | Replaces `src/app/proposal-builder/page.tsx` |
| `src/app/(shell)/proposal-review/page.tsx` | Replaces `src/app/proposal-review/page.tsx` |
| `src/__tests__/navConfig.test.ts` | Unit tests for navConfig role filtering |

### Modified files

| File | Change |
|---|---|
| `src/app/login/page.tsx` | Admin routes to `/admin` on login |
| `src/components/admin/AdminSidebar.tsx` | Add collapse toggle + icon rail |
| `src/components/campaign-planner/CampaignPlannerPage.tsx` | Remove `campaigns` tab + `CampaignsTabContent` |

### Deleted files

| File | Reason |
|---|---|
| `src/app/page.tsx` | Moved to `src/app/(shell)/page.tsx` |
| `src/app/campaign-planner/page.tsx` | Moved to `src/app/(shell)/campaign-planner/page.tsx` |
| `src/app/assets/page.tsx` | Moved to `src/app/(shell)/assets/page.tsx` |
| `src/app/reports/page.tsx` | Moved to `src/app/(shell)/reports/page.tsx` |
| `src/app/proposal-builder/page.tsx` | Moved to `src/app/(shell)/proposal-builder/page.tsx` |
| `src/app/proposal-review/page.tsx` | Moved to `src/app/(shell)/proposal-review/page.tsx` |
| `src/components/AppNav.tsx` | Replaced by AppSidebar |
| `src/components/workspace/WorkspacePage.tsx` | Replaced by HomeView |

Deletion rule: delete `AppNav.tsx`, `WorkspacePage.tsx`, or old route files only after `rg` confirms they are no longer imported and no duplicate App Router route exists. If `DashboardPage.tsx` is still the only importer of `AppNav.tsx`, either retire/delete `DashboardPage.tsx` in the same cleanup or keep `AppNav.tsx` until a later legacy cleanup.

---

## Task 1: `useSidebarCollapse` hook

**Files:**
- Create: `src/hooks/useSidebarCollapse.ts`

**Context:** This hook reads/writes `localStorage` to persist whether the sidebar is collapsed. It initializes synchronously from localStorage so there is no flash of wrong state on load. The Vitest environment is `node`, so this hook cannot be unit-tested — it is verified manually in the browser.

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useSidebarCollapse.ts
'use client';
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'sidebar_collapsed';

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable (private browsing)
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSidebarCollapse.ts
git commit -m "feat: add useSidebarCollapse hook with localStorage persistence"
```

---

## Task 2: `navConfig.ts` + unit tests

**Files:**
- Create: `src/components/shell/navConfig.ts`
- Create: `src/__tests__/navConfig.test.ts`

**Context:** The nav config is pure data — no React, no DOM. It CAN be tested in Vitest's `node` environment. `admin` maps to an empty array because admin uses `AdminSidebar` at `/admin`, not the App Shell.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/navConfig.test.ts
import { NAV_CONFIG } from '@/components/shell/navConfig';

describe('NAV_CONFIG', () => {
  it('advertiser has 首頁, 活動規劃, 我的提案, 素材庫, 成效報告', () => {
    const items = NAV_CONFIG.advertiser.flatMap(s => s.items);
    const hrefs = items.map(i => i.href);
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/campaign-planner');
    expect(hrefs).toContain('/proposal-review');
    expect(hrefs).toContain('/assets');
    expect(hrefs).toContain('/reports');
  });

  it('advertiser does not have any sales-only items', () => {
    const items = NAV_CONFIG.advertiser.flatMap(s => s.items);
    const ids = items.map(i => i.id);
    expect(ids).not.toContain('proposals-pending');
  });

  it('sales has 首頁, 待處理提案, 所有提案, 業績報告', () => {
    const items = NAV_CONFIG.sales.flatMap(s => s.items);
    const hrefs = items.map(i => i.href);
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/proposal-review');
    expect(hrefs).toContain('/proposal-builder');
    expect(hrefs).toContain('/reports');
  });

  it('sales 待處理提案 has proposals_pending badge', () => {
    const items = NAV_CONFIG.sales.flatMap(s => s.items);
    const pending = items.find(i => i.id === 'proposals-pending');
    expect(pending?.badge).toBe('proposals_pending');
  });

  it('sales does not have campaign-planner', () => {
    const items = NAV_CONFIG.sales.flatMap(s => s.items);
    const hrefs = items.map(i => i.href);
    expect(hrefs).not.toContain('/campaign-planner');
  });

  it('admin maps to empty array (admin uses AdminSidebar at /admin)', () => {
    expect(NAV_CONFIG.admin).toEqual([]);
  });

  it('all items have id, label, and href starting with /', () => {
    (['advertiser', 'sales'] as const).forEach(role => {
      NAV_CONFIG[role].flatMap(s => s.items).forEach(item => {
        expect(typeof item.id).toBe('string');
        expect(typeof item.label).toBe('string');
        expect(item.href.startsWith('/')).toBe(true);
      });
    });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- navConfig
```

Expected: `FAIL` with "Cannot find module '@/components/shell/navConfig'"

- [ ] **Step 3: Create `navConfig.ts`**

```typescript
// src/components/shell/navConfig.ts
import {
  Home,
  Megaphone,
  FileText,
  Image as ImageIcon,
  BarChart2,
  ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/utils/mockAuth';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: 'proposals_pending';
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_CONFIG: Record<Role, NavSection[]> = {
  advertiser: [
    {
      label: '主選單',
      items: [
        { id: 'home', label: '首頁', icon: Home, href: '/' },
      ],
    },
    {
      label: '廣告活動',
      items: [
        { id: 'campaign-planner', label: '活動規劃', icon: Megaphone, href: '/campaign-planner' },
        { id: 'proposals', label: '我的提案', icon: FileText, href: '/proposal-review' },
      ],
    },
    {
      label: '素材',
      items: [
        { id: 'assets', label: '素材庫', icon: ImageIcon, href: '/assets' },
      ],
    },
    {
      label: '數據',
      items: [
        { id: 'reports', label: '成效報告', icon: BarChart2, href: '/reports' },
      ],
    },
  ],
  sales: [
    {
      label: '主選單',
      items: [
        { id: 'home', label: '首頁', icon: Home, href: '/' },
      ],
    },
    {
      label: '提案管理',
      items: [
        { id: 'proposals-pending', label: '待處理提案', icon: FileText, href: '/proposal-review', badge: 'proposals_pending' },
        { id: 'proposals-all', label: '所有提案', icon: ClipboardList, href: '/proposal-builder' },
      ],
    },
    {
      label: '數據',
      items: [
        { id: 'reports', label: '業績報告', icon: BarChart2, href: '/reports' },
      ],
    },
  ],
  admin: [],
};
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- navConfig
```

Expected: `PASS` — 7 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/navConfig.ts src/__tests__/navConfig.test.ts
git commit -m "feat: add role-based nav config with unit tests"
```

---

## Task 3: `AppSidebar` component

**Files:**
- Create: `src/components/shell/AppSidebar.tsx`

**Context:** Client component. Uses `useSidebarCollapse` for width, `usePathname()` for active state, fetches campaign sub-items (advertiser) and badge counts (sales) on mount. Tooltips use CSS `group-hover:block` — they are `hidden` by default and `block` on parent hover. The campaign sub-items appear only under the 活動規劃 section when expanded.

Design tokens: `bg-slate-800`, active `bg-indigo-500/20 text-indigo-300`, hover `hover:bg-white/[0.07]`, section label `text-slate-500`, badge `bg-amber-500`.

`listAdminProposalsApi()` returns `{ proposals, countsByStatus }`. The sales pending badge should represent proposals that need follow-up, not only change requests. For MVP, count proposals with status `sent_to_advertiser`, `viewed_by_advertiser`, `change_requested`, or `revised`.

- [ ] **Step 1: Create `AppSidebar.tsx`**

```tsx
// src/components/shell/AppSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Monitor, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { NAV_CONFIG, type NavItem } from './navConfig';
import { listCampaignSummaries } from '@/lib/api/campaign-draft';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';

type CampaignSummary = Awaited<ReturnType<typeof listCampaignSummaries>>[number];

export function AppSidebar() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarCollapse();

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [pendingProposalCount, setPendingProposalCount] = useState(0);

  const role = currentUser?.role ?? 'advertiser';
  const sections = NAV_CONFIG[role] ?? [];

  useEffect(() => {
    if (role === 'advertiser') {
      listCampaignSummaries()
        .then(all => setCampaigns(all.slice(0, 5)))
        .catch(() => setCampaigns([]));
    }
    if (role === 'sales') {
      listAdminProposalsApi()
        .then(({ countsByStatus }) => {
          setPendingProposalCount(
            (countsByStatus.sent_to_advertiser ?? 0) +
            (countsByStatus.viewed_by_advertiser ?? 0) +
            (countsByStatus.change_requested ?? 0) +
            (countsByStatus.revised ?? 0),
          );
        })
        .catch(() => setPendingProposalCount(0));
    }
  }, [role]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  function resolveBadge(badge: NavItem['badge']): number {
    if (badge === 'proposals_pending') return pendingProposalCount;
    return 0;
  }

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`bg-slate-800 border-r border-slate-700 flex flex-col h-full flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
        collapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      {/* Brand */}
      <div className="h-14 flex items-center px-3 border-b border-slate-700 flex-shrink-0">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Monitor className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="ml-3 text-white font-bold text-sm tracking-wide whitespace-nowrap">DRMN</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const badgeCount = resolveBadge(item.badge);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`group relative flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                    )}
                    {!collapsed && badgeCount > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {badgeCount}
                      </span>
                    )}
                    {collapsed && (
                      <span className="absolute left-[52px] z-50 hidden group-hover:block bg-slate-900 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
                        {item.label}{badgeCount > 0 ? ` (${badgeCount})` : ''}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Campaign sub-items under 活動規劃 (advertiser only, expanded only) */}
            {!collapsed &&
              role === 'advertiser' &&
              section.items.some(i => i.id === 'campaign-planner') &&
              campaigns.length > 0 && (
                <div className="mt-1 ml-3 space-y-0.5">
                  {campaigns.map(c => (
                    <Link
                      key={c.id}
                      href={`/campaign-planner?id=${c.id}`}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                      <span className="truncate max-w-[140px]">{c.name}</span>
                    </Link>
                  ))}
                </div>
              )}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-slate-700 space-y-0.5">
        <button
          onClick={toggle}
          className="group relative w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 transition-colors text-sm font-medium"
          aria-label={collapsed ? '展開側欄' : '收合側欄'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
            : <ChevronLeft className="w-4 h-4 flex-shrink-0" />}
          {!collapsed && <span className="whitespace-nowrap">收合側欄</span>}
          {collapsed && (
            <span className="absolute left-[52px] z-50 hidden group-hover:block bg-slate-900 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
              展開側欄
            </span>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="group relative w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 transition-colors text-sm font-medium"
          aria-label="登出"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">登出</span>}
          {collapsed && (
            <span className="absolute left-[52px] z-50 hidden group-hover:block bg-slate-900 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
              登出
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no new errors from this file

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/AppSidebar.tsx
git commit -m "feat: add AppSidebar with collapsible icon rail and role-based nav"
```

---

## Task 4: `AppShell` component

**Files:**
- Create: `src/components/shell/AppShell.tsx`

**Context:** `AppShell` is the layout wrapper. Uses `h-screen flex overflow-hidden` — the same pattern as `CampaignPlannerPage` — so the sidebar and content both fill the viewport without double scrollbars. Content area is `flex-1 overflow-y-auto` so individual pages scroll independently.

- [ ] **Step 1: Create `AppShell.tsx`**

```tsx
// src/components/shell/AppShell.tsx
'use client';

import { AppSidebar } from './AppSidebar';

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/AppShell.tsx
git commit -m "feat: add AppShell layout wrapper with persistent sidebar"
```

---

## Task 5: `HomeView` component

**Files:**
- Create: `src/components/shell/HomeView.tsx`

**Context:** `HomeView` replaces `WorkspacePage`. It reads the user's role from `useAuth()` and renders either `AdvertiserHome` or `SalesHome`. Both sub-components fetch their own data on mount — this duplicates some fetches that `AppSidebar` also makes, which is acceptable for MVP.

`AdvertiserHome`: greeting, hero card (most important unfinished campaign from `listCampaignSummaries()`), quick action buttons, performance summary aggregated from `mockReportData`, active campaign/status list, pending actions, and AI/performance insights.

`SalesHome`: greeting, proposal pipeline counts from `countsByStatus`, follow-up queue (sent/viewed/change-requested/revised proposals), client progress, post-campaign performance signals from `mockReportData`, and AI follow-up/renewal actions.

- [ ] **Step 1: Create `HomeView.tsx`**

```tsx
// src/components/shell/HomeView.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Plus, Megaphone, Image as ImageIcon, BarChart2,
  Sparkles, ChevronRight, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listCampaignSummaries } from '@/lib/api/campaign-draft';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import { mockReportData } from '@/data/mockReportData';
import type { ProposalStatus } from '@/types/trading-models';

type CampaignSummary = Awaited<ReturnType<typeof listCampaignSummaries>>[number];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:                   { label: '草稿',       color: 'text-slate-500 bg-slate-100' },
  in_progress:             { label: '進行中',     color: 'text-blue-700 bg-blue-50' },
  submitted_for_review:    { label: '待審核',     color: 'text-amber-700 bg-amber-50' },
  pending_review:          { label: '審核中',     color: 'text-amber-700 bg-amber-50' },
  ready_to_confirm:        { label: '待確認',     color: 'text-indigo-700 bg-indigo-50' },
  confirmed:               { label: '已確認',     color: 'text-green-700 bg-green-50' },
  pending_creative_review: { label: '素材審核中', color: 'text-amber-700 bg-amber-50' },
  blocked_by_creative:     { label: '素材待上傳', color: 'text-red-700 bg-red-50' },
  ready_to_book:           { label: '待訂位',     color: 'text-indigo-700 bg-indigo-50' },
  cancelled:               { label: '已取消',     color: 'text-slate-400 bg-slate-100' },
};

function AdvertiserHome() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCampaignSummaries()
      .then(c => setCampaigns(c))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  const heroCampaign = campaigns[0] ?? null;
  const otherCampaigns = campaigns.slice(1);
  const totalBudgetSpent = mockReportData.reduce((sum, report) => sum + report.budgetSpent, 0);
  const totalPlays = mockReportData.reduce((sum, report) => sum + report.totalPlays, 0);
  const totalCompletedPlays = mockReportData.reduce((sum, report) => sum + report.completedPlays, 0);
  const totalEstimatedImpressions = mockReportData.reduce((sum, report) => sum + report.estimatedImpressionsDelivered, 0);
  const averageCpm = totalEstimatedImpressions > 0
    ? Math.round((totalBudgetSpent / totalEstimatedImpressions) * 1000)
    : 0;
  const underDeliveryLocation = mockReportData
    .flatMap(report => report.locationDelivery)
    .find(location => location.status === 'under_delivering');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">你好 👋</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* Hero — last campaign or empty state */}
      {!loading && (
        heroCampaign ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">上次進行中的活動</p>
              <h2 className="text-lg font-bold text-slate-900">{heroCampaign.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                {STATUS_LABEL[heroCampaign.status] && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_LABEL[heroCampaign.status].color}`}>
                    {STATUS_LABEL[heroCampaign.status].label}
                  </span>
                )}
                <span className="text-xs text-slate-400">{heroCampaign.inventoryCount} 個版位</span>
                <span className="text-xs text-slate-400">素材 {heroCampaign.uploadedCount}/{heroCampaign.totalCount}</span>
              </div>
            </div>
            <Link
              href={`/campaign-planner?id=${heroCampaign.id}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              繼續編輯 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100 p-6 text-center">
            <Megaphone className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">開始你的第一個廣告活動</h2>
            <p className="text-slate-500 text-sm mb-4">選擇版位、設定時段、上傳素材</p>
            <Link
              href="/campaign-planner"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> 新增活動
            </Link>
          </div>
        )
      )}

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-3">快速操作</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/campaign-planner', icon: Megaphone, label: '規劃活動',   color: 'text-indigo-600 bg-indigo-50' },
            { href: '/assets',           icon: ImageIcon,  label: '上傳素材',   color: 'text-purple-600 bg-purple-50' },
            { href: '/reports',          icon: BarChart2,  label: '查看報告',   color: 'text-green-600 bg-green-50' },
            { href: '/campaign-planner?view=ai', icon: Sparkles, label: 'AI 規劃', color: 'text-amber-600 bg-amber-50' },
          ].map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Performance summary (mocked) */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-3">目前成效（模擬數據）</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: '花費預算', value: `NT$${(totalBudgetSpent / 1000).toFixed(0)}K` },
            { label: '播放次數', value: totalPlays.toLocaleString() },
            { label: '完成播放', value: totalCompletedPlays.toLocaleString() },
            { label: '預計曝光', value: `${(totalEstimatedImpressions / 10000).toFixed(0)}萬` },
            { label: '平均 CPM', value: `NT$${averageCpm}` },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">{m.label}</p>
              <p className="text-xl font-bold text-slate-900">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Other campaigns */}
      {!loading && otherCampaigns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">其他活動</h3>
          <div className="space-y-2">
            {otherCampaigns.map(c => {
              const s = STATUS_LABEL[c.status] ?? { label: c.status, color: 'text-slate-500 bg-slate-100' };
              return (
                <Link
                  key={c.id}
                  href={`/campaign-planner?id=${c.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    <span className="text-sm font-medium text-slate-800">{c.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">待處理事項</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-600">素材待上傳：檢查進行中 Campaign 的 Creative Asset 狀態。</p>
            <p className="text-slate-600">Booking 待確認：確認 ready_to_confirm Campaign。</p>
            {underDeliveryLocation && (
              <p className="text-amber-700">投放風險：{underDeliveryLocation.locationName} under-delivering。</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">AI 成效建議</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>解釋低投放 InventoryLocation 的可能原因。</p>
            <p>根據已完成 Campaign 推薦可加碼的 InventoryLocations。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesHome() {
  const [countsByStatus, setCountsByStatus] = useState<Record<ProposalStatus, number> | null>(null);
  const [proposals, setProposals] = useState<Awaited<ReturnType<typeof listAdminProposalsApi>>['proposals']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAdminProposalsApi()
      .then(({ proposals: p, countsByStatus: c }) => {
        setProposals(p);
        setCountsByStatus(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const followUpQueue = proposals.filter(p =>
    p.status === 'sent_to_advertiser' ||
    p.status === 'viewed_by_advertiser' ||
    p.status === 'change_requested' ||
    p.status === 'revised',
  );

  const pipeline: Array<{ label: string; status: ProposalStatus; color: string }> = [
    { label: '草稿',     status: 'draft',                  color: 'text-slate-600 bg-slate-100' },
    { label: '已送出',   status: 'sent_to_advertiser',     color: 'text-blue-600 bg-blue-50' },
    { label: '已查看',   status: 'viewed_by_advertiser',   color: 'text-amber-600 bg-amber-50' },
    { label: '要求修改', status: 'change_requested',       color: 'text-red-600 bg-red-50' },
    { label: '已核准',   status: 'approved_by_advertiser', color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">業務工作台</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* Proposal pipeline */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-3">提案管線</h3>
        <div className="grid grid-cols-5 gap-2">
          {pipeline.map(p => (
            <div key={p.status} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className={`text-2xl font-bold ${p.color.split(' ')[0]}`}>
                {!loading && countsByStatus ? (countsByStatus[p.status] ?? 0) : '—'}
              </p>
              <p className={`text-xs font-semibold mt-1 px-1.5 py-0.5 rounded-full inline-block ${p.color}`}>
                {p.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up queue */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-3">需要跟進</h3>
        {loading ? (
          <p className="text-sm text-slate-400">載入中…</p>
        ) : followUpQueue.length === 0 ? (
          <div className="bg-green-50 rounded-xl border border-green-100 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-sm text-green-700 font-medium">目前沒有待跟進的提案</p>
          </div>
        ) : (
          <div className="space-y-2">
            {followUpQueue.map(p => (
              <Link
                key={p.id}
                href="/proposal-review"
                className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  {p.status === 'change_requested'
                    ? <AlertCircle className="w-4 h-4 text-red-500" />
                    : <Clock className="w-4 h-4 text-amber-500" />
                  }
                  <span className="text-sm font-medium text-slate-800">{p.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.status === 'change_requested' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'
                  }`}>
                    {p.status === 'change_requested'
                      ? '要求修改'
                      : p.status === 'sent_to_advertiser'
                        ? '已送出待回覆'
                        : p.status === 'revised'
                          ? '新版待回覆'
                          : '已查看未回覆'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New proposal CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">客戶成效訊號</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>Taipei Retail Launch 已交付 1.25M 預估曝光，可作為續約素材。</p>
            <p>Airport Traveler Promotion 有 failed plays，需主動準備說明。</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">AI 業務動作</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>產生 Proposal follow-up email。</p>
            <p>根據成效報告產生 renewal / upsell Proposal 建議。</p>
          </div>
        </div>
      </div>

      <Link
        href="/proposal-builder"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-4 h-4" /> 新增提案
      </Link>
    </div>
  );
}

export function HomeView() {
  const { currentUser } = useAuth();
  if (currentUser?.role === 'sales') return <SalesHome />;
  return <AdvertiserHome />;
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/HomeView.tsx
git commit -m "feat: add HomeView with role-specific advertiser and sales home"
```

---

## Task 6: Wire the (shell) route group

**Files:**
- Create: `src/app/(shell)/layout.tsx`
- Create: `src/app/(shell)/page.tsx`
- Create: `src/app/(shell)/campaign-planner/page.tsx`
- Create: `src/app/(shell)/assets/page.tsx`
- Create: `src/app/(shell)/reports/page.tsx`
- Create: `src/app/(shell)/proposal-builder/page.tsx`
- Create: `src/app/(shell)/proposal-review/page.tsx`
- Delete: `src/app/page.tsx`
- Delete: `src/app/campaign-planner/page.tsx`
- Delete: `src/app/assets/page.tsx`
- Delete: `src/app/reports/page.tsx`
- Delete: `src/app/proposal-builder/page.tsx`
- Delete: `src/app/proposal-review/page.tsx`
- Modify: `src/app/login/page.tsx`

**Context:** Route groups (`(shell)`) share a layout without changing the URL. `src/app/(shell)/page.tsx` serves `/`, `src/app/(shell)/campaign-planner/page.tsx` serves `/campaign-planner`, etc. The old files MUST be deleted — Next.js will throw a build error if two files serve the same route. The `(shell)/layout.tsx` applies `AuthGuard + AppShell` to all routes in the group, so individual page files no longer need to do this themselves.

Risk checkpoint: this task is the highest-risk cutover. Before starting, create a checkpoint commit with Tasks 1-5 completed and confirm the working tree is clean. If the route-group migration fails, roll back this task by restoring the original route files and deleting `src/app/(shell)/`. Do not leave both route copies in the tree because Next.js will treat them as duplicate routes.

- [ ] **Step 1: Create `src/app/(shell)/layout.tsx`**

```tsx
// src/app/(shell)/layout.tsx
'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { AppShell } from '@/components/shell/AppShell';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
```

- [ ] **Step 2: Create `src/app/(shell)/page.tsx`**

```tsx
// src/app/(shell)/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { HomeView } from '@/components/shell/HomeView';

export default function HomePage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      router.replace('/admin');
    }
  }, [currentUser, router]);

  if (currentUser?.role === 'admin') return null;
  return <HomeView />;
}
```

- [ ] **Step 3: Create the remaining (shell) page files**

```tsx
// src/app/(shell)/campaign-planner/page.tsx
'use client';
import { CampaignPlannerPage } from '@/components/campaign-planner/CampaignPlannerPage';
export default function Page() { return <CampaignPlannerPage />; }
```

```tsx
// src/app/(shell)/assets/page.tsx
'use client';
import { AssetsPage } from '@/components/AssetsPage';
export default function Page() { return <AssetsPage />; }
```

```tsx
// src/app/(shell)/reports/page.tsx
'use client';
import { AdvertiserReportsPage } from '@/components/reports/AdvertiserReportsPage';
export default function Page() { return <AdvertiserReportsPage />; }
```

```tsx
// src/app/(shell)/proposal-builder/page.tsx
'use client';
import dynamic from 'next/dynamic';
const ProposalBuilderPage = dynamic(
  () => import('@/components/proposal/ProposalBuilderPage').then(m => m.ProposalBuilderPage),
  { ssr: false },
);
export default function Page() { return <ProposalBuilderPage />; }
```

```tsx
// src/app/(shell)/proposal-review/page.tsx
'use client';
import dynamic from 'next/dynamic';
const ProposalReviewPage = dynamic(
  () => import('@/components/proposal/ProposalReviewPage').then(m => m.ProposalReviewPage),
  { ssr: false },
);
export default function Page() { return <ProposalReviewPage />; }
```

- [ ] **Step 4: Delete the old route files**

```bash
rm src/app/page.tsx
rm src/app/campaign-planner/page.tsx && rmdir src/app/campaign-planner
rm src/app/assets/page.tsx && rmdir src/app/assets
rm src/app/reports/page.tsx && rmdir src/app/reports
rm src/app/proposal-builder/page.tsx && rmdir src/app/proposal-builder
rm src/app/proposal-review/page.tsx && rmdir src/app/proposal-review
```

Note: `rmdir` only removes empty directories. If a directory still has files after removing `page.tsx`, do NOT force-delete — check what else is inside.

- [ ] **Step 5: Fix login routing for admin**

Open `src/app/login/page.tsx`. Make two changes:

**Change 1** — the `useEffect` redirect for already-logged-in users:

```tsx
// BEFORE:
useEffect(() => {
  if (currentUser) router.replace('/');
}, [currentUser, router]);

// AFTER:
useEffect(() => {
  if (currentUser) {
    router.replace(currentUser.role === 'admin' ? '/admin' : '/');
  }
}, [currentUser, router]);
```

**Change 2** — `handleSubmit` after successful login:

```tsx
// BEFORE:
if (ok) {
  router.push('/');
}

// AFTER:
if (ok) {
  try {
    const stored = localStorage.getItem('dooh_mock_user');
    const user = stored ? JSON.parse(stored) as { role: string } : null;
    router.push(user?.role === 'admin' ? '/admin' : '/');
  } catch {
    router.push('/');
  }
}
```

- [ ] **Step 6: Type check**

```bash
npx tsc --noEmit
```

Expected: no new errors

- [ ] **Step 7: Start dev server and run E2E verification**

```bash
npm run dev
```

Open `http://localhost:3000` in the browser and verify all three login flows:

**Test A — Advertiser:**
1. Go to `/login`, login with `advertiser@demo.com` / `demo1234`
2. Expected: land on `/`, AppShell sidebar visible on left, AdvertiserHome on right
3. Sidebar shows: 首頁 (active), 活動規劃, 我的提案, 素材庫, 成效報告
4. Click collapse button → sidebar shrinks to 60px
5. Hover icons → tooltips appear
6. Refresh → collapse state preserved

**Test B — Sales:**
1. Logout → login with `sales@demo.com` / `demo1234`
2. Expected: land on `/`, SalesHome with pipeline + follow-up queue
3. Sidebar shows: 首頁, 待處理提案, 所有提案, 業績報告 (no 活動規劃)

**Test C — Admin:**
1. Logout → login with `admin@demo.com` / `demo1234`
2. Expected: redirect directly to `/admin`, AdminDashboardPage visible (no AppShell sidebar)

**Test D — Route navigation (as advertiser):**
1. Click 活動規劃 → `/campaign-planner` inside AppShell
2. Click 素材庫 → `/assets` inside AppShell
3. Browser back → returns correctly
4. Sidebar stays persistent across all navigation

- [ ] **Step 8: Commit**

```bash
git add src/app/\(shell\)/ src/app/login/page.tsx
git commit -m "feat: wire (shell) route group with AppShell layout and role-based routing"
```

---

## Task 7: Remove `AppNav`

**Files:**
- Delete: `src/components/AppNav.tsx`
- Delete or retire: `src/components/DashboardPage.tsx` if it is the only remaining importer of `AppNav`

**Context:** `AppNav` was the horizontal top nav bar. It is now replaced by `AppSidebar`. Check for remaining imports before deleting — any leftover import causes a build error.

- [ ] **Step 1: Check for remaining imports of both AppNav and WorkspacePage**

```bash
rg -n "AppNav|WorkspacePage" src
```

Expected: no active route imports. If `src/components/DashboardPage.tsx` is the only remaining importer of `AppNav`, delete `DashboardPage.tsx` together with `AppNav.tsx` only if `rg -n "DashboardPage" src` confirms no route or component imports it. If any active file still imports `DashboardPage`, do not delete `AppNav`; remove the active dependency first.

- [ ] **Step 2: Delete unused legacy files**

```bash
rm src/components/AppNav.tsx
rm src/components/workspace/WorkspacePage.tsx
```

If `DashboardPage.tsx` is confirmed unused and is only kept for the old AppNav layout, also run:

```bash
rm src/components/DashboardPage.tsx
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Verify in browser — no double nav**

Confirm that no old horizontal header bar appears on any page. The only navigation should be the left sidebar.

- [ ] **Step 5: Commit**

```bash
git add -u src/components/AppNav.tsx src/components/workspace/WorkspacePage.tsx src/components/DashboardPage.tsx
git commit -m "chore: remove AppNav replaced by AppSidebar"
```

---

## Task 8: Remove "我的活動" tab from CampaignPlannerPage

**Files:**
- Modify: `src/components/campaign-planner/CampaignPlannerPage.tsx`

**Context:** The file has three tabs: `'planner' | 'library' | 'campaigns'`. The `campaigns` tab renders `CampaignsTabContent` which shows a campaign list — now redundant with the sidebar. Remove the function `CampaignsTabContent`, narrow the tab type to `'planner' | 'library'`, and remove all references to the `campaigns` tab value.

The function `CampaignsTabContent` starts at approximately line 274 (look for the comment `// --- CampaignsTabContent ---`) and ends at approximately line 395. The `onResume` prop it receives comes from `handleResumeCampaign` — that function should be kept since it's used by other parts of the planner. Only remove `CampaignsTabContent` itself and all `campaigns` tab references.

- [ ] **Step 1: Delete `CampaignsTabContent` function**

Find and delete the entire function block:

```typescript
// --- CampaignsTabContent ---
function CampaignsTabContent({ ... }) {
  ...
}
```

Delete from the `// --- CampaignsTabContent ---` comment through to the closing `}` of the function.

- [ ] **Step 2: Update `activeTab` state type**

Find:
```typescript
const [activeTab, setActiveTab] = useState<'planner' | 'library' | 'campaigns'>('planner');
```

Replace with:
```typescript
const [activeTab, setActiveTab] = useState<'planner' | 'library'>('planner');
```

- [ ] **Step 3: Update desktop tab switcher**

Find (first occurrence of the `'campaigns'` array):
```tsx
{(['planner', 'library', 'campaigns'] as const).map(tab => (
```
Replace with:
```tsx
{(['planner', 'library'] as const).map(tab => (
```

Find the label render inside the same map:
```tsx
{tab === 'planner' ? '規劃版位' : tab === 'library' ? '素材庫' : '我的活動'}
```
Replace with:
```tsx
{tab === 'planner' ? '規劃版位' : '素材庫'}
```

- [ ] **Step 4: Update mobile tab switcher**

Find the second occurrence:
```tsx
{(['planner', 'library', 'campaigns'] as const).map(tab => (
```
Replace with:
```tsx
{(['planner', 'library'] as const).map(tab => (
```

Find the mobile label:
```tsx
{tab === 'planner' ? '規劃' : tab === 'library' ? '素材' : '活動'}
```
Replace with:
```tsx
{tab === 'planner' ? '規劃' : '素材'}
```

- [ ] **Step 5: Remove the `campaigns` render block**

Find and delete:
```tsx
{activeTab === 'campaigns' && (
  <CampaignsTabContent setActiveTab={setActiveTab} onResume={handleResumeCampaign} />
)}
```

- [ ] **Step 6: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors referencing `'campaigns'` tab type

- [ ] **Step 7: Verify in browser**

Navigate to `/campaign-planner`. Confirm:
- Only two tabs visible: "規劃版位" and "素材庫"
- "我的活動" tab is gone
- Campaign list still visible in left sidebar
- All planner functionality works normally

- [ ] **Step 8: Commit**

```bash
git add src/components/campaign-planner/CampaignPlannerPage.tsx
git commit -m "feat: remove redundant 我的活動 tab (campaigns now in persistent sidebar)"
```

---

## Task 9: Admin sidebar — icon rail restyle

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

**Context:** Keep all existing admin nav structure (sections, items, mobile drawer behavior). Add three new behaviors: (1) collapse toggle using `useSidebarCollapse`, (2) icon rail mode on desktop when collapsed — labels hidden, icons centered, (3) tooltips in collapsed state. Use the same `useSidebarCollapse` hook (same `sidebar_collapsed` localStorage key) so collapse state is shared with the App Shell sidebar.

Mobile behavior (`isOpen` / `onClose` props) is unchanged — the mobile drawer always shows full width.

- [ ] **Step 1: Add imports to `AdminSidebar.tsx`**

Add to the existing lucide-react import line:
```typescript
import { ..., ChevronLeft, ChevronRight } from 'lucide-react';
```

Add below the existing imports:
```typescript
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
```

- [ ] **Step 2: Call the hook inside the component**

Inside `AdminSidebar` function body, before `const handleTabChange = ...`:
```typescript
const { collapsed, toggle } = useSidebarCollapse();
```

- [ ] **Step 3: Update `<aside>` className for collapse**

Find the `<aside>` opening tag. Replace its `className` string:

```tsx
// BEFORE:
className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col h-full flex-shrink-0 z-40 transform transition-transform duration-200 lg:transform-none ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}

// AFTER:
className={`fixed lg:static inset-y-0 left-0 bg-slate-900 text-slate-300 flex flex-col h-full flex-shrink-0 z-40 transform transition-transform transition-[width] duration-200 ease-in-out lg:transform-none overflow-hidden w-64 ${
  isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
} ${collapsed ? 'lg:w-[60px]' : 'lg:w-[220px]'}`}
```

- [ ] **Step 4: Hide section headers when collapsed**

For each section label `<div>`:
```tsx
// BEFORE:
<div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
  {section.label}
</div>

// AFTER:
<div className={`px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}>
  {section.label}
</div>
```

- [ ] **Step 5: Update nav buttons for collapsed state**

For each nav item `<button>`, add `relative group` to its className, and update the icon and label:

```tsx
// BEFORE:
<button
  key={item.id}
  onClick={() => handleTabChange(item.id as AdminTab)}
  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
    isActive ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'
  }`}
>
  <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
  {item.label}
</button>

// AFTER:
<button
  key={item.id}
  onClick={() => handleTabChange(item.id as AdminTab)}
  className={`relative group w-full flex items-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
    isActive ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'
  }`}
>
  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'} ${collapsed ? 'lg:mr-0' : 'mr-3'}`} />
  <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
  {collapsed && (
    <span className="absolute left-[52px] z-50 hidden group-hover:lg:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
      {item.label}
    </span>
  )}
</button>
```

- [ ] **Step 6: Add collapse toggle button in the bottom section**

In the bottom section (where Settings and LogOut buttons are), add before the Settings button:

```tsx
<button
  onClick={toggle}
  className="group relative w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
  aria-label={collapsed ? '展開側欄' : '收合側欄'}
>
  {collapsed
    ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
    : <ChevronLeft className="w-4 h-4 flex-shrink-0 mr-3" />
  }
  <span className={collapsed ? 'lg:hidden' : ''}>{collapsed ? '' : '收合側欄'}</span>
  {collapsed && (
    <span className="absolute left-[52px] z-50 hidden group-hover:lg:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
      展開側欄
    </span>
  )}
</button>
```

- [ ] **Step 7: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Verify at `/admin` in browser**

1. Login as `admin@demo.com` / `demo1234`
2. Admin sidebar visible at 220px
3. Click "收合側欄" → shrinks to 60px
4. Hover over icons → tooltips show nav item names
5. Refresh → state preserved
6. All admin tabs still work (click Overview, Proposals, Campaigns, Creative, etc.)
7. Mobile: resize to < 1024px → mobile drawer behavior unchanged

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat: add icon rail collapse to AdminSidebar matching AppShell design"
```

---

## Final E2E Verification Checklist

Run after all 9 tasks complete. Every item must pass.

### Auth & routing
- [ ] `advertiser@demo.com` login → lands on `/` with AppShell + AdvertiserHome
- [ ] `sales@demo.com` login → lands on `/` with AppShell + SalesHome
- [ ] `admin@demo.com` login → redirects directly to `/admin` (no AppShell)
- [ ] Unauthenticated user at `/campaign-planner` → redirected to `/login`
- [ ] `advertiser@demo.com` manually navigates to `/admin` → redirected to `/`

### Sidebar
- [ ] Collapse toggle works on all shell routes (home, planner, assets, reports, proposals)
- [ ] Collapse state persists across page refresh
- [ ] Tooltips appear on icon hover in collapsed state
- [ ] Active nav item highlights correctly per current route
- [ ] Campaign sub-items appear under 活動規劃 for advertiser (if campaigns exist in DB)
- [ ] Sales badge count appears on 待處理提案 if there are `change_requested` proposals

### Campaign Planner
- [ ] Opens inside AppShell — sidebar visible on left, planner content on right
- [ ] Only two tabs visible: "規劃版位" and "素材庫"
- [ ] Map, filter sidebar, summary panel all work correctly
- [ ] No "我的活動" tab
- [ ] **Dense layout check:** collapse sidebar to 60px rail, open Campaign Planner at 1440px viewport width — map and filter sidebar both visible with no overflow or broken layout

### Admin
- [ ] All admin tabs work: overview, proposals, campaign-drafts, bookings, campaigns, inventory, pricing, screens, creative-library, creative, creative-coverage, launch-readiness
- [ ] Admin sidebar collapses to icon rail
- [ ] No AppShell sidebar appears at `/admin`

### Other routes
- [ ] `/assets` loads inside AppShell
- [ ] `/reports` loads inside AppShell
- [ ] `/proposal-builder` loads inside AppShell (sidebar visible)
- [ ] `/proposal-review` loads inside AppShell
- [ ] `/login` — no sidebar
- [ ] `/player/[screenId]` — no sidebar
