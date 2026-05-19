# Admin Dashboard Redesign

**Date:** 2026-05-19  
**Status:** Draft — pending implementation plan  
**Scope:** Admin Dashboard (`/admin`) — navigation, panel improvements, operational language, CMS architecture direction

---

## 1. Context & Problem Statement

The current Admin Dashboard has 12 tabs built across two eras of development:
- **Legacy path** (Supabase-backed): Overview, Campaigns, Creative Review, Inventory, Screens
- **Trading iteration path** (tradingIterationApi): Proposals, Campaign Drafts, Bookings, Creative Coverage, Launch Readiness, Creative Library, Pricing

The result is a dashboard where:
- Two business paths (advertiser self-service and sales-assisted) are not clearly separated
- The "Campaigns" tab overlaps with the Proposals/Drafts/Bookings flow
- Several panels display raw UUIDs instead of human-readable names
- The search bar in CampaignTable has no `onChange` handler (non-functional)
- Work Queue cards on the Dashboard are non-interactive (counts only)
- Bookings panel uses emoji (✅❌) instead of proper status components
- The Admin's role is framed as "approval" when it should be "operational fulfillment"

---

## 2. Business Context

### Two Business Paths

Both paths converge at Bookings. The Admin's role throughout is **operational fulfillment**, not a second approval gate.

**Path 1 — Advertiser Self-Service:**
```
Advertiser (Campaign Planner) → Campaign Draft → [Admin: lock inventory, confirm booking]
→ Booking → Creative Review → Launch Readiness → Live
```

**Path 2 — Sales-Assisted:**
```
Sales (Proposal Builder) → Proposal → Advertiser approves (commercial agreement reached)
→ [Admin: convert to booking, lock inventory] → Booking → Creative Review → Launch Readiness → Live
```

### Admin Role Clarification

Once a Proposal is approved by the advertiser or a Campaign Draft is submitted, the commercial decision is made. The Admin performs **Ad Ops fulfillment**:

| Stage | Admin action | Nature |
|---|---|---|
| Campaign Draft received | Verify inventory, confirm booking | Operational |
| Proposal approved by advertiser | Convert to booking, lock inventory | Operational |
| Booking confirmed | Verify payment cleared | Financial confirmation |
| Creative submitted | Review content compliance, check format coverage | Quality gate |
| All checks pass | Schedule campaign → push to CMS | Execution |

### Platform Type

This is a **DOOH Aggregator / small-medium operator**. One Admin handles all Ad Ops responsibilities (Traffic + Ops + Creative compliance). UI design must minimize context switching.

---

## 3. Navigation Redesign

### Current → New (12 tabs → 9 tabs)

**Removed:**
- `Campaigns` (legacy) — data consolidated into Bookings; historical records accessible via Bookings filters
- `Creative Library` (standalone tab) — moved as a sub-tab inside Creative Review
- `Creative Coverage` (standalone tab) — integrated into Launch Readiness as blocker detail

**Added:**
- Badge counts on each tab (from Work Queue API) — Admin sees pending items without entering each panel

**New sidebar structure:**

```
📊 Dashboard                    [badge: total urgent]

── 🧑‍💼 廣告主自助 ──────────────
📋 Campaign Drafts              [badge: pending]

── 💼 業務銷售 ─────────────────
📄 Proposals                    [badge: awaiting action]

── 📦 訂單履約 ─────────────────
📅 Bookings
🖼 Creative Review               [badge: pending review]
🚀 Launch Readiness             [badge: blocked]

── ⚙️ 系統管理 ─────────────────
🗺 Inventory
🖥 Screens
💵 Pricing
```

**Section rationale:**
- **廣告主自助** and **業務銷售** are source-separated so different operators can own their respective queues
- **訂單履約** (Fulfillment) explicitly signals that these are operational tasks, not approval steps — matching industry Ad Ops terminology
- **系統管理** is configuration, not daily workflow

---

## 4. Dashboard Redesign

### Work Queue Cards — Make Clickable

Each Work Queue card navigates to the relevant tab and applies a filter to show only actionable items:

| Card | Navigates to | Auto-filter |
|---|---|---|
| Needs Sales Action | Proposals | status = `change_requested` or `revised` |
| Needs Booking Action | Bookings | bookingStatus = `inventory_reserved` |
| Needs Creative Review | Creative Review | approval_status = `pending_review` |
| Needs Creative Coverage | Launch Readiness | blocker = `blocked_by_creative` |
| Needs Launch Action | Launch Readiness | status = `ready_for_launch` |

### Overview KPI Cards — Retain

The four KPI cards (Total Campaigns, Pending Review, Approved/Live, Active Screens) and the two highlight cards (Pipeline Budget, Estimated Reach) are useful — retain as-is.

---

## 5. Panel Improvements

### All Panels — UUID Display Fix

Panels that currently show raw UUIDs must resolve to human-readable names:

| Panel | Field | Current | Target |
|---|---|---|---|
| Proposals | `advertiserId` | UUID | Advertiser name |
| Campaign Drafts | `advertiserId` | UUID | Advertiser name |
| Launch Readiness | `campaignId` | UUID | Campaign name |
| Creative Coverage | `campaignId` | UUID | Campaign name |

Resolution strategy: join or lookup on API response. If the trading iteration API doesn't return names, add name fields to the response or make a secondary lookup.

### CampaignTable — Fix Search

The search input has no `onChange` handler. Add controlled state and client-side filter over the `campaigns` array by `name` and `advertiserName`.

### Creative Review — Absorb Creative Library

