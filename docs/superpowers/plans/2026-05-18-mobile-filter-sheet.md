# Mobile Filter Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-only 35vh bottom sheet with swipeable filter categories to the Campaign Planner, sharing the existing filter state with the desktop FilterSidebar.

**Architecture:** Three new files under `src/components/campaign-planner/MobileFilterSheet/` plus a root `MobileFilterSheet.tsx`. The sheet reuses the existing `isFilterOpen` state, `handleFilterChange`, `handleClearFilters`, and `activeFilterCount` already managed in `CampaignPlannerPage.tsx`. The floating filter button in `InventoryDiscovery` already calls `setIsFilterOpen(true)` — no new triggers needed. CSS scroll-snap drives tab navigation with no additional libraries.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS scroll-snap, `usePlannerStore` (existing Zustand store), existing utils `getAvailableVenueTypes` / `getAvailableScreenTypes` / `getAvailableAudienceTags` from `@/utils/inventoryFilters`.

---

### Task 1: FilterTabBar sub-component

**Files:**
- Create: `src/components/campaign-planner/MobileFilterSheet/FilterTabBar.tsx`

Renders the horizontal scrollable tab list. Active tab gets an indigo underline; tabs with selections show a count badge.

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/components/campaign-planner/MobileFilterSheet
```

```tsx
// src/components/campaign-planner/MobileFilterSheet/FilterTabBar.tsx
'use client';

import { useEffect, useRef } from 'react';

export interface FilterTab {
  id: string;
  label: string;
  activeCount: number;
}

interface FilterTabBarProps {
  tabs: FilterTab[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function FilterTabBar({ tabs, activeIndex, onTabChange }: FilterTabBarProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIndex]);

