# Venue DNA + Real-Time Performance Bar — Design Spec

**日期：** 2026-05-14
**範疇：** 廣告主體驗強化 — 版位 DNA 面板、版位卡 matchScore 徽章、底部即時效益欄
**背景：** 現有 Campaign Planner 的版位卡和 detail modal 缺少受眾 DNA 資料，選版位時沒有即時效益回饋。本次升級讓廣告主在選版位當下就能看到受眾輪廓與即時費用/觸及預估，強化 demo 現場的視覺衝擊。

---

## 1. 受影響的檔案

| 檔案 | 變動類型 |
|------|---------|
| `src/types/inventory.ts` | 新增 `VenueDNA` interface，擴充 `InventoryLocation` |
| `src/lib/mockData.ts` | 為每個版位加入 `dna` 欄位 |
| `src/utils/matchScore.ts` | 新增 `computeMatchScore` utility |
| `src/components/campaign-planner/PerformanceBar.tsx` | 全新元件 |
| `src/components/campaign-planner/InventoryCard.tsx` | 加入 matchScore 徽章 |
| `src/components/campaign-planner/InventoryDetailCard.tsx` | 加入 DNA 面板區塊 |
| `src/components/campaign-planner/CampaignPlannerPage.tsx` | 掛載 PerformanceBar，傳遞 objective prop |

---

## 2. 資料層設計

### 2.1 VenueDNA Interface

```ts
interface VenueDNA {
  ageBreakdown: { label: string; pct: number }[];
  // e.g. [{label:"18-24", pct:35}, {label:"25-34", pct:28}, {label:"35-44", pct:22}, {label:"45+", pct:15}]

  genderSplit: { male: number; female: number };
  // pct values that sum to 100

  audienceSegments: { label: string; pct: number }[];
  // top 3 named segments with %, e.g. [{label:"上班族", pct:41}, ...]

  peakHours: number[];
  // 24 values (index 0-23 = hour), each 0.0-1.0 relative impression intensity

  weekdayPct: number;
  // e.g. 68 means 68% of impressions fall on weekdays

  nearbyPOIs: { name: string; distance: string }[];
  // 3-5 POIs, e.g. [{name:"Taipei 101", distance:"0.1 km"}, ...]

  rankings: {
    cityRank: number;    cityTotal: number;
    districtRank: number; districtTotal: number;
    typeRank: number;    typeTotal: number;
  };

  baseMatchScore: number;
  // 0-100 static baseline used by computeMatchScore
}
```

`InventoryLocation` 加入 `dna: VenueDNA` 欄位。所有現有版位的 mock 資料須補齊此欄位。

### 2.2 matchScore 計算（runtime）

`src/utils/matchScore.ts` 匯出 `computeMatchScore(venue: InventoryLocation, objective?: string): number`。

演算法：
1. 從 `venue.dna.baseMatchScore` 出發
2. 若沒有傳入 `objective`，直接回傳 `baseMatchScore`
3. 依 objective 查 boost 規則表：

| Objective | venueType 加分 (+15) | audienceTag 加分 (+8 each) |
|-----------|---------------------|--------------------------|
| Brand Awareness | Mall, Airport, Highway | Tourists, Shoppers |
| Foot Traffic | Mall, Street, Night Market | Shoppers, Foodies |
| Direct Response | Office Building, Subway, Station | Professionals, Tech Workers, Commuters |

4. 結果 `Math.min(100, score)` 後回傳

---

## 3. PerformanceBar 元件

**檔案：** `src/components/campaign-planner/PerformanceBar.tsx`

### 3.1 觸發條件
- `selectedItems.length === 0` → 不渲染（或 `translate-y-full` 隱藏）
- `selectedItems.length >= 1` → slide-up 動畫出現（`transition-transform duration-300`）

### 3.2 佈局（桌機）

```
[深色背景 slate-900/95 backdrop-blur]
左側指標群（flex row, gap-6）:
  📍 {n} 個版位
  👁 {totalImpressions} 預估觸及
  📈 NT${avgCpm} 平均CPM
  💰 NT${totalBudget} 總費用
  🎯 {matchPct}% DNA 吻合  ← 只在 objective 有值時顯示
右側 CTA:
  [查看媒體計劃 →]  ← 點擊呼叫 onOpenSummary()
```

### 3.3 數字動畫
每個數字用 React `key={value}` + `animate-in fade-in duration-300` 達到值變動時閃入效果。不使用第三方動畫 library。

### 3.4 行動版（< lg）
收合成單行：`{n} 個版位・NT${totalBudget}・[→]`，點擊整個 bar 觸發 onOpenSummary。

