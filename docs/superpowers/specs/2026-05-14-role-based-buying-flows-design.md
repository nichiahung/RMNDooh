# Role-Based Buying Flows Design Spec

**日期：** 2026-05-14
**範疇：** 三種採購模式的前端 UI 設計與後端商業物件模型
**背景：** 現有平台已有自助訂購的基礎，需要加入業務主導提案（Sales-Led Proposal）流程，並釐清三種模式的完整設計邊界。

---

## 1. 採購模式總覽

平台支援三種採購模式，各自有不同的使用者、流程和規則：

| 模式 | 主要使用者 | 核心物件 | Booking 由誰確認 |
|------|-----------|---------|----------------|
| **自助訂購** | 廣告主 | Campaign | 廣告主自己 |
| **業務主導提案** | 業務 + 廣告主 | Proposal | 業務（廣告主確認 Proposal 後）|
| **Programmatic** | SSP / DSP | Ad Decision | 競標得標即確認（自動）|

---

## 2. 商業物件定義

### 2.1 Brief（需求摘要）— 可選

**定義：** 廣告主的初步需求表達。可由廣告主透過系統填寫（地圖選位 + 說明方向），或由業務整理線下溝通後代為建立。

**重要規則：**
- Brief ≠ Booking，Brief 不預留版位
- Brief 不觸發 Booking 流程
- Brief 可選轉換為 Proposal（業務操作）
- 業務也可不透過 Brief，直接建立 Proposal

**Brief Status：**
```
draft → submitted → reviewing → converted_to_proposal | closed
```

---

### 2.2 Proposal（提案）— 業務主導流程核心物件

**定義：** 業務建立的正式商業提案。包含版位組合、定價、刊播期間、預估效益。廣告主在線上確認後，業務才能進行 Confirm Booking。

**重要規則：**
- Proposal 可從 Brief 建立，也可由業務直接建立（不需要 Brief）
- Proposal 不自動預留版位
- 廣告主確認 Proposal ≠ Booking 確認（業務仍需手動 Confirm Booking）
- Booking 只能從「`approved_by_advertiser`」狀態的 Proposal 建立
- 直銷模式可在素材審核前 Confirm Booking，但 Campaign 不能 live 直到素材通過

**Proposal Status：**
```
draft → sent_to_advertiser → viewed_by_advertiser
→ modified_by_advertiser | commented
→ approved_by_advertiser | rejected_by_advertiser | expired
→ (converted_to_booking)
```

**廣告主可以對 Proposal 做的事：**
- 直接修改允許欄位：刊播天數、移除版位
- 在討論區留言（要求業務修改不可直接編輯的欄位，如新增版位、修改定價）
- 確認方案（觸發業務執行 Confirm Booking）
- 要求修改（業務更新 Proposal 再重新傳送）

---

### 2.3 Booking（訂單確認）

**定義：** 版位的正式確認。版位被預留，Campaign 進入 Creative Upload 和 Launch Readiness 流程。

**重要規則：**
- 自助訂購：廣告主在素材審核通過後自行 Confirm Booking
- 業務主導：業務在廣告主確認 Proposal 後執行 Confirm Booking
- Booking 確認後立刻預留版位
- 觸發「請廣告主上傳素材」通知

**Booking Status：**
```
not_confirmed → confirmed → inventory_reserved → scheduled → live → completed
                                               ↘ cancelled | blocked
```

---

## 3. 三種流程詳細設計

### 3.1 自助訂購（Self-Service）

**適用對象：** 中小企業主、熟悉數位廣告的行銷人員、代理商 Planner

**完整步驟：**
1. 廣告主在地圖或列表瀏覽版位（支援受眾 DNA、推薦版位、即時效益預估）
2. 選擇版位，建立 Campaign + Media Plan
3. 上傳廣告素材
4. Admin 審核素材
5. 素材通過後，廣告主 Confirm Booking（版位預留）
6. `launch_readiness = ready_for_scheduling`
7. 排程 → 上線

**關鍵規則：**
- **素材審核必須在 Confirm Booking 之前完成**
- 廣告主自行執行 Confirm Booking
- 無 Proposal 物件

---

### 3.2 業務主導提案（Sales-Led Proposal）

**適用對象：** 大型品牌、預算較大的廣告主、需要業務顧問的客戶

**兩條入口路徑（均為 MVP 支援）：**

**路徑 A（主要）：業務直接建立 Proposal**
1. 業務（透過線下溝通、Email、電話了解需求後）在後台直接建立 Proposal
2. 設定版位組合、天數、定價、刊播期間、預估效益
3. 傳送 Proposal 給廣告主確認

**路徑 B（可選）：廣告主送 Brief → 業務建 Proposal**
1. 廣告主在地圖瀏覽版位，勾選感興趣的地點
2. 填寫需求方向（目標、受眾、預算範圍、刊播期間）
3. 送出 Brief
4. 業務從 Brief 建立 Proposal

