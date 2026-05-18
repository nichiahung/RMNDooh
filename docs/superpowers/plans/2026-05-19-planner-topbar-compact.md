# PlannerTopbar 手機版精簡單列 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除 `PlannerTopbar` 橫向捲動，讓篩選、計數、排序、檢視切換四個元素在手機上緊湊排列於單列，無需左右滑動。

**Architecture:** 只修改 `PlannerTopbar.tsx` 一個檔案。新增 `SORT_LABELS_COMPACT` map 將 sortOption 值對應到縮寫顯示文字（例如 `impressions_desc` → `觸及人次↓`），再提取成可測試的 `getSortLabelCompact` 工具函式放入 `src/utils/sortLabel.ts`。Tailwind class 調整移除固定寬度與橫向捲動。

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest

---

## File Map

| 動作 | 路徑 | 說明 |
|------|------|------|
| 新增 | `src/utils/sortLabel.ts` | `getSortLabelCompact(sortOption)` 函式 |
| 新增 | `src/__tests__/sortLabel.test.ts` | 函式的 Vitest 測試 |
| 修改 | `src/components/campaign-planner/PlannerTopbar.tsx` | 佈局調整 + 使用新函式 |

---

## Task 1: 新增排序縮寫工具函式並測試

**Files:**
- Create: `src/utils/sortLabel.ts`
- Create: `src/__tests__/sortLabel.test.ts`

- [ ] **Step 1: 撰寫失敗測試**

新增 `src/__tests__/sortLabel.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { getSortLabelCompact } from '@/utils/sortLabel';

describe('getSortLabelCompact', () => {
  it('maps impressions_desc to 觸及人次↓', () => {
    expect(getSortLabelCompact('impressions_desc')).toBe('觸及人次↓');
  });
  it('maps impressions_asc to 觸及人次↑', () => {
    expect(getSortLabelCompact('impressions_asc')).toBe('觸及人次↑');
  });
  it('maps price_desc to 日費用↓', () => {
    expect(getSortLabelCompact('price_desc')).toBe('日費用↓');
  });
  it('maps price_asc to 日費用↑', () => {
    expect(getSortLabelCompact('price_asc')).toBe('日費用↑');
  });
  it('maps cpm_desc to CPM↓', () => {
    expect(getSortLabelCompact('cpm_desc')).toBe('CPM↓');
  });
  it('maps cpm_asc to CPM↑', () => {
    expect(getSortLabelCompact('cpm_asc')).toBe('CPM↑');
  });
  it('returns the raw value for unknown sortOption', () => {
    expect(getSortLabelCompact('unknown')).toBe('unknown');
  });
});
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
npx vitest run src/__tests__/sortLabel.test.ts
```

預期：FAIL — `Cannot find module '@/utils/sortLabel'`

- [ ] **Step 3: 實作函式**

新增 `src/utils/sortLabel.ts`：

```ts
const COMPACT: Record<string, string> = {
  impressions_desc: '觸及人次↓',
  impressions_asc:  '觸及人次↑',
  price_desc:       '日費用↓',
  price_asc:        '日費用↑',
  cpm_desc:         'CPM↓',
  cpm_asc:          'CPM↑',
};

export function getSortLabelCompact(sortOption: string): string {
  return COMPACT[sortOption] ?? sortOption;
}
```

- [ ] **Step 4: 執行測試，確認全過**

```bash
npx vitest run src/__tests__/sortLabel.test.ts
```

預期：7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/sortLabel.ts src/__tests__/sortLabel.test.ts
git commit -m "feat: add getSortLabelCompact utility for compact sort labels"
```

---

## Task 2: 更新 PlannerTopbar 佈局

**Files:**
- Modify: `src/components/campaign-planner/PlannerTopbar.tsx`

- [ ] **Step 1: import getSortLabelCompact**

在 `PlannerTopbar.tsx` 第 6 行 `useI18n` import 下方加入：

```ts
import { getSortLabelCompact } from '@/utils/sortLabel';
```

- [ ] **Step 2: 移除橫向捲動容器樣式**

將第 48 行：
```tsx
<div className="flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto">
```
改為：
```tsx
<div className="flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0">
```

- [ ] **Step 3: 更新計數 pill — 可彈性縮放**

將第 66 行：
```tsx
<span className="inline-flex h-9 items-center text-xs sm:text-sm font-medium text-slate-500 bg-slate-100 px-2.5 sm:px-3 rounded-lg whitespace-nowrap flex-shrink-0">
```
改為：
```tsx
<span className="inline-flex h-9 min-w-0 flex-1 items-center text-xs sm:text-sm font-medium text-slate-500 bg-slate-100 px-2.5 sm:px-3 rounded-lg truncate">
```

- [ ] **Step 4: 更新篩選按鈕啟用狀態 — 加入 bg-indigo-50**

將第 53–57 行 className 模板字串中 activeFilterCount > 0 的分支：
```
'border-indigo-500 text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50'
```
改為：
```
'border-indigo-500 text-indigo-600 bg-indigo-50 hover:border-indigo-600'
```

- [ ] **Step 5: 更新排序 pill — 移除固定寬度，使用縮寫標籤**

將第 72–93 行整個排序控制區塊替換為：

```tsx
{showSort && (
  <div className="relative flex h-9 flex-shrink-0 items-center">
    {/* Visual pill */}
    <div className="flex items-center h-full pl-2.5 pr-7 bg-white border border-slate-200 rounded-lg shadow-sm pointer-events-none select-none gap-1.5 hover:border-slate-300 transition-colors">
      <ArrowDownUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      <span className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">
        {getSortLabelCompact(sortOption)}
      </span>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 absolute right-2" />
    </div>
    {/* Native select overlaid */}
    <select
      aria-label="Sort inventory"
      className="absolute inset-0 w-full opacity-0 cursor-pointer"
      value={sortOption}
      onChange={(e) => onSortChange(e.target.value)}
    >
      {SORT_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{t(o.key)}</option>
      ))}
    </select>
  </div>
)}
```

> **注意：** `<option>` 仍使用 `t(o.key)` 顯示完整文字，確保 native select dropdown 可讀性不受影響。只有 pill 的視覺顯示改為縮寫。

- [ ] **Step 6: 確認 lint 與 build 通過**

```bash
npm run lint && npm run build
```

預期：無 error，build 輸出正常。

- [ ] **Step 7: Commit**

```bash
git add src/components/campaign-planner/PlannerTopbar.tsx
git commit -m "feat: compact mobile toolbar — remove horizontal scroll, abbreviate sort label"
```

---

## 驗收確認

手動在手機（或 DevTools 375px 視窗）確認：

- [ ] 工具列四個元素（篩選、計數、排序、檢視）全部可見，無左右捲動
- [ ] 計數文字在版位數量較多時自然截斷（`truncate`）
- [ ] 排序 pill 顯示 `↕ 觸及人次↓ ▾`（非完整文字）
- [ ] 點開 native select — 選項仍顯示完整中文（`觸及人次（高至低）`）
- [ ] 有篩選條件啟用時，篩選按鈕呈現紫色邊框 + 淺紫背景
- [ ] 桌面版（> 768px）外觀無變化
