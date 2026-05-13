# Search + Filter 側欄整合設計

**日期：** 2026-05-13
**分支：** `feature/search-filter-integration`
**範疇：** Campaign Planner（`/campaign-planner`）頁面

---

## 問題背景

目前 Search 欄位放在 `SearchAndSortBar`（Topbar sticky bar），與 Filter 側欄各自獨立。Search input 設定為 `w-96`（384px），在 Topbar 與 Sort dropdown、View toggle 並排時，橫向空間不足，造成跑版。

---

## 設計決策

**方案 A：Search 移入可收合的 Filter 側欄**

- Search input 移到 Filter sidebar 最上方
- Sidebar 新增展開 / 收合切換（`‹` / `›`）
- 收合時側欄縮為 40px 薄條，以圖示 + badge 顯示啟用篩選數
- Topbar 簡化為：版位計數 + 排序 + 視圖切換

---

## 元件架構

### Topbar（`SearchAndSortBar` 改名 `PlannerTopbar`）

| 移除 | 保留 |
|------|------|
| Search input | 版位計數 badge（`N 個刊播版位`） |
| | Sort dropdown |
| | View toggle（列表 / 地圖） |

元件不再接收 `searchQuery` / `onSearchChange` props，改接 `resultCount`。

### Filter Sidebar（`FilterSidebar`）

新增項目：

1. **Search input** — sidebar header 下方第一個元素，placeholder 同原本 `planner.searchPlaceholder`
2. **收合按鈕** — sidebar header 右側，點擊切換展開 / 收合狀態
3. **收合狀態** — 側欄寬度 `w-10`（40px），顯示：
   - `›` 展開圖示按鈕
   - `⊟` filter 圖示，右上角 badge 顯示啟用篩選條件數量（`activeFilterCount`）
4. **展開狀態** — 原本所有篩選條件（行政區、場域類型、版面規格、受眾、預算…）完整顯示

收合狀態寬度動畫：CSS `transition: width 0.2s ease`

### 狀態管理

收合狀態（`isCollapsed: boolean`）存放於：

- **Option 1（選用）：** 元件 local state — 夠用，不需要跨元件共享
- 收合偏好不持久化（不存 localStorage），每次進頁面預設展開

### 搜尋邏輯遷移

搜尋 state 原本在 `CampaignPlannerPage.tsx` 中以 `useState` 管理，並透過 prop 傳入 `SearchAndSortBar`。

遷移後：

- 搜尋 state 移至 `FilterSidebar` 內部（local state），或上移至 `CampaignPlannerPage` 繼續透過 prop 傳入 `FilterSidebar`
- **選用 prop 傳入方案**，保持 `CampaignPlannerPage` 為資料協調者，`FilterSidebar` 單純 UI

---

## 受影響檔案

| 檔案 | 變更類型 |
|------|---------|
| `src/components/campaign-planner/SearchAndSortBar.tsx` | 改名 `PlannerTopbar.tsx`，移除 search props |
| `src/components/campaign-planner/FilterSidebar.tsx` | 新增 search input、收合邏輯 |
| `src/components/campaign-planner/CampaignPlannerPage.tsx` | 更新 import、調整 prop 傳遞 |
| `src/i18n/dictionaries.ts` | 無需新增 key（已有 `planner.searchPlaceholder`、`filter.title`） |

---

## 不在本次範疇

- `planner/` 資料夾下的舊版 FilterSidebar（不同元件，另行處理）
- 行動版 RWD 收合行為
- 將收合狀態持久化至 localStorage

---

## 成功標準

1. Topbar 不再有 search input，跑版問題消失
2. 側欄展開時 Search + Filter 在同一欄，體驗一致
3. 收合時內容區域（地圖 / 列表）佔用更多橫向空間
4. 啟用中的篩選條件數量在收合狀態下仍可見（badge）
5. 現有篩選功能（district、venue、screen、audience、budget、impression）行為不變
