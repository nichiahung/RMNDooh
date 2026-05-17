# App Shell Redesign — B+C Hybrid Navigation PRD

**Version:** 1.1  
**Date:** 2026-05-17  
**Status:** Draft — for review and comparison

---

## 1. Problem Statement

### 1.1 Current UX Issues

The platform currently suffers from two navigation problems:

**Redundancy:** The Workspace page (`/`) shows a campaign list. The Campaign Planner (`/campaign-planner`) has a "我的活動" tab showing the same list. Users land on Workspace, see their campaigns, click into the Planner — then see them again. The same data appears in two places with no clear hierarchy.

**No persistent context:** Every page is a full-page navigation. When a user is deep in the Campaign Planner, there is no sidebar showing their other campaigns or quick-switching between sections. Navigation always requires going "back" through the top-level header.

**No role differentiation in navigation:** All roles (advertiser, sales, admin) see identical navigation. Sales users see advertiser-specific flows. Admin users must navigate to a separate `/admin` route with a different visual language. The redesign must improve role fit without duplicating the existing admin dashboard.

**Space inefficiency:** The current layout uses a full-width header with no sidebar. On wide screens, the center content column wastes significant horizontal space and provides no persistent navigation affordance.

### 1.2 Competitive Context

- **Adomni**: Persistent left sidebar with campaign list always visible. Clicking a campaign opens it inline without losing sidebar context.
- **AdQuick**: Icon rail sidebar (collapsed by default) with hover tooltips. Expands on click. Campaign list in sidebar with status badges.
- **Broadsign**: Role-based nav — supply-side users see different items than demand-side users.

Industry standard: **56–64px icon rail collapsed / 220–240px expanded**, role-filtered, badge counts for pending items.

---

## 2. Goals

1. Eliminate redundant campaign list — campaigns live only in the persistent sidebar
2. Give users a persistent "home base" — always know where they are and what they're working on
3. Role-differentiated navigation — advertiser, sales, and admin each see only relevant items
4. Maximize content area — collapsible icon rail frees 160px of horizontal space when collapsed
5. Unify visual language — admin sidebar matches the same design system as the main App Shell

---

## 3. Solution: B+C Hybrid

### Approach

**B (Role-Aware Home):** Replace the current Workspace page (`/`) with a role-aware Home view within the App Shell. The Advertiser home combines "continue activity / quick actions" with campaign performance. The Sales home combines proposal pipeline, client progress, and post-campaign performance signals.

**C (Persistent Sidebar App Shell):** A left sidebar is always present across all advertiser/sales routes. It shows role-based navigation, the user's campaign list (with status badges), and collapses to a 60px icon rail to maximize content area.

**Option B for Admin (Style Unification Only):** The admin dashboard (`/admin`) keeps its own separate route and layout. The `AdminSidebar` is refactored to match the new icon rail design system (same CSS tokens, same collapse behavior, same badge treatment). Admin panels are not moved, merged, or duplicated into a new Admin Home.

---

## 4. Scope

### 4.1 In Scope

| Feature | Description |
|---|---|
| App Shell layout | New root layout component wrapping all non-login, non-admin routes |
| Collapsible sidebar | 220px expanded → 60px icon rail, CSS transition, localStorage persistence |
| Role-based nav | Nav items rendered from config, filtered per role at runtime |
| Badge counts | Pending proposals, pending approvals shown as badge on nav items |
| Home view | Replaces Workspace page — role-specific content without full page navigation |
| Admin sidebar restyle | `AdminSidebar` gains collapse/expand toggle and icon rail mode |
| Remove redundancy | Remove "我的活動" tab from Campaign Planner (campaigns visible in sidebar) |
| Account-aware routing | `advertiser@demo.com` lands on Advertiser Home, `sales@demo.com` lands on Sales Home, `admin@demo.com` remains on `/admin` |
| Dense-page sidebar mode | Campaign Planner and Reports must work well with the sidebar collapsed to rail-only |

### 4.2 Out of Scope

| Feature | Reason |
|---|---|
| Merging admin panels into App Shell | Too large, deferred to post-MVP |
| Creating a second Admin Home | Existing `/admin` is already the admin operations dashboard |
| New admin panels or admin features | Not part of this redesign |
| Mobile responsive sidebar (hamburger) | Desktop-first for MVP; admin already has mobile drawer |
| Campaign list real-time updates | Sidebar fetches on mount, no polling for MVP |
| User settings / profile management | Separate initiative |