Creative Library (currently a standalone tab showing all uploaded creative assets) becomes a sub-tab within Creative Review. The Creative Review panel gains two sub-tabs:
- **Pending Review** — assets awaiting admin approval (current behavior)
- **Asset Library** — all assets regardless of status (current Creative Library content)

This consolidation removes one top-level tab while keeping the content accessible.

### Bookings Panel — Replace Emoji

Replace `✅` / `❌` with `StatusBadge` component for `playlistAssigned`, `paymentCleared`, `policyPassed`. Use `bg-emerald-100 text-emerald-700` for true and `bg-red-100 text-red-700` for false.

Booking ID column: truncate UUID to first 8 characters with a tooltip showing the full ID.

### Proposals Panel — Add Actions

Add an Actions column with contextual buttons based on proposal status:

| Status | Available actions |
|---|---|
| `draft` | Send to Advertiser |
| `change_requested` | Mark Revised |
| `approved_by_advertiser` | Convert to Booking |
| `expired` | — |

### Launch Readiness — Simplify to Go/No-Go

Launch Readiness is a **checklist + single action**, not a multi-operation panel.

- Show each prerequisite as a check item: Booking confirmed, Creative approved, Coverage complete, Payment cleared, Inventory locked
- Show blocker details inline (including creative format gaps, previously in Coverage tab)
- Single action button: **「排程上線」** (Schedule Campaign) — enabled only when all checks pass
- On click: triggers CMS push via adapter layer; shows success/failure per screen

### Bookings Panel — Add Operational Actions

| Booking status | Available actions |
|---|---|
| `inventory_reserved` | Confirm Booking (lock inventory) |
| `confirmed` | Mark Payment Cleared |
| `confirmed` + all creative/coverage checks pass | → triggers Launch Readiness |
| `live` | Cancel (with confirmation modal) |

---

## 6. Operational Language

Replace approval-framing language with fulfillment-framing language throughout:

| Current | Replace with |
|---|---|
| "Confirm Booking" | "Lock Inventory & Confirm Booking" |
| "Approve" (on booking) | "Confirm Fulfillment" |
| Admin section label "Operations" | "訂單履約" (Fulfillment) |
| "Launch Readiness" action | "排程上線" (Schedule Campaign) |

---

## 7. CMS Adapter Architecture

### Separation of Concerns

This platform is the **business logic layer**. Physical content delivery is handled by downstream CMS systems via an Adapter Layer.

```
Admin Dashboard (business decisions)
        ↓
CMS Adapter Layer
  ├── InHouseCMSAdapter
  ├── BroadsignAdapter
  ├── ScalaAdapter
  └── SignageliveAdapter
        ↓
Physical Screens (CMS-controlled)
        ↓
Proof of Play logs → Reports
```

### Adapter Interface

```typescript
interface CMSAdapter {
  pushSchedule(params: {
    screenId: string;
    cmsScreenId: string;
    creativeUrl: string;
    startDate: string;
    endDate: string;
    slotsPerHour: number;
  }): Promise<{ success: boolean; cmsJobId?: string; error?: string }>;

  cancelSchedule(cmsJobId: string): Promise<void>;
  getProofOfPlay(cmsScreenId: string, dateRange: { from: string; to: string }): Promise<PoPLog[]>;
  getScreenStatus(cmsScreenId: string): Promise<'online' | 'offline' | 'unknown'>;
}
```

### Database Changes Required

`screens` table additions:

```sql
cms_type      TEXT  -- 'inhouse' | 'broadsign' | 'scala' | 'signagelive'
cms_screen_id TEXT  -- the screen's native ID within its CMS
```

### Admin UI Impact

- Screens tab: add `CMS Type` column and `CMS Screen ID` column (editable)
- Launch Readiness: "排程上線" button calls adapter; shows per-screen push result
- Error display: if adapter push fails, show human-readable error (e.g., "Broadsign API timeout — Screen XYZ")
- Admin does not choose which adapter to use — routing is automatic based on `cms_type`

### Current State

- No CMS adapter implemented; Web Player (`/player/[screenId]`) is a local simulator
- `screens` table does not have `cms_type` or `cms_screen_id` columns yet
- This is the target architecture for future implementation

---

## 8. Items Explicitly Out of Scope

- Programmatic bidding / RTB — separate spec exists
- Reports surface — separate work item
- Advertiser-facing UI — no changes
- Auth / role-based access control — deferred
- Pagination on all tables — noted as P3, not in this redesign
- Audit log — noted as a future need, not in this redesign

---

## 9. Priority-Ordered Change List

**P1 — Usability (affects daily operations):**
1. Work Queue cards clickable with tab navigation + auto-filter
2. Fix UUID display in Proposals, Campaign Drafts, Launch Readiness, Creative Coverage
3. Fix CampaignTable search (`onChange` + client-side filter)
4. Replace emoji in Bookings with StatusBadge

**P2 — Workflow completeness:**
5. Navigation restructure: 12 → 9 tabs, new section groupings, badge counts
6. Add action buttons to Proposals panel
7. Add operational action buttons to Bookings panel
8. Simplify Launch Readiness to go/no-go checklist + single Schedule button
9. Integrate Creative Coverage into Launch Readiness blocker detail
10. Rename legacy language to fulfillment language

**P3 — Architecture foundation:**
11. Add `cms_type` + `cms_screen_id` to Screens table + Screens panel UI
12. Define and scaffold CMS Adapter interface (no real CMS integration yet)

**P4 — Polish:**
13. Truncate Booking ID to 8 chars + tooltip
14. Unify loading state language to Chinese
15. Data migration: verify all historical Campaign records from the legacy tab are accessible via Bookings panel filters before removing the `CampaignTable` component and its route