  return (
    <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-slate-200 bg-white flex-shrink-0">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          ref={i === activeIndex ? activeRef : null}
          type="button"
          onClick={() => onTabChange(i)}
          className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors focus:outline-none ${
            i === activeIndex
              ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
          {tab.activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
              {tab.activeCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls src/components/campaign-planner/MobileFilterSheet/`
Expected: `FilterTabBar.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/campaign-planner/MobileFilterSheet/FilterTabBar.tsx
git commit -m "feat: add FilterTabBar sub-component for mobile filter sheet"
```

---

### Task 2: FilterTabContent sub-component

**Files:**
- Create: `src/components/campaign-planner/MobileFilterSheet/FilterTabContent.tsx`

A `forwardRef` component exposing `scrollToTab(index)` for programmatic navigation from the tab bar. The container uses CSS scroll-snap; swiping also updates the active tab index via an `onScroll` handler.

- [ ] **Step 1: Create the file**

```tsx
// src/components/campaign-planner/MobileFilterSheet/FilterTabContent.tsx
'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { FilterState, VenueType, ScreenType, AudienceTag } from '@/types/inventory';

export interface FilterTabContentHandle {
  scrollToTab: (index: number) => void;
}

interface FilterTabContentProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  availableDistricts: string[];
  availableVenueTypes: VenueType[];
  availableScreenTypes: ScreenType[];
  availableAudienceTags: AudienceTag[];
  onActiveTabChange: (index: number) => void;
}

function ToggleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border text-xs font-medium px-3 py-1.5 transition-colors focus:outline-none ${
        selected
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function ChipGrid<T extends string>({
  items,
  selected,
  onToggle,
}: {
  items: T[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 p-3 overflow-y-auto h-full content-start">
      {items.map((item) => (
        <ToggleChip
          key={item}
          label={item}
          selected={selected.includes(item)}
          onClick={() => onToggle(item)}
        />
      ))}
    </div>
  );
}

function BudgetPage({
  filters,
  onFilterChange,
}: {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
}) {
  const min = filters.minBudget ?? 0;
  const max = filters.maxBudget ?? 100000;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-[10px] text-slate-500 mb-1">最低 (NT$)</label>
          <input
            type="number"
            min={0}
            value={min === 0 ? '' : min}
            onChange={(e) =>
              onFilterChange({ minBudget: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0"
          />
        </div>
        <span className="text-slate-400 pb-2">–</span>
        <div className="flex-1">
          <label className="block text-[10px] text-slate-500 mb-1">最高 (NT$)</label>
          <input
            type="number"
            min={0}
            value={max === 100000 ? '' : max}
            onChange={(e) =>
              onFilterChange({ maxBudget: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="100000"
          />
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100000}
        step={1000}
        value={max}
        onChange={(e) => onFilterChange({ maxBudget: Number(e.target.value) || undefined })}
        className="w-full accent-indigo-600"
      />
      <p className="text-[10px] text-slate-400 text-center">
        NT${min.toLocaleString()} – NT${max.toLocaleString()}
      </p>
    </div>
  );
}

export const FilterTabContent = forwardRef<FilterTabContentHandle, FilterTabContentProps>(
  function FilterTabContent(
    {
      filters,
      onFilterChange,
      availableDistricts,
      availableVenueTypes,
      availableScreenTypes,
      availableAudienceTags,
      onActiveTabChange,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    useImperativeHandle(ref, () => ({
      scrollToTab(index: number) {
        pageRefs.current[index]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start',
        });
      },
    }));

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const index = Math.round(container.scrollLeft / container.clientWidth);
      onActiveTabChange(index);
    };

    function toggleDistrict(d: string) {
      const current = filters.districts ?? [];
      onFilterChange({
        districts: current.includes(d) ? current.filter((x) => x !== d) : [...current, d],
      });
    }

    function toggleVenueType(v: VenueType) {
      const current = filters.venueTypes ?? [];
      onFilterChange({
        venueTypes: current.includes(v) ? current.filter((x) => x !== v) : [...current, v],
      });
    }

    function toggleScreenType(s: ScreenType) {
      const current = filters.screenTypes ?? [];
      onFilterChange({
        screenTypes: current.includes(s) ? current.filter((x) => x !== s) : [...current, s],
      });
    }

    function toggleAudienceTag(a: AudienceTag) {
      const current = filters.audienceTags ?? [];
      onFilterChange({
        audienceTags: current.includes(a) ? current.filter((x) => x !== a) : [...current, a],
      });
    }

    return (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-scroll snap-x snap-mandatory flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Page 0: 地區 */}
        <div
          ref={(el) => { pageRefs.current[0] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <ChipGrid
            items={availableDistricts}
            selected={filters.districts ?? []}
            onToggle={toggleDistrict}
          />
        </div>

        {/* Page 1: 場館類型 */}
        <div
          ref={(el) => { pageRefs.current[1] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <ChipGrid
            items={availableVenueTypes}
            selected={filters.venueTypes ?? []}
            onToggle={toggleVenueType}
          />
        </div>

        {/* Page 2: 螢幕類型 */}
        <div
          ref={(el) => { pageRefs.current[2] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <ChipGrid
            items={availableScreenTypes}
            selected={filters.screenTypes ?? []}
            onToggle={toggleScreenType}
          />
        </div>

        {/* Page 3: 受眾標籤 */}
        <div
          ref={(el) => { pageRefs.current[3] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <ChipGrid
            items={availableAudienceTags}
            selected={filters.audienceTags ?? []}
            onToggle={toggleAudienceTag}
          />
        </div>

        {/* Page 4: 預算 */}
        <div
          ref={(el) => { pageRefs.current[4] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <BudgetPage filters={filters} onFilterChange={onFilterChange} />
        </div>
      </div>
    );
  }
);
```

- [ ] **Step 2: Verify file exists**

Run: `ls src/components/campaign-planner/MobileFilterSheet/`
Expected: `FilterTabBar.tsx  FilterTabContent.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/campaign-planner/MobileFilterSheet/FilterTabContent.tsx
git commit -m "feat: add FilterTabContent scroll-snap pages for mobile filter"
```

---

### Task 3: MobileFilterSheet root component

**Files:**
- Create: `src/components/campaign-planner/MobileFilterSheet.tsx`

Combines sheet overlay, drag handle, tab bar, tab content, and sticky footer. Pulls `allInventory` from `usePlannerStore` to derive available filter options, exactly as `FilterSidebar` does.

- [ ] **Step 1: Create the file**

```tsx
// src/components/campaign-planner/MobileFilterSheet.tsx
'use client';

import { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { FilterState } from '@/types/inventory';
import { usePlannerStore } from '@/store/usePlannerStore';
import {
  getAvailableVenueTypes,
  getAvailableScreenTypes,
  getAvailableAudienceTags,
} from '@/utils/inventoryFilters';
import { FilterTab, FilterTabBar } from './MobileFilterSheet/FilterTabBar';
import { FilterTabContent, FilterTabContentHandle } from './MobileFilterSheet/FilterTabContent';

export interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export function MobileFilterSheet({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount,
}: MobileFilterSheetProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const contentRef = useRef<FilterTabContentHandle>(null);

  const allInventory = usePlannerStore((s) => s.allInventory);

  const availableDistricts = useMemo(
    () => [...new Set(allInventory.map((l) => l.district))].sort(),
    [allInventory]
  );
  const availableVenueTypes = useMemo(() => getAvailableVenueTypes(allInventory), [allInventory]);
  const availableScreenTypes = useMemo(() => getAvailableScreenTypes(allInventory), [allInventory]);
  const availableAudienceTags = useMemo(() => getAvailableAudienceTags(allInventory), [allInventory]);

  const tabs: FilterTab[] = [
    { id: 'district',  label: '地區',   activeCount: filters.districts?.length ?? 0 },
    { id: 'venue',     label: '場館類型', activeCount: filters.venueTypes?.length ?? 0 },
    { id: 'screen',    label: '螢幕類型', activeCount: filters.screenTypes?.length ?? 0 },
    { id: 'audience',  label: '受眾標籤', activeCount: filters.audienceTags?.length ?? 0 },
    {
      id: 'budget',
      label: '預算',
      activeCount:
        filters.minBudget !== undefined || filters.maxBudget !== undefined ? 1 : 0,
    },
  ];

  const handleTabChange = (index: number) => {
    setActiveIndex(index);
    contentRef.current?.scrollToTab(index);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — tapping dismisses sheet */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white rounded-t-2xl shadow-2xl"
        style={{ height: '35vh' }}
      >
        {/* Drag handle (visual only) */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Tab bar + close button */}
        <div className="flex items-center flex-shrink-0">
          <div className="flex-1 min-w-0">
            <FilterTabBar
              tabs={tabs}
              activeIndex={activeIndex}
              onTabChange={handleTabChange}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 mr-2 text-slate-400 hover:text-slate-600 flex-shrink-0"
            aria-label="關閉篩選"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll-snap content — fills remaining height */}
        <FilterTabContent
          ref={contentRef}
          filters={filters}
          onFilterChange={onFilterChange}
          availableDistricts={availableDistricts}
          availableVenueTypes={availableVenueTypes}
          availableScreenTypes={availableScreenTypes}
          availableAudienceTags={availableAudienceTags}
          onActiveTabChange={setActiveIndex}
        />

        {/* Sticky footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            清除全部
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            套用篩選
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-indigo-600 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Check usePlannerStore exports `allInventory`**

Run: `grep -n "allInventory" src/store/usePlannerStore.ts | head -10`
Expected: a line defining `allInventory` in the store state. If it's named differently, update the selector in MobileFilterSheet.tsx accordingly.

- [ ] **Step 3: Verify build compiles**

Run: `npm run build 2>&1 | grep -E "error|Error" | head -20`
Expected: no TypeScript errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/campaign-planner/MobileFilterSheet.tsx
git commit -m "feat: add MobileFilterSheet root component"
```

---

### Task 4: Wire MobileFilterSheet into CampaignPlannerPage

**Files:**
- Modify: `src/components/campaign-planner/CampaignPlannerPage.tsx` (lines ~5, ~594–603)

The existing `isFilterOpen` / `handleFilterChange` / `handleClearFilters` / `activeFilterCount` are already in scope. The floating filter button in `InventoryDiscovery` already calls `setIsFilterOpen(true)` — no changes to InventoryDiscovery needed.

Strategy:
- Wrap the existing `<FilterSidebar>` block with `<div className="hidden md:block">` so it's CSS-hidden on mobile.
- Add `<div className="md:hidden">` containing `<MobileFilterSheet>` so it's CSS-hidden on desktop.

- [ ] **Step 1: Add the import**

In `src/components/campaign-planner/CampaignPlannerPage.tsx`, add after the `FilterSidebar` import (line 5):

```tsx
import { MobileFilterSheet } from './MobileFilterSheet';
```

- [ ] **Step 2: Wrap FilterSidebar to hide on mobile**

Find this block (around line 593–604):

```tsx
{currentView !== 'ai' && (
  <FilterSidebar
    filters={filters}
    onFilterChange={handleFilterChange}
    onClearFilters={handleClearFilters}
    activeFilterCount={activeFilterCount}
    isOpen={isFilterOpen}
    onClose={() => setIsFilterOpen(false)}
    searchQuery={searchQuery}
    onSearchChange={setSearchQuery}
  />
)}
```

Replace with:

```tsx
{currentView !== 'ai' && (
  <div className="hidden md:block">
    <FilterSidebar
      filters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      activeFilterCount={activeFilterCount}
      isOpen={isFilterOpen}
      onClose={() => setIsFilterOpen(false)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    />
  </div>
)}
```

- [ ] **Step 3: Add MobileFilterSheet after the FilterSidebar block**

Immediately after the block changed in Step 2, add:

```tsx
<div className="md:hidden">
  <MobileFilterSheet
    isOpen={isFilterOpen}
    onClose={() => setIsFilterOpen(false)}
    filters={filters}
    onFilterChange={handleFilterChange}
    onClearFilters={handleClearFilters}
    activeFilterCount={activeFilterCount}
  />
</div>
```

- [ ] **Step 4: Verify full build**

Run: `npm run build 2>&1 | grep -E "error TS|Error" | head -20`
Expected: no TypeScript errors.

- [ ] **Step 5: Run lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: no new lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/campaign-planner/CampaignPlannerPage.tsx
git commit -m "feat: wire MobileFilterSheet into CampaignPlannerPage"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 35% height fixed sheet — `style={{ height: '35vh' }}` in Task 3
- ✅ Backdrop tap to dismiss — transparent `fixed inset-0` div in Task 3
- ✅ Visual drag handle — decorative `div` in Task 3
- ✅ Horizontal scroll-snap tabs — CSS classes in Task 2 (`snap-x snap-mandatory`)
- ✅ Active tab underline indicator — `border-b-2 border-indigo-600` in Task 1
- ✅ Numeric badges on active tabs — Task 1 FilterTabBar, Task 3 tab definitions
- ✅ Five filter categories: 地區/場館/螢幕/受眾/預算 — pages 0–4 in Task 2
- ✅ Chip grid for 4 categories — `ChipGrid` in Task 2
- ✅ Budget min/max inputs + range slider — `BudgetPage` in Task 2
- ✅ 清除全部 footer button — Task 3 footer
- ✅ 套用篩選 footer button with count — Task 3 footer
- ✅ Real-time filter updates — `onFilterChange` called on every chip tap, same as desktop
- ✅ FilterSidebar unchanged — only wrapped with `hidden md:block` in Task 4
- ✅ No new libraries — pure CSS + existing deps
- ✅ `usePlannerStore` for inventory options — Task 3 (same pattern as FilterSidebar)

**Type consistency:**
- `FilterTabContentHandle.scrollToTab(index: number)` defined in Task 2, called identically in Task 3
- `FilterTab` interface exported from Task 1, imported in Task 3
- `FilterTabContentHandle` exported from Task 2, used as `useRef<FilterTabContentHandle>` in Task 3
- `MobileFilterSheetProps` defined in Task 3, no external consumers until Task 4 — types match