---

## 5. Detailed Requirements

### 5.1 App Shell Layout

**Component:** `src/components/shell/AppShell.tsx`

The App Shell replaces the current root `layout.tsx` for authenticated non-admin routes. It renders:

```
┌─────────────────────────────────────────────────┐
│ Sidebar (60px or 220px)  │  Main Content Area   │
│                          │                       │
│  [Logo / Brand]          │  <children />         │
│  [Nav items]             │                       │
│  [Campaign list]         │                       │
│  [Settings / Logout]     │                       │
└─────────────────────────────────────────────────┘
```

- Full height: `h-screen flex overflow-hidden`
- Sidebar: `flex-shrink-0`, width controlled by CSS class
- Content: `flex-1 overflow-y-auto`

**Route coverage:**
- `/` (Home — replaces WorkspacePage)
- `/campaign-planner`
- `/proposal-builder`
- `/proposal-review`
- `/reports`
- `/assets`

**Excluded from App Shell:**
- `/login` — standalone page, no shell
- `/admin` — has its own AdminDashboardPage layout
- `/player/[screenId]` — fullscreen player, no shell

**Account routing:**

| Account | Role | Post-login destination | Notes |
|---|---|---|---|
| `advertiser@demo.com` | Advertiser | `/` | App Shell with Advertiser Home |
| `sales@demo.com` | Sales | `/` | App Shell with Sales Home |
| `admin@demo.com` | Admin | `/admin` | Existing Admin Dashboard, no duplicate Admin Home |

### 5.2 Sidebar Specs

#### Collapse Behavior

| State | Width | Content |
|---|---|---|
| Expanded | 220px | Icon + label + badge count + section headers |
| Collapsed (icon rail) | 60px | Icon only; tooltip on hover shows label + badge |

- Transition: `width 200ms ease` CSS transition
- Toggle: chevron button at bottom of sidebar (or top-right of sidebar header)
- Persistence: `localStorage.setItem('sidebar_collapsed', 'true/false')`
- Default: expanded

#### Tooltip (collapsed state)

- Positioned: `left: 68px` (just outside the 60px rail)
- Shows: nav item label + badge count (if any)
- Style: dark popover matching sidebar background (`bg-slate-900`, `text-slate-100`)
- z-index: above all content, below modals

#### Visual Design Tokens

```
Background:        #1e293b  (slate-800)
Border right:      #1e3a5f
Active item bg:    rgba(99, 102, 241, 0.2)  (indigo tint)
Active item text:  #a5b4fc  (indigo-300)
Inactive text:     #64748b  (slate-500)
Hover bg:          rgba(255,255,255,0.07)
Section label:     #334155, 10px uppercase
Badge (default):   #4f46e5  (indigo)
Badge (amber):     #f59e0b  (proposals pending)
Badge (green):     #22c55e  (approved)
```

### 5.3 Role-Based Navigation Config

Nav is defined as a static config object. The sidebar renders only items where `roles` includes the current user's role.

```typescript
type NavItem = {
  id: string;
  label: string;           // display text
  icon: LucideIcon;
  href: string;
  roles: Role[];           // ['advertiser', 'sales', 'admin']
  badge?: 'proposals' | 'approvals' | number;  // dynamic or static
};

type NavSection = {
  label: string;
  items: NavItem[];
};
```

#### Advertiser Nav

| Section | Item | Icon |
|---|---|---|
| 主選單 | 首頁 | Home |
| 廣告活動 | 活動規劃 (Campaign Planner) | Megaphone |
| 廣告活動 | 我的提案 (My Proposals) | FileText |
| 素材 | 素材庫 (Creative Library) | Image |
| 數據 | 成效報告 (Reports) | BarChart |

#### Sales Nav

| Section | Item | Icon | Badge |
|---|---|---|---|
| 主選單 | 首頁 | Home | — |
| 提案管理 | 待處理提案 (Pending Proposals) | FileText | amber: pending count |
| 提案管理 | 所有提案 (All Proposals) | ClipboardList | — |
| 數據 | 業績報告 | BarChart | — |

#### Admin Nav (shown in AdminSidebar, not App Shell)

Admin continues to use `AdminSidebar` at `/admin`. No change to admin nav items — only the visual component is restyled.

### 5.4 Home View (Replaces WorkspacePage)

