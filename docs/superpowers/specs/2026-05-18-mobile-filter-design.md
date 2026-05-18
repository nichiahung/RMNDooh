# Mobile Filter Sheet — Design Spec

**Date:** 2026-05-18
**Scope:** Campaign Planner — mobile-only Filter UI

---

## 1. Problem

The existing `FilterSidebar.tsx` is a desktop-first sidebar component. On mobile viewports, it has no usable layout. This spec defines a mobile-only Filter experience that lets users filter inventory while keeping the map/list visible.

---

## 2. User Experience

### Trigger
A **「篩選」button** in `PlannerTopbar` is shown only on mobile (`< 768px`). Tapping it opens the Filter Bottom Sheet.

### Bottom Sheet Layout

```
┌─────────────────────────────┐  ← ~65% — map/list remains visible & interactive
│   Map / List View           │
│                             │
├─────────────────────────────┤
│  ━━━  (drag handle, visual only — no resize)
│  地區②  場館  螢幕  受眾  預算  │  ← horizontal scrollable tab bar
│ ─────────────────────────── │
│  [ filter content for       │  ← scroll-snap content area
│    active tab ]             │     ~160px usable height
│                             │
│ [清除全部]    [套用篩選 (3)] │  ← sticky footer
└─────────────────────────────┘  ← ~35% total sheet height
```

### Sheet Behavior
- Fixed height at **~35% of viewport** — no drag-to-resize
- Slides up from bottom on open, slides down on close
- Dismiss by tapping the upper 65% area or pressing ✕ in the tab bar area
- Background map/list remains **fully interactive** while sheet is open

### Tab Navigation
- Tab bar scrolls horizontally if tabs overflow
- Active tab has an underline indicator
- Tabs with active filters show a **numeric badge** (e.g., `地區②`)
- Navigation: tap a tab label OR swipe left/right on the content area

### Filter Content per Tab

| Tab | Content Type | Notes |
|-----|-------------|-------|
| 地區 | Multi-select chip grid | 2-col layout, vertical scroll if overflow |
| 場館類型 | Multi-select chip grid | Same |
| 螢幕類型 | Multi-select chip grid | Same |
| 受眾標籤 | Multi-select chip grid | Same |
| 預算 | Dual range slider + min/max inputs | Full-width |

### Sticky Footer
- **清除全部** — clears all filters across all tabs
- **套用篩選 (N)** — closes the sheet; N = total active filter count
- Filters apply **in real time** (background results update as user selects); the button is a convenience close action

---

## 3. Component Architecture

New files (no changes to existing `FilterSidebar.tsx`):

```
src/components/campaign-planner/
├── FilterSidebar.tsx              ← desktop, unchanged
├── MobileFilterSheet.tsx          ← root sheet component
├── MobileFilterSheet/
│   ├── FilterTabBar.tsx           ← tab labels + badges + active indicator
│   └── FilterTabContent.tsx       ← scroll-snap page container
```

### Props Interface

`MobileFilterSheet` accepts the **same filter props** as `FilterSidebar` — no new store additions needed.

```ts
interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;          // reuse existing type
  onChange: (filters: FilterState) => void;
}
```

### Responsive Integration

In `CampaignPlannerPage` or `InventoryDiscovery`:

```tsx
{isMobile
  ? <MobileFilterSheet isOpen={filterOpen} onClose={...} filters={filters} onChange={...} />
  : <FilterSidebar filters={filters} onChange={...} />
}
```

Use `useMediaQuery('(max-width: 768px)')` hook (or Tailwind `md:hidden` / `hidden md:block` classes).

`PlannerTopbar` receives an `onFilterOpen` callback shown only on mobile.

---

## 4. Implementation Approach

**CSS scroll-snap** — no new libraries required.

```css
/* content container */
.filter-tab-content {
  display: flex;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

/* each page */
.filter-tab-page {
  flex: 0 0 100%;
  scroll-snap-align: start;
  overflow-y: auto;
}
```

Programmatic tab switching via `scrollIntoView({ behavior: 'smooth' })` on the target page element.

---

## 5. Out of Scope

- Drag-to-resize sheet handle
- Filter persistence across sessions (uses existing in-memory state)
- AI view mobile adaptation (separate task)
- Any changes to desktop FilterSidebar
