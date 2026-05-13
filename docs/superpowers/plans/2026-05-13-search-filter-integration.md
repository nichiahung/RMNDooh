# Search + Filter 側欄整合實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 Search input 從 Topbar 移至 FilterSidebar 頂部，並讓側欄可以收合，消除 Topbar 跑版問題。

**Architecture:** `FilterSidebar` 新增 search input 和 `isCollapsed` local state，控制展開（w-64）和收合（w-10）兩種渲染。`SearchAndSortBar` 改名為 `PlannerTopbar` 並移除 search，只保留版位計數、排序、視圖切換。`CampaignPlannerPage` 重新接線，將 `searchQuery` 傳給 `FilterSidebar` 而非 `InventoryDiscovery`。

**Tech Stack:** React, TypeScript, Tailwind CSS, Next.js (static export), i18n via custom `useI18n` hook

---

## 受影響檔案

| 動作 | 路徑 | 說明 |
|------|------|------|
| 新增 | `src/components/campaign-planner/PlannerTopbar.tsx` | 替換 `SearchAndSortBar`，只有計數 + 排序 + 視圖切換 |
| 修改 | `src/components/campaign-planner/FilterSidebar.tsx` | 新增 search input、收合邏輯 |
| 修改 | `src/components/campaign-planner/InventoryDiscovery.tsx` | 換用 `PlannerTopbar`，移除 search props |
| 修改 | `src/components/campaign-planner/CampaignPlannerPage.tsx` | 重新接線 searchQuery |
| 修改 | `src/i18n/dictionaries.ts` | 新增 `filter.searchAndFilter` key |
| 刪除 | `src/components/campaign-planner/SearchAndSortBar.tsx` | 被 `PlannerTopbar` 取代 |

---

## Task 1：新增 `PlannerTopbar` 元件

**Files:**
- Create: `src/components/campaign-planner/PlannerTopbar.tsx`

- [ ] **Step 1：建立 `PlannerTopbar.tsx`**

```tsx
'use client';

import { ArrowDownUp } from 'lucide-react';
import { ViewToggle } from './ViewToggle';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  resultCount: number;
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
}

export function PlannerTopbar({ resultCount, sortOption, onSortChange, currentView, onViewChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
        {resultCount} {t('planner.locations')}
      </span>
      <div className="flex items-center space-x-5">
        <div className="flex items-center space-x-2">
          <ArrowDownUp className="w-4 h-4 text-slate-400" />
          <select
            className="block pl-2 pr-8 py-1.5 text-sm font-medium text-slate-700 bg-transparent border-transparent focus:outline-none focus:ring-0 cursor-pointer hover:text-slate-900 transition-colors"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="impressions_desc">{t('sort.impressionsDesc')}</option>
            <option value="impressions_asc">{t('sort.impressionsAsc')}</option>
            <option value="price_desc">{t('sort.priceDesc')}</option>
            <option value="price_asc">{t('sort.priceAsc')}</option>
            <option value="cpm_desc">{t('sort.cpmDesc')}</option>
            <option value="cpm_asc">{t('sort.cpmAsc')}</option>
          </select>
        </div>
        <div className="h-5 w-px bg-slate-200" />
        <ViewToggle currentView={currentView} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2：確認 TypeScript 無錯誤**

```bash
npx tsc --noEmit 2>&1 | grep PlannerTopbar
```
Expected: 無輸出（無錯誤）

- [ ] **Step 3：Commit**

```bash
git add src/components/campaign-planner/PlannerTopbar.tsx
git commit -m "feat: add PlannerTopbar component (search-free topbar)"
```

---

## Task 2：新增 i18n key

**Files:**
- Modify: `src/i18n/dictionaries.ts`

- [ ] **Step 1：在 `dictionaries.ts` 的 EN 區塊新增 key**

在 `'filter.reset': 'Reset All',` 之後插入：

```ts
'filter.searchAndFilter': 'Search & Filter',
```

- [ ] **Step 2：在 zh-TW 區塊新增對應翻譯**

在 `'filter.reset': '清除所有篩選',` 之後插入：

```ts
'filter.searchAndFilter': '搜尋 & 篩選',
```

- [ ] **Step 3：Commit**

```bash
git add src/i18n/dictionaries.ts
git commit -m "feat: add filter.searchAndFilter i18n key"
```

---

## Task 3：改寫 `FilterSidebar` — 加入 search + 收合功能

**Files:**
- Modify: `src/components/campaign-planner/FilterSidebar.tsx`

- [ ] **Step 1：更新 Props interface，加入 search 和 isCollapsed**

將檔案頂部的 import 和 interface 改為：

```tsx
'use client';