**廣告主確認階段（路徑 A、B 相同）：**
1. 廣告主收到 Proposal 通知
2. 查看 Proposal（版位組合、定價、預估效益、版位 DNA）
3. 可直接修改天數或移除版位
4. 在討論區留言，要求業務調整不可直接修改的欄位
5. 業務修改 → 重新傳送 → 廣告主確認（可來回多次）
6. 廣告主線上確認方案

**業務確認訂單：**
1. 業務收到「廣告主已確認」通知
2. 業務執行 Confirm Booking
3. 版位立刻預留
4. 系統通知廣告主上傳廣告素材

**素材與上線：**
1. 廣告主上傳素材
2. Admin 審核
3. 通過 → `launch_readiness = ready_for_scheduling`
4. 排程 → 上線

**關鍵規則：**
- Brief 是可選的（業務可直接建 Proposal）
- 直銷模式可在素材審核前 Confirm Booking（版位先鎖定）
- 素材未通過，Campaign 不得上線

---

### 3.3 Programmatic DOOH

**適用對象：** DSP / SSP 程序化廣告購買者

**流程：**
1. Admin 設定 Loop Template，指定哪些 Slot 開放競標
2. Player 執行到競標 Slot
3. 向 Ad Decision Service 發出請求（< 300ms 回應）
4. 系統向 SSP 發送 Bid Request
5. Creative Eligibility Check（素材已審核且此螢幕合格）
6. 合格 → 播出；不合格 / 無出價 / 超時 → 播 Fallback
7. Player 記錄 PoP Log（含 fallbackReason）

**關鍵規則：**
- 無 Proposal、無 Brief、無人工確認
- 素材必須通過 Media Owner 審核才能播
- Player 永不黑屏（Fallback 保護）

---

## 4. UI 設計決策

### 4.1 版位瀏覽頁（所有流程共用）

**地圖模式功能：**
- 版位 Pin（已選 / 推薦 / 其他可用）
- 受眾熱區 Heatmap overlay（可切換）
- 地圖控制層（熱區 / 曝光密度 / 受眾輪廓）
- 圖例說明

**側欄 — 推薦版位（含 DNA）：**
- 系統依廣告目標和受眾推薦版位
- 每個版位顯示 matchScore、受眾匹配、CPM 效益分數
- 一鍵加入

**底部 — 即時效益分析：**
- 預估總觸及人次
- 平均 CPM（對比市場均價）
- 預估總刊播費
- 受眾 DNA（目標受眾吻合度）
- 選擇或修改版位後自動更新

### 4.2 版位 DNA 詳情

每個版位可展開查看：
- 受眾輪廓（年齡、性別、主要族群比例）
- 尖峰時段
- 平日 vs 假日分佈
- 周邊 POI
- 在城市 / 行政區 / 類型的排名

### 4.3 Proposal 確認頁（廣告主視角）

**左側 — 可編輯的版位組合：**
- 每個版位顯示名稱、天數輸入欄（可直接修改）、每日定價、合計費用
- 刪除按鈕（移除版位）
- 加入其他版位：留言給業務按鈕（業務操作）

**右側 — 討論區：**
- 業務與廣告主的留言紀錄（含時間戳）
- 即時輸入框
- 所有留言可審計

**底部摘要：**
- 各版位合計費用
- 刊播總費用
- 刊播期間

**操作按鈕：**
- 稍後再說（離開不失去狀態）
- 確認此方案（觸發業務 Confirm Booking）
- 狀態提示文字（你修改的欄位業務會收到通知）

### 4.4 Admin / 業務的 Proposal 管理頁

**列表視圖顯示：**
- Proposal 名稱
- 廣告主名稱
- Proposal 狀態（含修改 / 留言標記）
- 上次更新時間
- 留言數量
- 操作按鈕（查看、更新、傳送、確認 Booking）

---

## 5. 新增的 booking_status 值

為支援業務主導流程，在現有 `booking_status` 加入：

```
not_confirmed           → 初始狀態（自助和業務均如此開始）
pending_sales_review    → 業務審核廣告主 Brief 中（可選狀態）
proposal_sent           → Proposal 已傳給廣告主，等待確認
pending_advertiser_confirmation → 廣告主確認中
confirmed               → 訂單確認（自助：廣告主確認；業務：業務確認）
inventory_reserved      → 版位已預留
scheduled               → 已排程
live                    → 播出中
completed               → 完成
cancelled               → 取消
blocked                 → 封鎖（素材問題 / 政策問題）
```

---

## 6. User Stories 完整清單

### 廣告主

**US-01：瀏覽版位（地圖模式）**
> 身為廣告主，我想在地圖上看到所有可投放的 DOOH 版位，搭配受眾熱區顯示，並能用篩選器縮小選擇，讓我快速找到符合目標受眾的地點。

**US-02：查看版位 DNA**
> 身為廣告主，我想點擊任一版位看到詳細的受眾輪廓（年齡、族群、尖峰時段），以及系統依我的廣告目標計算的匹配分數，讓我評估版位是否適合。