**Component:** `src/components/shell/HomeView.tsx`

Replaces `WorkspacePage` at route `/`. Rendered inside the App Shell (sidebar visible).

#### Advertiser Home

```
┌─────────────────────────────────────────┐
│  早安，Jack。                            │
│  ┌───────────────────────────────────┐  │
│  │ HERO: 上次進行中的活動 / 下一步      │  │
│  │ 活動名稱 · 狀態 · 預算 / 素材進度    │  │
│  │                  [繼續編輯 →]      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Quick Actions                          │
│  [AI 規劃] [新增活動] [探索版位] [素材]  │
│                                         │
│  目前成效                               │
│  [花費] [播放] [曝光] [CPM] [進度]       │
│                                         │
│  Active Campaigns / Pending Actions     │
│  [投放中] [待補素材] [待確認] [報表]      │
└─────────────────────────────────────────┘
```

Advertiser Home must not choose between starting work and viewing performance. Both are first-class:

- Continue activity: resume the most important unfinished Campaign or required next action.
- Quick actions: Plan with AI, Create Campaign, Explore InventoryLocations, Upload Creative, View Reports.
- Performance summary: spend, verified plays, estimated impressions, delivery progress, average CPM.
- Campaign status: live, pending review, pending booking, ready to confirm, completed.
- Pending actions: missing Creative Assets, booking confirmation, under-delivery, report ready.
- AI insight: explain performance, identify delivery risk, recommend add-on InventoryLocations, draft a new Media Plan.

#### Sales Home

```
┌─────────────────────────────────────────┐
│  業務工作台                              │
│                                         │
│  Proposal Pipeline                       │
│  [Draft] [Sent] [Viewed] [Change Req.]  │
│                                         │
│  Follow-up Queue                         │
│  [已看未回] [要求修改] [核准待 booking] │
│                                         │
│  Client Progress / Performance           │
│  [投放成效] [續約機會] [異常需說明]      │
└─────────────────────────────────────────┘
```

Sales Home is a sales cockpit, not just a proposal list:

- Proposal pipeline: draft, sent, viewed, change requested, approved, expired.
- Client progress: viewed/no reply, change requested, approved/waiting booking, creative pending, report ready.
- Post-campaign performance signals: high delivery for upsell, under-delivery for proactive explanation, completed Campaign ready for results summary.
- AI actions: draft follow-up message, summarize client status, create renewal/upsell Proposal from Campaign performance.
- Sales users should not start from advertiser self-service quick actions as their primary workspace.

**Data sources:**
- Campaign list: `listCampaignSummaries()` (existing API)
- Proposals: `listAdminProposalsApi()` (existing API)
- Performance metrics: `src/data/mockReportData.ts` for MVP (real PoP reporting integration deferred)

### 5.5 Remove Redundant "我的活動" Tab

The Campaign Planner currently has a tab "我的活動" showing the same campaign list as the Workspace page. With campaigns now visible in the persistent sidebar, this tab is removed.

**Change:** Remove the `'my-campaigns'` tab and its associated `MyCampaignsPanel` component from `CampaignPlannerPage`.

The sidebar campaign list (via `listCampaignSummaries()`) replaces this entirely.

### 5.6 Admin Sidebar Restyle

**Component:** `src/components/admin/AdminSidebar.tsx` — modified in place.

No route changes. No panel changes. Only visual/behavioral changes:

1. **Add collapse toggle:** Chevron button at bottom-left of sidebar. Clicking toggles between 240px and 60px.
2. **Icon rail mode (collapsed):** Labels hidden, icons centered, hover tooltip shows label.
3. **localStorage persistence:** Same key as App Shell sidebar: `sidebar_collapsed`.
4. **Match design tokens:** Use same color values as App Shell sidebar (already uses `bg-slate-900` — compatible).
5. **Badge support:** Add badge count to "Proposals" and "Creative" items showing pending review count (mocked for MVP).

Admin sidebar width: **240px expanded / 60px collapsed** (4px wider than main shell to match existing `w-64` = 256px... or normalize to 220px).

> **Decision needed:** Normalize admin sidebar to 220px to match App Shell, or keep existing 256px? Recommendation: normalize to 220px for visual consistency.

Admin routing constraint:

