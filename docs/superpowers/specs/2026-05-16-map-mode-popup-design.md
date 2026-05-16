# Map Mode — 直接加入計畫 UX 設計

**日期**: 2026-05-16  
**狀態**: 已核准，待實作

---

## 問題

地圖模式點擊 pin 後，同時觸發 Leaflet Popup（小卡）和 `InventoryDetailCard`（全螢幕 modal）雙重彈出，層次混亂。且「加入計畫」功能藏在全螢幕 modal 內，每次選點位都要進 modal 再回來，流程過長。

## 目標

在地圖上直接完成「看到點位資訊 → 加入計畫」，全螢幕 modal 改為可選的深度查閱入口，不強制觸發。

---

## 解法：升級版 MapPopupCard

點擊 pin 時，顯示一個自製的迷你 popup 卡（取代現有 Leaflet `<Popup>`），卡片內含：

- 縮圖（imageUrl）
- 可用性 badge（80% 可用 / 有限 / 不可用）
- 場地 tag（venueType + screenType）
- 名稱、地址
- 4 個關鍵數字：日費 / CPM / 每日曝光 / 最低預訂天數
- **「＋ 加入計畫」** 主按鈕（已選入時顯示「已加入 ✓」+ 移除選項）
- **「詳情 →」** 次按鈕 → 開啟現有 `InventoryDetailCard` 全資訊 modal

---

## 互動行為

| 動作 | 結果 |
|------|------|
| 點擊可用 pin | 開啟 MapPopupCard，前一張自動關閉 |
| 點擊不可用 pin（灰色）| 開啟卡片，「加入計畫」按鈕 disabled，顯示「無庫存」提示 |
| 點擊「＋ 加入計畫」| 立即加入，pin 變綠＋pulse 動畫，按鈕文字變「已加入 ✓」 |
| 點擊「已加入 ✓」| 變為「移除」確認按鈕（二次確認避免誤觸），點確認後 pin 恢復原色 |
| 點擊「詳情 →」| 保持 popup 開啟，疊加顯示 InventoryDetailCard modal |
| 點擊 X / 點地圖空白 | 關閉 popup |
| 滾動/縮放地圖 | popup 跟隨 pin 位置移動（Leaflet anchor 綁定） |

---

## 元件設計

### 新增：`MapPopupCard.tsx`

```
src/components/campaign-planner/MapPopupCard.tsx
```

Props：
```ts
interface MapPopupCardProps {
  item: InventoryLocation;
  isSelected: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onViewDetail: () => void;
  onClose: () => void;
}
```

渲染方式：用 Leaflet `divIcon` + React Portal，或直接作為 Leaflet `<Popup>` 的 children（用 `ReactDOM.createPortal` 注入到 popup container）。

### 修改：`MapView.tsx`

- 移除現有 `<Popup>` 內的靜態 HTML
- 改用 `<Popup>` wrapping `<MapPopupCard>`，透過 `eventHandlers.click` 控制顯示哪張卡
- 移除 `onViewDetails` 在 click 時的直接觸發；改由 MapPopupCard 的「詳情 →」按鈕觸發

### 修改：`CampaignPlannerPage.tsx` / `InventoryDiscovery.tsx`

- `selectedPopupItem: InventoryLocation | null` state
- `detailItem: InventoryLocation | null` state（控制 InventoryDetailCard 開啟）
- 將 `onViewDetails` 改為 `setDetailItem`

---

## Pin 色彩規則（不變）

| 狀態 | 顏色 |
|------|------|
| 可用（availability ≥ 0.7）| Indigo `#6366f1` |
| 有限（0.3–0.7）| Amber `#f59e0b` |
| 不可用（< 0.3）| Slate `#94a3b8` |
| 已選入計畫 | Emerald `#10b981` + pulse |

---

## 不在本次範圍內

- Pin clustering（密集點位聚合）：留待後續
- 手機響應式優化：留待後續
- 地圖模式的排序/篩選快捷列：留待後續