**US-03：即時效益預估**
> 身為廣告主，當我在地圖上選擇版位時，想立刻看到預估觸及人次、平均 CPM 和受眾吻合度，不需要等業務報價就能初步判斷組合是否划算。

**US-04：自助訂購 — 建立 Campaign 和 Media Plan**
> 身為廣告主，我想直接在系統裡選定版位、設定天數、建立 Media Plan，查看總預算和預估曝光，自己掌控整個採購過程。

**US-05：自助訂購 — 上傳素材並等待審核**
> 身為廣告主，我想上傳廣告素材並在系統裡追蹤審核進度，通過後才能確認訂單，確保播出的內容符合媒體主規範。

**US-06：提交需求 Brief（可選）**
> 身為廣告主，如果我想尋求業務協助，我可以在地圖上挑選感興趣的版位，附上廣告方向和預算範圍，送出給業務參考，不需要自己研究精確定價。

**US-07：線上確認業務提案（Proposal）**
> 身為廣告主，當業務建立好提案後，我想在系統裡直接查看版位組合和報價，可以修改天數或移除版位，也可以在討論區留言要求業務調整，確認後才算同意。

**US-08：追蹤 Campaign 狀態**
> 身為廣告主，我想隨時查看我的 Campaign 處於哪個狀態（訂單確認、素材審核、上線準備、播出中），以及目前是否有任何阻擋原因。

---

### 業務 / Admin

**US-09：直接建立 Proposal（不需要 Brief）**
> 身為業務，在和廣告主線下溝通完需求後，我想直接在後台建立 Proposal，設定推薦的版位組合、定價和刊播期間，不需要廣告主先透過系統填 Brief。

**US-10：從 Brief 建立 Proposal**
> 身為業務，當廣告主透過系統送來 Brief，我想直接以 Brief 的選位和需求方向為基礎建立 Proposal，快速組合出合適的版位方案。

**US-11：傳送 Proposal 給廣告主確認**
> 身為業務，建立好 Proposal 後，我想一鍵傳送給廣告主，讓他們在系統內查看並確認，不需要依賴 Email 往返。

**US-12：追蹤 Proposal 狀態**
> 身為業務，我想看到哪些 Proposal 廣告主還沒確認、哪些有留言需要回覆、哪些已被修改，方便跟進各案的進度。

**US-13：Confirm Booking（廣告主確認後）**
> 身為業務，廣告主線上確認 Proposal 後，我想一鍵 Confirm Booking 讓版位正式鎖定，並自動通知廣告主上傳素材。

**US-14：審核廣告素材**
> 身為 Admin，我想在素材審查佇列看到所有待審的廣告素材，查看預覽圖和格式規格，決定核准或退回（附上原因）。

**US-15：查看上線阻擋原因**
> 身為業務，我想查詢為什麼某個 Campaign 無法排程上線，包括素材未上傳、素材退回、版位衝突、訂單未確認等，方便跟客戶跟進。

---

## 7. 技術影響評估

### 新增資料表
- `briefs` — 需求摘要
- `proposals` — 業務提案
- `proposal_items` — Proposal 內的版位組合
- `proposal_comments` — 討論紀錄

### 修改資料表
- `campaigns` — 加入 `buying_method`（`self_service` / `sales_assisted` / `programmatic`）、`proposal_id`（可選）
- `campaign_inventory_items` — 加入 `advertiser_can_modify`（布林值，控制廣告主可否直接修改）

### 新增 API 端點群組
- Brief APIs（5 個）
- Proposal APIs（7 個）
- Proposal Comment APIs（4 個）
- Inventory DNA APIs（2 個）
- Recommendation APIs（1 個）
- Performance Estimates API（1 個）

### 更新 API 端點
- `POST /campaigns/:id/confirm-booking` — 加入 buying_method 判斷（自助 vs 業務模式規則不同）
- `POST /campaigns/:id/submit-for-review` — 區分自助（需先有素材）和業務流程

---

## 8. 不在本次範疇

- Programmatic SSP / DSP 真實整合（仍用 mock）
- 付款 / Billing 模組
- 廣告主角色的身份驗證（RLS）
- 版位動態定價
- AI 驅動的 matchScore 模型
- Brief 的推薦版位 ML 模型（靜態規則即可）

---

## 9. 開放問題

1. **Proposal 版本管理：** 業務更新 Proposal 後，廣告主是否能查看歷史版本對比？
2. **廣告主 Brief 的線下輸入：** 業務代為建立 Brief（整理線下溝通）的流程，前端需要什麼特別的表單設計？
3. **Proposal 有效期限：** 廣告主超過幾天沒確認，Proposal 自動 expired？
4. **直銷版位衝突：** 業務 Confirm Booking 時，若版位已被自助廣告主搶先預訂，如何處理？
5. **留言的檔案附件：** 業務是否需要在 Proposal 留言中附加檔案（如 PDF 報價單）？