- `admin@demo.com` lands on `/admin`.
- Do not create a new Admin Home inside `/`.
- Do not move admin panels into `AppShell` in this phase.
- `AdminSidebar` can be restyled to match the shell, but admin content remains owned by `AdminDashboardPage`.

---

## 6. User Stories

| # | As a... | I want to... | So that... |
|---|---|---|---|
| 1 | Advertiser | See my campaigns in the sidebar without navigating away | I can switch between campaigns quickly |
| 2 | Advertiser | Collapse the sidebar to an icon rail | I have more space when working in the Campaign Planner |
| 3 | Advertiser | See a "continue last campaign" card when I log in | I can resume work without clicking around |
| 4 | Advertiser | See campaign performance and pending actions on the same first page | I can monitor delivery without losing the ability to resume work |
| 5 | Sales | See proposal pipeline, client progress, and campaign performance signals together | I can decide which client needs follow-up next |
| 6 | Sales | Generate follow-up or renewal suggestions from proposal and performance context | I can move client conversations forward faster |
| 7 | Admin | Collapse the admin sidebar to an icon rail | I have more space when reviewing content in panels |
| 8 | All | Have the sidebar remember my collapse preference | I don't need to set it every session |

---

## 7. Technical Architecture

### New Files

| File | Purpose |
|---|---|
| `src/components/shell/AppShell.tsx` | Root layout shell with sidebar + content area |
| `src/components/shell/AppSidebar.tsx` | Collapsible sidebar with role-based nav |
| `src/components/shell/HomeView.tsx` | Home dashboard replacing WorkspacePage |
| `src/components/shell/navConfig.ts` | Static nav config array per role |
| `src/hooks/useSidebarCollapse.ts` | localStorage-backed collapse state hook |

### Modified Files

| File | Change |
|---|---|
| `src/app/layout.tsx` | Wrap authenticated routes with AppShell |
| `src/app/page.tsx` | Render HomeView instead of WorkspacePage |
| `src/components/admin/AdminSidebar.tsx` | Add collapse toggle + icon rail mode |
| `src/app/campaign-planner/page.tsx` | Remove "我的活動" tab |

### Unchanged Files

All admin panel components, all campaign planner logic, all proposal builder logic, all API/service files.

---

## 8. Success Criteria

| Criterion | Measurement |
|---|---|
| Redundant campaign list removed | "我的活動" tab no longer exists in Campaign Planner |
| Sidebar collapses correctly | 220px ↔ 60px with smooth CSS transition, no layout shift |
| Role filtering works | Advertiser sees no sales/admin nav items; sales sees no advertiser-only items |
| Account routing works | `advertiser@demo.com` and `sales@demo.com` land on role-specific Home; `admin@demo.com` lands on `/admin` |
| Advertiser Home has both work and performance | Continue/quick actions and performance summary are both visible on the first screen |
| Sales Home is pipeline-centered | Proposal pipeline, follow-up queue, client progress, and performance signals are visible on the first screen |
| No duplicated admin dashboard | Admin continues to use existing `/admin`; no new Admin Home is created |
| Admin sidebar matches design system | Same colors, same collapse behavior, same icon rail pattern |
| Collapse preference persists | Refreshing the page restores the last sidebar state |
| No regression in admin panels | All existing admin tabs still function identically |
| No regression in Campaign Planner | All existing planner flows work within new App Shell context |
| Dense pages retain workspace width | At 1440px desktop width, Campaign Planner and Reports can run with collapsed rail so the primary content keeps at least 70% width |

---

## 9. Open Questions

| # | Question | Decision |
|---|---|---|
| 1 | Normalize admin sidebar from 256px to 220px? | Recommended: yes, for consistency |
| 2 | Should the sidebar show individual campaign items (links), or just the "Campaign Planner" nav item? | Recommended: show last 3–5 campaigns as sub-items under "活動規劃", with "+ 新增" at the bottom |
| 3 | Badge counts — real-time (polling) or on-mount only? | Recommended: on-mount only for MVP |
| 4 | Should proposal-builder and proposal-review routes show the sidebar? | Recommended: yes, sidebar visible but not highlighted |
| 5 | Should AdminSidebar be restyled in the same implementation pass? | Recommended: yes if low-risk; otherwise keep `/admin` behavior unchanged and defer visual alignment |

---

## 10. What This Does NOT Change