### 3.5 Props Interface
```ts
interface PerformanceBarProps {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  objective?: string;
  onOpenSummary: () => void;
}
```

### 3.6 DNA 吻合度計算（bar 內）
取所有 selectedItems 的 `computeMatchScore(venue, objective)` 平均值。

---

## 4. InventoryCard matchScore 徽章

**修改：** `src/components/campaign-planner/InventoryCard.tsx`

### 4.1 觸發條件
只有在父層傳入 `objective` prop 時才渲染徽章。沒有 objective 則略過，保持現有外觀。

### 4.2 位置與外觀
- 圖片區塊**左下角**（現有左上角是 CPM badge，右上角是 High Availability badge）
- SVG 圓環（`viewBox="0 0 36 36"`），`stroke-dasharray` 控制進度
- 圓環內：百分比數字（`text-[9px] font-bold`）
- 顏色規則：
  - `score >= 75` → `stroke-emerald-400`（綠）
  - `score >= 50` → `stroke-amber-400`（琥珀）
  - `score < 50` → `stroke-slate-400`（灰）
- 背景：`bg-white/90 backdrop-blur` 小圓形容器

### 4.3 新增 Props
```ts
interface Props {
  // ... existing
  objective?: string; // 新增
}
```

---

## 5. InventoryDetailCard DNA 面板

**修改：** `src/components/campaign-planner/InventoryDetailCard.tsx`

在現有「受眾標籤」區塊之後，加入五個 DNA 區塊。全部用純 Tailwind CSS，不引入圖表 library。

### 5.1 受眾輪廓（Audience Profile）

**年齡分布：** 4 行橫向進度條
```
18-24  [████████░░░] 35%
25-34  [██████░░░░░] 28%
35-44  [█████░░░░░░] 22%
45+    [████░░░░░░░] 15%
```
實作：`div` with `width: {pct}%` + `bg-indigo-500 rounded-full h-1.5`

**性別分布：** 單行雙色進度條
```
男 52%  [████████████░░░░░░░░]  女 48%
```
實作：`flex` 雙色分段，`bg-blue-400` / `bg-pink-400`

**主要族群：** colored chips with %
```
[上班族 41%]  [購物族 35%]  [觀光客 24%]
```

### 5.2 尖峰時段（Peak Hours）

24 格迷你直條圖（`flex items-end gap-px h-12`），每格寬度固定，高度 = `peakHours[i] * 100%`。
- 最高強度的 3 個時段用 `bg-indigo-500`，其餘 `bg-slate-200`
- X 軸標示 0, 6, 12, 18, 23
- Hover 顯示 tooltip：`{hour}:00 — {相對倍率}x`（用 `title` 屬性即可）

### 5.3 週間 / 假日分佈

```
平日  [████████████████░░░░]  68%
假日  [████████░░░░░░░░░░░░]  32%
```
與年齡分布相同的橫條實作方式。

### 5.4 周邊 POI

`ul` 清單，每項：`📍 {name}  {distance}`，最多顯示 5 筆。

### 5.5 版位排名

三個 chip：
```
[🏆 全台 #3 / 45]  [📍 信義區 #1 / 8]  [📺 Mega Screen #2 / 12]
```
`bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-semibold`

---

## 6. CampaignPlannerPage 修改

> 注意：所有元件均在 `src/components/campaign-planner/`，不是 `src/components/planner/`（舊目錄，不動）。

1. 匯入並渲染 `<PerformanceBar>` 於頁面最底部（fixed bottom，`z-50`）
2. 傳入 `selectedItems`, `allInventory`, `filters.campaignObjective`, `onOpenSummary={() => setIsSummaryOpen(true)}`
3. `objective` prop 的傳遞路徑：
   - `CampaignPlannerPage` → `InventoryDiscovery` (新增 `objective` prop)
   - `InventoryDiscovery` → `ListView` + `MapView` (新增 `objective` prop)
   - `ListView` / `MapView` → `InventoryCard` (新增 `objective` prop，已於 Section 4.3 定義)
4. `InventoryDetailCard` 同樣新增 `objective?: string` prop，在 DNA 面板頂部顯示 matchScore 環形徽章（與 InventoryCard 相同 SVG 邏輯，尺寸放大至 48px）

---

## 7. 不在本次範疇

- 真實 ML matchScore 模型（靜態規則即可）
- 受眾熱區地圖 Heatmap overlay（獨立功能，下一期）
- 推薦版位側欄（獨立功能，下一期）
- i18n 翻譯完整覆蓋新增文字（優先繁中，英文 fallback 即可）