import { useState, useMemo } from 'react';
import { Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { FilterState } from '@/types/inventory';
import { mockInventory } from '@/lib/mockData';
import { getAvailableDistricts, getAvailableVenueTypes, getAvailableScreenTypes, getAvailableAudienceTags } from '@/utils/inventoryFilters';
import { useI18n } from '@/i18n/I18nProvider';
import { DISTRICT_KEY, VENUE_KEY, SCREEN_KEY, AUDIENCE_KEY, CITY_KEY, AVAILABILITY_KEY } from '@/i18n/filterLabels';

interface Props {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}
```

- [ ] **Step 2：替換整個 `FilterSidebar` function body**

```tsx
export function FilterSidebar({ filters, onFilterChange, onClearFilters, activeFilterCount, searchQuery, onSearchChange }: Props) {
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const availableDistricts = useMemo(() => getAvailableDistricts(mockInventory), []);
  const availableVenueTypes = useMemo(() => getAvailableVenueTypes(mockInventory), []);
  const availableScreenTypes = useMemo(() => getAvailableScreenTypes(mockInventory), []);
  const availableAudienceTags = useMemo(() => getAvailableAudienceTags(mockInventory), []);

  const handleArrayToggle = (key: keyof FilterState, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    onFilterChange({ [key]: newArray.length > 0 ? newArray : undefined });
  };

  const handleNumberInput = (key: keyof FilterState, value: string) => {
    const num = parseInt(value);
    onFilterChange({ [key]: isNaN(num) ? undefined : num });
  };

  // ── Collapsed state ──────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <aside className="w-10 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-3 flex-shrink-0 z-20 transition-all duration-200">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
          title={t('filter.searchAndFilter')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="relative">
          <div className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-50 text-slate-500">
            <Filter className="w-4 h-4" />
          </div>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
      </aside>
    );
  }

  // ── Expanded state ────────────────────────────────────────────────────
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-slate-500" />
          {t('filter.searchAndFilter')}
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
          title="收合"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            placeholder={t('planner.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Clear filters link */}
        {activeFilterCount > 0 && (
          <div className="flex justify-end -mt-2">
            <button
              onClick={onClearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              {t('filter.clearAll')}
            </button>
          </div>
        )}

        {/* Objective */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.objective')}</h3>
          <select
            className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
            value={filters.campaignObjective || ''}
            onChange={(e) => onFilterChange({ campaignObjective: e.target.value || undefined })}
          >
            <option value="">{t('filter.anyObjective')}</option>
            <option value="Awareness">{t('filter.awareness')}</option>
            <option value="Store visits">{t('filter.storeVisits')}</option>
            <option value="Product launch">{t('filter.productLaunch')}</option>
            <option value="Event promotion">{t('filter.eventPromotion')}</option>
          </select>
        </div>

        {/* City */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.city')}</h3>
          <select
            className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
            value={filters.city || ''}
            onChange={(e) => onFilterChange({ city: e.target.value || undefined, districts: [] })}
          >
            <option value="">{t('filter.anyCity')}</option>
            <option value="Taipei">{t(CITY_KEY['Taipei'])}</option>
            <option value="New Taipei">{t(CITY_KEY['New Taipei'])}</option>
          </select>
        </div>

        {/* District */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.district')}</h3>
          <div className="space-y-2 pl-1 max-h-36 overflow-y-auto custom-scrollbar">
            {availableDistricts
              .filter(d => !filters.city || mockInventory.find(i => i.district === d)?.city === filters.city)
              .map(district => (
                <label key={district} className="flex items-center text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={(filters.districts || []).includes(district)}
                    onChange={() => handleArrayToggle('districts', district)} />
                  {t(DISTRICT_KEY[district] ?? district)}
                </label>
              ))}
          </div>
        </div>

        {/* Venue Type */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.venueType')}</h3>
          <div className="space-y-2 pl-1">
            {availableVenueTypes.map(venue => (
              <label key={venue} className="flex items-center text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={(filters.venueTypes || []).includes(venue)}
                  onChange={() => handleArrayToggle('venueTypes', venue)} />
                {t(VENUE_KEY[venue] ?? venue)}
              </label>
            ))}
          </div>
        </div>

        {/* Screen Type */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.screenType')}</h3>
          <div className="space-y-2 pl-1 max-h-36 overflow-y-auto custom-scrollbar">
            {availableScreenTypes.map(screen => (
              <label key={screen} className="flex items-center text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={(filters.screenTypes || []).includes(screen)}
                  onChange={() => handleArrayToggle('screenTypes', screen)} />
                {t(SCREEN_KEY[screen] ?? screen)}
              </label>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.audience')}</h3>
          <div className="space-y-2 pl-1 max-h-36 overflow-y-auto custom-scrollbar">
            {availableAudienceTags.map(audience => (
              <label key={audience} className="flex items-center text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={(filters.audienceTags || []).includes(audience)}
                  onChange={() => handleArrayToggle('audienceTags', audience)} />
                {t(AUDIENCE_KEY[audience] ?? audience)}
              </label>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.availability')}</h3>
          <div className="space-y-2 pl-1">
            {(['Available', 'Limited', 'Unavailable'] as const).map(status => (
              <label key={status} className="flex items-center text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={(filters.availabilityStatus || []).includes(status)}
                  onChange={() => handleArrayToggle('availabilityStatus', status)} />
                {t(AVAILABILITY_KEY[status])}
              </label>
            ))}
          </div>
        </div>

        {/* Budget Range */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.budget')}</h3>
          <div className="flex items-center space-x-2">
            <input type="number" placeholder={t('filter.min')}
              className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
              value={filters.minBudget || ''}
              onChange={(e) => handleNumberInput('minBudget', e.target.value)} />
            <span className="text-slate-400">-</span>
            <input type="number" placeholder={t('filter.max')}
              className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
              value={filters.maxBudget || ''}
              onChange={(e) => handleNumberInput('maxBudget', e.target.value)} />
          </div>
        </div>

        {/* Impressions Range */}
        <div className="pb-4">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.impressions')}</h3>
          <div className="flex items-center space-x-2">
            <input type="number" placeholder={t('filter.min')}
              className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
              value={filters.minImpressions || ''}
              onChange={(e) => handleNumberInput('minImpressions', e.target.value)} />
            <span className="text-slate-400">-</span>
            <input type="number" placeholder={t('filter.max')}
              className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
              value={filters.maxImpressions || ''}
              onChange={(e) => handleNumberInput('maxImpressions', e.target.value)} />
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3：確認 TypeScript 無錯誤**

```bash
npx tsc --noEmit 2>&1 | grep FilterSidebar
```
Expected: 無輸出

- [ ] **Step 4：Commit**

```bash
git add src/components/campaign-planner/FilterSidebar.tsx
git commit -m "feat: add search input and collapse toggle to FilterSidebar"
```

---

## Task 4：改寫 `InventoryDiscovery` — 換用 `PlannerTopbar`

**Files:**
- Modify: `src/components/campaign-planner/InventoryDiscovery.tsx`

- [ ] **Step 1：更新 Props 和 import**

將 `InventoryDiscovery.tsx` 頂部的 import 和 interface 改為：

```tsx
'use client';

import { SearchAndSortBar } from './SearchAndSortBar'; // 這行移除，換成：
import { PlannerTopbar } from './PlannerTopbar';
```

更新 `Props` interface（移除 `searchQuery`、`onSearchChange`）：

```tsx
interface Props {
  inventory: InventoryLocation[];
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
}
```

- [ ] **Step 2：更新 function signature 和 JSX**

```tsx
export function InventoryDiscovery({
  inventory,
  sortOption,
  onSortChange,
  currentView,
  onViewChange,
  selectedItems,
  onViewDetails,
  onAdd,
}: Props) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
      <PlannerTopbar
        resultCount={inventory.length}
        sortOption={sortOption}
        onSortChange={onSortChange}
        currentView={currentView}
        onViewChange={onViewChange}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentView === 'list' ? (
          <ListView
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
          />
        ) : (
          <MapWrapper
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3：確認 TypeScript 無錯誤**

```bash
npx tsc --noEmit 2>&1 | grep InventoryDiscovery
```
Expected: 無輸出

- [ ] **Step 4：Commit**

```bash
git add src/components/campaign-planner/InventoryDiscovery.tsx
git commit -m "feat: replace SearchAndSortBar with PlannerTopbar in InventoryDiscovery"
```

---

## Task 5：更新 `CampaignPlannerPage` 的接線

**Files:**
- Modify: `src/components/campaign-planner/CampaignPlannerPage.tsx`

- [ ] **Step 1：更新 `FilterSidebar` 呼叫，傳入 search props**

找到 `<FilterSidebar` 那段（約第 146–151 行），改為：

```tsx
<FilterSidebar
  filters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={handleClearFilters}
  activeFilterCount={activeFilterCount}
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
/>
```

- [ ] **Step 2：更新 `InventoryDiscovery` 呼叫，移除 search props**

找到 `<InventoryDiscovery` 那段（約第 153–164 行），改為：

```tsx
<InventoryDiscovery
  inventory={filteredAndSortedInventory}
  sortOption={sortOption}
  onSortChange={setSortOption}
  currentView={currentView}
  onViewChange={setCurrentView}
  selectedItems={selectedItems}
  onViewDetails={setSelectedInventoryForDetail}
  onAdd={handleAdd}
/>
```

- [ ] **Step 3：確認 TypeScript 無錯誤**

```bash
npx tsc --noEmit 2>&1 | grep CampaignPlannerPage
```
Expected: 無輸出

- [ ] **Step 4：Commit**

```bash
git add src/components/campaign-planner/CampaignPlannerPage.tsx
git commit -m "feat: wire searchQuery into FilterSidebar, remove from InventoryDiscovery"
```

---

## Task 6：刪除 `SearchAndSortBar.tsx` 並驗證 build

**Files:**
- Delete: `src/components/campaign-planner/SearchAndSortBar.tsx`

- [ ] **Step 1：確認 `SearchAndSortBar` 無任何殘留 import**

```bash
grep -r "SearchAndSortBar" /Users/jack.ni/Personal/DOOH/src/
```
Expected: 無輸出（或只剩 `SearchAndSortBar.tsx` 本身）

- [ ] **Step 2：刪除檔案**

```bash
git rm src/components/campaign-planner/SearchAndSortBar.tsx
```

- [ ] **Step 3：執行 production build**

```bash
npm run build
```
Expected: 輸出 `✓ Generating static pages` 且無錯誤

- [ ] **Step 4：手動驗證功能**

在 `npm run dev` 啟動後開啟 `http://localhost:3000/campaign-planner`：

1. Topbar 只有版位計數 + 排序 + 視圖切換，無 search input
2. 左側欄最上方有 search input，可輸入搜尋關鍵字，版位列表即時過濾
3. 點擊側欄右上角 `‹` 按鈕，側欄收合為 40px 薄條
4. 收合狀態：若有啟用篩選，filter 圖示右上角顯示數字 badge
5. 點擊 `›` 按鈕，側欄重新展開，search input 和 filter 皆完好
6. 切換語言（中 / EN），所有標籤正確切換

- [ ] **Step 5：Commit**

```bash
git add -A
git commit -m "feat: delete SearchAndSortBar, verified build passes"
```

---

## Task 7：Push 分支

- [ ] **Step 1：Push 到遠端**

```bash
git push -u origin feature/search-filter-integration
```

- [ ] **Step 2：確認 GitHub Actions 通過**

前往 `https://github.com/nichiahung/RMNDooh/actions` 確認 deploy workflow 為綠色。