- Supabase data model — no schema changes
- API contracts — no API changes
- Admin panel functionality — all panels unchanged
- Campaign Planner core logic — only the tab is removed
- Proposal Builder — unchanged
- Authentication / role assignment — unchanged
- i18n system — new labels added to existing i18n keys
- Admin route ownership — `/admin` remains the only admin landing surface

---

## 11. Information Flow

### 11.1 Authentication State

```
User submits login form
  → LoginPage calls AuthContext.login(email, password)
    → validateCredentials() checks MOCK_ACCOUNTS
      → returns AuthUser { email, role } or null
    → on success: localStorage.setItem('dooh_mock_user', JSON.stringify(user))
    → setCurrentUser(user)
  → LoginPage reads role from currentUser
    → role === 'admin'      → router.push('/admin')
    → role === 'advertiser' → router.push('/')
    → role === 'sales'      → router.push('/')
```

**Key constraint:** `currentUser` is `null` on first render (before the `useEffect` reads localStorage). `AuthGuard` returns `null` during this window — this is intentional to prevent flash of unauthenticated content. No loading spinner is needed; the shell does not render until `currentUser` is resolved.

**After this redesign:** `AppShell` reads `currentUser.role` directly from `useAuth()` to decide which nav config to render. No additional role-fetching API call is needed — role is embedded in the auth token at login.

### 11.2 Sidebar Data Loading

The sidebar has two data concerns:

| Data | Source | When loaded | Owned by |
|---|---|---|---|
| Nav items | `navConfig.ts` (static) | At render | `AppSidebar` |
| Campaign sub-items | `listCampaignSummaries()` | On AppShell mount | `AppSidebar` |
| Badge counts (proposals) | `listAdminProposalsApi()` | On AppShell mount | `AppSidebar` |
| Sidebar collapse state | `localStorage` | On `useSidebarCollapse` init | `useSidebarCollapse` hook |

**Loading order:**

```
AppShell mounts
  → useSidebarCollapse reads localStorage → sets collapsed/expanded immediately (no async)
  → AppSidebar fires parallel fetches:
      Promise.all([
        listCampaignSummaries(),      // for campaign sub-items
        listAdminProposalsApi()        // for badge count on Sales nav
      ])
  → on resolve: update local state → re-render sidebar items
  → on reject: show empty list / zero badge (never crash)
```

**No global store involvement.** Sidebar data is local to `AppSidebar` component state. It does not write to Zustand or any shared store. Child pages (`HomeView`, `CampaignPlannerPage`, etc.) fetch their own data independently.

### 11.3 Home View Data Loading

`HomeView` fetches its own data on mount, separate from sidebar:

```
HomeView mounts
  → reads role from useAuth()
  → if role === 'advertiser':
      Promise.all([
        listCampaignSummaries(),   // hero card + campaign status list
        fetchMockPerformance()     // spend / plays / impressions (mocked)
      ])
  → if role === 'sales':
      Promise.all([
        listAdminProposalsApi(),   // proposal pipeline
        listCampaignSummaries()    // post-campaign performance signals
      ])
  → renders skeleton while loading → fills in on resolve
```

**Duplication note:** `AppSidebar` and `HomeView` both call `listCampaignSummaries()`. This is acceptable for MVP — the calls are lightweight and cached by the browser. Deduplication via shared store is a post-MVP optimization.

### 11.4 Navigation State

Active nav item is determined by the current `pathname`, not by explicit state:

```typescript
// In AppSidebar
const pathname = usePathname();
const isActive = (href: string) => pathname.startsWith(href);
```

No explicit `activeTab` prop is passed down from parent. This means the sidebar always reflects true URL state, including browser back/forward navigation.

### 11.5 Role → Route Guard Matrix

`AuthGuard` enforces access. The following matrix defines expected behavior:

| Route | Required role | `currentUser === null` | Wrong role |
|---|---|---|---|
| `/` | any (authenticated) | → `/login` | not possible (all roles allowed) |
| `/campaign-planner` | any | → `/login` | not possible |
| `/proposal-builder` | any | → `/login` | not possible |
| `/admin` | `admin` | → `/login` | → `/` |
| `/reports` | any | → `/login` | not possible |

**Admin routing:** `WorkspacePage` currently shows "進入管理後台" button for admin role. After this redesign, `admin@demo.com` is redirected to `/admin` directly from the login page. The button is removed from `WorkspacePage` (and `HomeView` does not render for admin at all since admin lands on `/admin`).

---

## 12. End-to-End User Journeys

