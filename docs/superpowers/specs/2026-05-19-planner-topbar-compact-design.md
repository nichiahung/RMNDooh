# PlannerTopbar 手機版精簡單列 — Design Spec

**Date:** 2026-05-19
**Scope:** `PlannerTopbar.tsx` — 手機版工具列（< 768px）

---

## 1. 問題

`PlannerTopbar` 目前使用 `overflow-x: auto` 橫向捲動容器，在手機上需要左右滑動才能看到排序和檢視切換，使用體驗差。

---

## 2. 解決方案

移除橫向捲動，讓四個元素（篩選、計數、排序、檢視）在同一列內緊湊排列，無需滑動。

---

## 3. 視覺規格

### 工具列佈局（單列）

```
[ ⚙ ]  15 個刊播版位  [ ↕ 觸及人次↓ ▾ ]  [ ☰ ][ ⊞ ][ ◎ ]
```

- 篩選按鈕：固定 32×32px，`flex-shrink: 0`
- 計數文字：`flex: 1`，可縮放，`text-overflow: ellipsis`
- 排序 pill：`flex-shrink: 0`，`white-space: nowrap`
- 檢視切換：`flex-shrink: 0`

### 篩選按鈕狀態

| 狀態 | 邊框 | 文字/圖示色 | 背景 |
|------|------|------------|------|
| 無篩選 | `border-slate-200` | `text-slate-400` | 透明 |
| 有篩選啟用 | `border-indigo-500` | `text-indigo-600` | `bg-indigo-50` |

數字 badge：不加（維持現有換色邏輯即可）。

### 排序標籤格式

原始 `sortOption` 值對應的顯示文字：

| sortOption | 顯示文字 |
|------------|---------|
| `impressions_desc` | `觸及人次↓` |
| `impressions_asc` | `觸及人次↑` |
| `price_desc` | `日費用↓` |
| `price_asc` | `日費用↑` |
| `cpm_desc` | `CPM↓` |
| `cpm_asc` | `CPM↑` |

Pill 完整呈現：`↕ {縮寫文字} ▾`

---

## 4. 實作範圍

**唯一需要修改的檔案：`src/components/campaign-planner/PlannerTopbar.tsx`**

變更項目：
1. 移除容器上的 `overflow-x: auto` / `whitespace-nowrap`
2. 篩選按鈕：加入啟用狀態的 `bg-indigo-50` 背景
3. 計數元素：加 `flex-1 truncate`
4. 排序 pill：加 `flex-shrink-0 whitespace-nowrap`；新增 `sortLabel` 對照 map 取代完整文字
5. 檢視切換：加 `flex-shrink-0`

---

## 5. 範圍外

- 桌面版 `FilterSidebar.tsx`：不動
- `MobileFilterSheet.tsx`：不動
- i18n 字串：不新增（縮寫直接 hardcode 在 label map）
- 任何其他元件