### 12.1 Advertiser: First Login → Submit Campaign

```
1. /login
   → enter advertiser@demo.com / demo1234
   → success → router.push('/')

2. / (Advertiser Home — inside AppShell)
   → sidebar shows: 首頁 (active), 活動規劃, 我的提案, 素材庫, 成效報告
   → hero card: "你有一個進行中的活動" or "開始你的第一個活動"
   → quick actions: [AI 規劃] [新增活動] [探索版位] [素材]
   → performance summary (mocked): spend, plays, impressions
   → campaign list: status badges (投放中 / 草稿 / 待審核)

3. Click "新增活動" → /campaign-planner
   → AppShell still visible (sidebar, same collapse state)
   → Campaign Planner loads with filter sidebar + map + summary panel
   → "我的活動" tab is GONE (removed in this redesign)
   → user selects venues, sets flight dates, sets budget

4. Click "建立提案" → /proposal-builder
   → AppShell still visible
   → Step 1: setup (client, objective)
   → Step 2: inventory review + pricing
   → Step 3: sent confirmation

5. Proposal submitted
   → sales@demo.com receives it in their "待處理提案" queue
   → advertiser sees proposal in sidebar under "我的提案"
```

**Guard check at each step:** if `currentUser` becomes null (session cleared), `AuthGuard` catches it on next render and redirects to `/login`.

---

### 12.2 Sales: Login → Send Proposal → Track Status

```
1. /login
   → enter sales@demo.com / demo1234
   → success → router.push('/')

2. / (Sales Home — inside AppShell)
   → sidebar shows: 首頁 (active), 待處理提案 (badge: N), 所有提案, 業績報告
   → proposal pipeline: Draft | Sent | Viewed | Change Req. | Approved
   → follow-up queue: clients who viewed but haven't replied
   → client performance signals: under-delivery, high delivery (upsell opportunity)

3. Click "待處理提案" → /proposal-builder or inline proposal detail
   → reviews proposal from advertiser
   → adjusts pricing, adds screens, sets discount
   → clicks "Send" → proposal status → 'sent'

4. Proposal viewed by advertiser (status → 'viewed')
   → sales Home follow-up queue shows this client
   → AI action: "draft follow-up message" available

5. Advertiser requests change (status → 'change_requested')
   → sales edits proposal → re-sends
   → status → 'sent' again

6. Advertiser approves (status → 'approved')
   → goes to booking confirmation
   → post-campaign: performance signals appear on Sales Home
```

---

### 12.3 Admin: Login → Review Queue → Approve Creative

```
1. /login
   → enter admin@demo.com / demo1234
   → success → router.push('/admin')   ← NOT '/', goes directly to admin

2. /admin (AdminDashboardPage — NOT inside AppShell)
   → AdminSidebar (restyled with icon rail, same visual language)
   → default tab: overview or work-queues
   → AdminSidebar collapse state persists via same localStorage key

3. Click "Creative" tab in AdminSidebar
   → AdminCreativeLibraryPanel loads
   → sees pending review queue (badge count shown in sidebar)

4. Approves or rejects creative
   → badge count decrements

5. Click "Launch Readiness" tab
   → AdminLaunchReadinessPanel
   → checklist: inventory confirmed, creative approved, booking set
   → marks campaign as ready to launch

6. Logout
   → AdminSidebar "登出" button → AuthContext.logout() → router.push('/login')
```

**Guard:** `/admin` has `<AuthGuard requiredRole="admin">`. If `advertiser@demo.com` navigates to `/admin`, they are redirected to `/`.

---

## 13. Error States and Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `listCampaignSummaries()` fails | Sidebar shows empty campaign list with no error thrown; HomeView shows empty state message |
| `listAdminProposalsApi()` fails | Badge count shows 0; no crash |
| User navigates to `/` as admin | `HomeView` detects `role === 'admin'` → redirect to `/admin` |
| localStorage unavailable (private mode) | `useSidebarCollapse` defaults to expanded; no crash |
| Sidebar collapsed, then route changes | Collapse state persists across route changes (it's in parent shell, not per-page) |
| Campaign Planner map + collapsed sidebar | At 1280px viewport, collapsed rail (60px) + Campaign Planner content = sufficient space |
| `currentUser` null flash on hard refresh | `AuthGuard` returns `null` until useEffect resolves; white flash for ~1 frame is acceptable for MVP |
