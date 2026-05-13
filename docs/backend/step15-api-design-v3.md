# Step 15: DOOH Platform — API Contract & Backend Architecture v3.0

**版本：** v3.0（整合三種採購模式、Brief / Draft / 版位 DNA）
**日期：** 2026-05-13
**前置文件：** Step 14 Schema、booking-creative-approval-model.md、step15-api-design-v2.md

> 不含實作代碼。不連接 Supabase。不整合真實 OpenRTB / SSP / DSP。
> 專注於 API 合約、產品邏輯、服務職責與上線準備。

---

## 1. API 設計原則

### 版本控制
```
https://api.dooh.io/v1/...
```

### HTTP 方法語意
| 方法 | 用途 |
|------|------|
| `GET` | 讀取 |
| `POST` | 建立 / 觸發動作 |
| `PATCH` | 部分更新 |
| `PUT` | 完整取代 |
| `DELETE` | 刪除 |

### 標準成功回應
- `200 OK` — 讀取 / 更新成功
- `201 Created` — 資源建立成功
- `202 Accepted` — 異步任務已接受
- `204 No Content` — 操作成功，無回傳

---

## 2. 服務邊界總覽

```
┌──────────────────────────────────────────────────────────────────┐
│                       客戶端 / 裝置                               │
│  Advertiser Web App  │  Admin / Sales Dashboard  │  Web Player   │
└──────────┬───────────┴──────────────┬────────────┴──────┬────────┘
           │                          │                    │
           ▼                          ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    API Gateway / BFF                              │
│               Auth · Rate Limit · Routing                        │
└──┬───────────────┬──────────────────────────┬───────────────────┘
   │               │                          │
   ▼               ▼                          ▼
┌──────────┐ ┌────────────────┐ ┌────────────────────────┐
│Advertiser│ │ Admin / Sales  │ │    Player Runtime      │
│ Service  │ │   Service      │ │      Service           │
│          │ │                │ │                        │
│ Browse   │ │ Brief review   │ │ Bootstrap config       │
│ Brief    │ │ Draft manage   │ │ Active loop            │
│ Campaign │ │ Booking confirm│ │ Heartbeat              │
│ Creative │ │ Creative review│ │ PoP logging            │
│ Booking  │ │ Screen / Inv   │ │ Programmatic trigger   │
│ Readiness│ │ Audit logs     │ └──────────┬─────────────┘
└──────────┘ └────────────────┘            │
                                           ▼
                              ┌────────────────────────┐
                              │  Ad Decision Service   │
                              │  · SSP connector       │
                              │  · Eligibility check   │
                              │  · Bid timeout 300ms   │
                              │  · Pacing              │
                              └────────────────────────┘
```

---

## 3. 採購模式總覽

### 3.1 自助訂購（Self-Service）
廣告主自己完成從選版位到 Confirm Booking 的全程。

```
Browse → Select Inventory → Create Campaign → Upload Creative
→ Creative Approved → Confirm Booking → Schedule → Live
```

**關鍵規則：** Creative Approval 必須在 Confirm Booking 之前或同時完成。

---

### 3.2 業務協助訂購（Sales-Assisted）
廣告主提 Brief → 業務建 Draft → 廣告主線上確認 → 業務 Confirm Booking。

```
Advertiser Browse → Submit Brief → Sales Creates Draft
→ Send Draft to Advertiser → Advertiser Reviews / Modifies
→ Advertiser Approves → Sales Confirms Booking → Creative Upload
→ Creative Approved → Schedule → Live
```

**關鍵規則：**
- Brief ≠ Booking
- Draft ≠ Confirmed Booking
- 廣告主 Approve Draft → 業務才能 Confirm Booking
- 直銷模式可在 Creative Approval 之前 Confirm Booking，但 Campaign 不能 live 直到素材通過

---

### 3.3 Programmatic DOOH
系統即時競標，Player 在播出前自動決策。

```
Programmatic Slot → Ad Opportunity → SSP Bid Request
→ Ad Decision → Eligibility Check → Play or Fallback → PoP Log
```

**關鍵規則：** 未審核 / 不合格的素材一律播 Fallback。Player 永不黑屏。

---

## 4. 狀態模型總覽

### Buying Method
```
self_service | sales_assisted | programmatic
```

### Transaction Type
```
self_service | direct_sold | programmatic_open | programmatic_pmp | programmatic_guaranteed
```

### Brief Status
```
draft → submitted → reviewing → converted_to_campaign_draft | closed
```

### Campaign Draft Status
```
created → sent_to_advertiser → viewed_by_advertiser
→ modified_by_advertiser | commented
→ approved_by_advertiser | rejected | expired
```

### Booking Status
```
not_confirmed → pending_sales_confirmation | pending_advertiser_confirmation
→ confirmed → inventory_reserved → scheduled → live → completed
                                              ↘ cancelled | blocked
```

### Creative Approval Status
```
not_requested → pending_upload → submitted → technical_check_passed
→ pending_media_owner_review → approved | approved_with_restrictions | rejected
                                           ↓
                               expired | revoked
```

### Launch Readiness Status
```
not_ready
ready_for_confirmation
ready_for_scheduling
ready_for_launch
blocked_by_creative | blocked_by_inventory | blocked_by_payment
blocked_by_policy | blocked_by_playlist | blocked_by_schedule
```

### Programmatic Ad Decision Status
```
filled | no_bid | timeout | invalid_creative | not_approved
preload_failed | fallback_used | error
```

---

## 5. API 端點群組總覽

| 群組 | 端點數 | 主要使用者 |
|------|--------|-----------|
| Marketplace | 5 | 廣告主 |
| Campaign Brief | 5 | 廣告主、業務 |
| Inventory DNA & Recommendation | 3 | 廣告主 |
| Performance Estimates | 1 | 廣告主 |
| Self-service Campaign | 7 | 廣告主 |
| Campaign Draft | 7 | 業務、廣告主 |
| Draft Comments | 4 | 廣告主、業務 |
| Booking / Insertion Order | 5 | 業務、廣告主 |
| Creative Upload | 5 | 廣告主 |
| Creative Approval | 4 | Admin、系統 |
| Launch Readiness | 3 | 系統、廣告主、業務 |
| Admin / Sales CMS | 12 | Admin、業務 |
| Loop & Slot Management | 9 | Admin |
| Player Runtime | 3 | Player 裝置 |
| Programmatic Ad Decision | 3 | Player、系統 |
| Proof-of-Play | 3 | Player |
| Reporting | 4 | 廣告主、Admin |
| Notifications | 2 | 廣告主、業務 |
| Audit Logs | 1 | Admin |

---

## 6. 詳細端點規格

---

### 群組 1：Advertiser Marketplace APIs

#### `GET /v1/inventory-locations`

**用途：** 瀏覽可投放的 DOOH 版位（支援地圖 / 列表 / 篩選）
**角色：** 廣告主

**Query Parameters：**

| 參數 | 說明 |
|------|------|
| `city` | 城市 |
| `district` | 行政區 |
| `venueType` | 場域類型 |
| `screenType` | 版面類型 |
| `minBudget` | 每日最低費 |
| `maxBudget` | 每日最高費 |
| `minImpressions` | 每日最低觸及 |
| `audience` | 受眾標籤（OR 匹配） |
| `q` | 搜尋關鍵字 |
| `sort` | `impressions_desc` / `cpm_asc` 等 |
| `includeHeatmap` | `true` 時回傳受眾熱區座標 |
| `cursor` / `limit` | 分頁 |

**Response `200`：**
```json
{
  "data": [{
    "id": "uuid-loc",
    "name": "台北 101 Mega Screen",
    "city": "Taipei",
    "district": "Xinyi",
    "latitude": 25.033964,
    "longitude": 121.564468,
    "venueType": "Mall",
    "screenType": "Mega Screen",
    "dailyImpressions": 850000,
    "cpm": 17.65,
    "pricePerDay": 15000,
    "availability": 0.8,
    "audienceTags": ["Tourists", "Shoppers", "Professionals"],
    "imageUrl": "https://cdn.dooh.io/...",
    "matchScore": 0.91
  }],
  "heatmapPoints": [
    { "lat": 25.033, "lng": 121.564, "weight": 0.9, "audienceType": "commuters" }
  ],
  "pagination": { "cursor": "...", "hasMore": false }
}
```

**MVP：** 直查 DB，matchScore 固定回傳 null
**Production：** Redis 快取 5 分鐘；matchScore 由 ML 模型計算；PostGIS 地理篩選

---

#### `GET /v1/inventory-locations/:id`

**用途：** 單一版位詳情（點擊地圖 Pin 時呼叫）
**Response：** 含 `operatingHours`、`minimumBookingDays`、`screenCount`、基本 DNA 摘要

---

#### `GET /v1/inventory-locations/:id/dna`

**用途：** 版位受眾 DNA 詳細資料（展開詳情時呼叫）

**Response `200`：**
```json
{
  "locationId": "uuid-loc",
  "locationName": "台北 101 Mega Screen",
  "audienceProfile": {
    "primaryAudience": ["Shoppers", "Tourists"],
    "ageGroups": { "18-24": 0.22, "25-34": 0.35, "35-44": 0.28 },
    "genderSplit": { "male": 0.48, "female": 0.52 },
    "peakHours": ["10:00-12:00", "15:00-18:00", "19:00-21:00"],
    "weekdayVsWeekend": { "weekday": 0.45, "weekend": 0.55 }
  },
  "performanceIndex": {
    "visibilityScore": 88,
    "dwellTimeAvgSec": 12,
    "repeatVisitorRate": 0.35
  },
  "nearbyPOI": [
    { "name": "ATT 4 Fun", "distanceM": 120, "type": "mall" },
    { "name": "台北 101 觀景台", "distanceM": 50, "type": "landmark" }
  ],
  "comparativeRank": {
    "inCity": 2,
    "inDistrict": 1,
    "byVenueType": 1
  }
}
```

**MVP：** 從 DB `audience_tags` 欄位組成靜態資料
**Production：** 整合第三方 audience intelligence（如 Placer.ai）

---

### 群組 2：Inventory Recommendation & DNA APIs

#### `GET /v1/inventory-recommendations`

**用途：** 根據廣告主填寫的 Brief 方向，回傳推薦版位列表（含 matchScore 和推薦理由）
**角色：** 廣告主（填 Brief 時）、業務（建 Draft 時）

**Query Parameters：**

| 參數 | 說明 |
|------|------|
| `objective` | 廣告目標 |
| `audienceTags` | 目標受眾 |
| `city` | 城市 |
| `budgetPerDay` | 每日預算上限 |
| `briefId` | 若從 Brief 呼叫，可帶入 briefId 供系統學習 |

**Response `200`：**
```json
{
  "recommendations": [
    {
      "locationId": "uuid-loc",
      "name": "台北車站大廳螢幕",
      "matchScore": 0.96,
      "matchReasons": [
        "通勤族覆蓋率 94%",
        "CPM 比同類型版位低 12%",
        "符合年輕族群偏好時段"
      ],
      "audienceFitScore": 0.94,
      "cpmEfficiencyScore": 0.88,
      "estimatedDailyReach": 1200000,
      "cpm": 15.00,
      "pricePerDay": 18000,
      "primaryAudience": ["Commuters", "Students", "Tourists"]
    }
  ],
  "totalRecommended": 5
}
```

**MVP：** 根據廣告主填的受眾標籤做靜態匹配
**Production：** ML 模型計算多維 matchScore；結合歷史 campaign 效益資料

---

### 群組 3：Performance Estimates APIs

#### `POST /v1/performance-estimates`

**用途：** 廣告主選版位後，即時計算預估效益（觸及、CPM、受眾吻合度）
**角色：** 廣告主（即時顯示）

**Request：**
```json
{
  "inventoryItems": [
    { "locationId": "uuid-loc-1", "days": 14 },
    { "locationId": "uuid-loc-2", "days": 14 }
  ],
  "targetAudience": ["Commuters", "Students"],
  "objective": "awareness"
}
```

**Response `200`：**
```json
{
  "totalEstimatedReach": 18000000,
  "totalBudget": 406000,
  "avgCpm": 16.3,
  "audienceMatchScore": 0.89,
  "audienceProfile": {
    "topTags": ["通勤族 68%", "學生 52%", "觀光旅客 71%"]
  },
  "breakdown": [
    {
      "locationId": "uuid-loc-1",
      "name": "台北 101",
      "estimatedReach": 11900000,
      "budget": 210000,
      "cpm": 17.65
    }
  ],
  "cpmVsMarketAvg": -0.08
}
```

**MVP：** 用 `dailyImpressions * days` 計算；matchScore 固定值
**Production：** 整合歷史 PoP 資料修正預估；動態受眾模型

---

### 群組 4：Campaign Brief APIs

#### `POST /v1/briefs`

**用途：** 廣告主建立需求 Brief（可先存草稿）
**角色：** 廣告主
**狀態初始：** `briefStatus = draft`

**Request：**
```json
{
  "name": "2026 夏季新品上市",
  "objective": "product_launch",
  "targetAudience": ["Commuters", "Students"],
  "budgetRangeMin": 300000,
  "budgetRangeMax": 600000,
  "preferredCity": "Taipei",
  "preferredPeriod": { "start": "2026-07-01", "end": "2026-08-31" },
  "interestedLocationIds": ["uuid-loc-1", "uuid-loc-2"],
  "campaignDirection": "希望強調品牌形象，偏向高人流室內版位，避免太嘈雜的戶外環境。",
  "additionalNotes": "預計同期有線上廣告投放，DOOH 作為品牌聲量補強。"
}
```

**Response `201`：**
```json
{
  "id": "uuid-brief",
  "briefStatus": "draft",
  "advertiserId": "uuid-adv",
  "name": "2026 夏季新品上市",
  "createdAt": "2026-05-13T10:00:00Z"
}
```

---

#### `GET /v1/briefs/:id`

**用途：** 讀取 Brief 詳情
**Response：** 完整 Brief 欄位含狀態歷程

---

#### `PATCH /v1/briefs/:id`

**用途：** 更新 Brief 草稿內容
**限制：** `briefStatus = draft` 才可更新

---

#### `POST /v1/briefs/:id/submit`

**用途：** 正式送出 Brief 給業務
**Validations：** 至少有一個感興趣的版位；`campaignDirection` 不為空
**狀態轉換：** `draft → submitted`
**副作用：** 業務收到 Brief 通知

---

#### `POST /v1/briefs/:id/convert-to-draft`

**用途：** 業務將 Brief 轉換為正式 Campaign Draft（Admin only）
**角色：** `super_admin` / 業務
**狀態轉換：** `submitted | reviewing → converted_to_campaign_draft`
**副作用：** 建立對應的 Campaign Draft

---

### 群組 5：Campaign Draft APIs（Sales-Assisted）

#### `POST /v1/admin/campaign-drafts`

**用途：** 業務建立 Campaign Draft
**角色：** `super_admin` / 業務
**狀態初始：** `draftStatus = created`

**Request：**
```json
{
  "briefId": "uuid-brief",
  "advertiserId": "uuid-adv",
  "name": "2026 夏季新品上市 — 建議方案 v1",
  "inventoryItems": [
    { "locationId": "uuid-loc-1", "days": 14, "pricePerDay": 15000 },
    { "locationId": "uuid-loc-2", "days": 14, "pricePerDay": 18000 }
  ],
  "startDate": "2026-07-01",
  "endDate": "2026-07-14",
  "totalBudget": 462000,
  "estimatedImpressions": 32000000,
  "salesNotes": "根據您的 Brief，我們建議以上組合，CPM 效益良好。"
}
```

**Response `201`：**
```json
{
  "id": "uuid-draft",
  "draftStatus": "created",
  "advertiserId": "uuid-adv",
  "briefId": "uuid-brief",
  "name": "2026 夏季新品上市 — 建議方案 v1",
  "totalBudget": 462000,
  "createdAt": "2026-05-13T11:00:00Z"
}
```

---

#### `GET /v1/campaign-drafts/:id`

**用途：** 廣告主或業務查看 Draft 詳情（含版位、定價、估算）
**角色：** 廣告主（自己的）、Admin

**Response `200`：**
```json
{
  "id": "uuid-draft",
  "draftStatus": "sent_to_advertiser",
  "name": "2026 夏季新品上市 — 建議方案 v1",
  "inventoryItems": [
    {
      "id": "uuid-item",
      "location": { "name": "台北 101", "district": "Xinyi" },
      "days": 14,
      "pricePerDay": 15000,
      "totalPrice": 210000,
      "advertiserCanModify": true
    }
  ],
  "startDate": "2026-07-01",
  "endDate": "2026-07-14",
  "totalBudget": 462000,
  "estimatedImpressions": 32000000,
  "salesNotes": "根據您的 Brief，我們建議以上組合。",
  "commentCount": 3,
  "lastModifiedBy": "advertiser",
  "lastModifiedAt": "2026-05-13T14:30:00Z"
}
```

---

#### `PATCH /v1/campaign-drafts/:id`

**用途：** 廣告主修改 Draft（天數、移除版位）或業務更新方案
**狀態轉換：** `sent_to_advertiser → modified_by_advertiser`（廣告主修改時）

**Request（廣告主修改天數）：**
```json
{
  "inventoryItems": [
    { "id": "uuid-item-1", "days": 21 },
    { "id": "uuid-item-2", "action": "remove" }
  ]
}
```

**Validations：**
- 廣告主只能修改 `advertiserCanModify = true` 的欄位（天數、移除版位）
- 不能自行修改定價或新增版位（需留言給業務）

**副作用：** 業務收到「Draft 已被廣告主修改」通知

---

#### `POST /v1/campaign-drafts/:id/send-to-advertiser`

**用途：** 業務傳送 Draft 給廣告主確認
**角色：** Admin / 業務
**狀態轉換：** `created | modified_by_sales → sent_to_advertiser`
**副作用：** 廣告主收到「Draft 請您確認」通知含連結

---

#### `POST /v1/campaign-drafts/:id/approve`

**用途：** 廣告主確認 Draft，表示同意進行訂單
**角色：** 廣告主
**Validations：** `draftStatus` 必須是 `sent_to_advertiser` 或 `modified_by_advertiser`
**狀態轉換：** `→ approved_by_advertiser`
**副作用：** 業務收到「廣告主已確認，可以 Confirm Booking」通知

**Note：** 此動作不自動確認訂單，業務仍需手動 Confirm Booking

---

#### `POST /v1/campaign-drafts/:id/request-changes`

**用途：** 廣告主要求修改（無法直接修改的欄位，如新增版位）
**角色：** 廣告主
**Request：** `{ "changeRequest": "能否加入西門商圈版位？預算可以微調。" }`
**狀態轉換：** `→ commented`
**副作用：** 業務收到通知，需要更新 Draft 並重新傳送

---

#### `POST /v1/campaign-drafts/:id/expire`

**用途：** 業務或系統讓 Draft 過期（超過有效期或取消提案）
**狀態轉換：** `→ expired`

---

### 群組 6：Draft Comment / Discussion APIs

#### `GET /v1/campaign-drafts/:id/comments`

**用途：** 查看 Draft 的討論紀錄
**Response：**
```json
{
  "comments": [
    {
      "id": "uuid-comment",
      "authorId": "uuid-user",
      "authorName": "業務 Jack Ni",
      "authorRole": "sales",
      "content": "根據您的需求 Brief，建議以上組合。台北車站換成西門商圈更符合年輕族群。",
      "createdAt": "2026-05-13T11:00:00Z",
      "editedAt": null
    }
  ]
}
```

---

#### `POST /v1/campaign-drafts/:id/comments`

**用途：** 廣告主或業務留言
**Request：** `{ "content": "可以加入西門商圈嗎？" }`
**副作用：**
- 廣告主留言 → 業務收到通知
- 業務留言 → 廣告主收到通知
- 所有留言記入 audit log

---

#### `PATCH /v1/campaign-drafts/:id/comments/:commentId`

**用途：** 修改自己的留言（限 5 分鐘內）
**Validations：** 只能修改自己發出的留言；超過 5 分鐘不可修改

---

#### `DELETE /v1/campaign-drafts/:id/comments/:commentId`

**用途：** 刪除自己的留言（限 5 分鐘內，且留言尚未被回覆）

---

### 群組 7：Self-service Campaign APIs

#### `POST /v1/campaigns`

**用途：** 廣告主建立廣告活動
**角色：** 廣告主
**Request：** `{ "name": "...", "objective": "awareness", "buyingMethod": "self_service" }`
**Response `201`：**
```json
{
  "id": "uuid-campaign",
  "bookingStatus": "not_confirmed",
  "creativeStatus": "not_requested",
  "launchReadiness": "not_ready",
  "buyingMethod": "self_service",
  "createdAt": "2026-05-13T10:00:00Z"
}
```

---

#### `GET /v1/campaigns/:id`

**Response：** 含 `bookingStatus`、`creativeStatus`、`launchReadiness`、版位列表、素材列表

---

#### `PATCH /v1/campaigns/:id`

**用途：** 更新活動基本設定
**限制：** `bookingStatus = not_confirmed` 才可修改

---

#### `POST /v1/campaigns/:id/inventory-items`

**Request：** `{ "locationId": "uuid-loc", "days": 14 }`
**Validations：** `days ≥ minimumBookingDays`；同版位不可重複加入

---

#### `DELETE /v1/campaigns/:id/inventory-items/:itemId`

**Response：** `204 No Content`
**Validations：** `bookingStatus = not_confirmed`

---

#### `POST /v1/campaigns/:id/submit-for-review`

**用途：** 自助廣告主送出審核（觸發素材審核 + Admin 通知）
**Validations：**
- 至少 1 個 inventory item
- 至少 1 個 creative asset（`approvalStatus ≠ rejected`）
**狀態轉換：** `bookingStatus: not_confirmed → pending_advertiser_confirmation`；`creativeStatus → pending_media_owner_review`
**副作用：** Admin 收到通知

---

#### `POST /v1/campaigns/:id/confirm-booking`

**用途：** 自助廣告主確認訂單（或業務代為確認）
**Validations：**
- 自助模式：`creativeStatus = approved`（素材需先通過）
- `bookingStatus = pending_advertiser_confirmation`
**狀態轉換：** `→ confirmed → inventory_reserved`
**副作用：** 版位預留；觸發排程流程

---

### 群組 8：Booking / Insertion Order APIs

#### `GET /v1/campaigns/:id/booking`

**用途：** 查詢 Campaign 完整訂單狀態

**Response `200`：**
```json
{
  "campaignId": "uuid-campaign",
  "bookingStatus": "inventory_reserved",
  "creativeStatus": "approved",
  "launchReadiness": "ready_for_scheduling",
  "buyingMethod": "sales_assisted",
  "confirmedAt": "2026-05-13T14:00:00Z",
  "confirmedBy": { "name": "業務 Jack Ni", "role": "sales" },
  "inventoryReservedAt": "2026-05-13T14:01:00Z",
  "startDate": "2026-07-01",
  "endDate": "2026-07-14",
  "totalBudget": 462000,
  "draftId": "uuid-draft"
}
```

---

#### `POST /v1/campaigns/:id/confirm-booking`

**用途：** 業務（直銷模式）正式確認訂單
**角色：** Admin / 業務（或廣告主在自助模式）
**Request：**
```json
{
  "notes": "Insertion Order #IO-2026-001 confirmed.",
  "bypassCreativeCheck": true
}
```

**Validations：**
- 直銷模式：`bypassCreativeCheck` 可為 true（業務特權）
- 自助模式：`creativeStatus` 必須是 `approved`
- Draft 模式：Draft `draftStatus = approved_by_advertiser`
**狀態轉換：** `→ confirmed`
**副作用：**
- 版位標記為預留（`inventory_reserved`）
- 發送「版位已確認，請上傳素材」通知給廣告主

---

#### `PATCH /v1/campaigns/:id/booking`

**用途：** 業務更新訂單細節（日期、備注）
**限制：** `bookingStatus ≠ live | completed`

---

#### `POST /v1/campaigns/:id/cancel-booking`

**用途：** 取消訂單
**Request：** `{ "reason": "Budget reallocation" }`
**副作用：** 釋放版位；若已 live 立刻暫停

---

#### `POST /v1/campaigns/:id/reserve-inventory`

**用途：** 系統在 Confirm Booking 後自動呼叫，正式鎖定版位
**角色：** 系統內部（通常不直接暴露給前端）

---

### 群組 9：Creative Upload APIs

#### `POST /v1/campaigns/:id/request-creative-upload`

**用途：** 系統或業務主動觸發「請廣告主上傳素材」通知
**角色：** 系統（Booking Confirmed 後自動觸發）、業務
**副作用：** 廣告主收到通知；`creativeStatus → pending_upload`

---

#### `POST /v1/creative-assets`

**用途：** 廣告主上傳廣告素材
**Request（multipart/form-data）：** `file`, `campaignId`, `name`
**Response `201`：**
```json
{
  "id": "uuid-creative",
  "name": "Summer Banner",
  "source": "platform",
  "approvalStatus": "submitted",
  "technicalCheck": "pending",
  "previewUrl": "blob://...",
  "fileType": "video",
  "fileSizeMb": 18.5,
  "uploadedAt": "2026-05-13T10:05:00Z"
}
```

**系統異步觸發：**
1. 技術檢查（格式、大小、時長）→ `technical_check_passed` 或 `rejected`
2. 通過技術檢查 → `pending_media_owner_review`
3. 更新 Campaign `creativeStatus`

---

#### `GET /v1/creative-assets/:id`

**Response：** 含 `approvalStatus`、`technicalCheck`、`rejectionReason`、`restrictions`

---

#### `PATCH /v1/creative-assets/:id`

**用途：** 更新素材名稱（不能換檔案，需重新上傳）
**Validations：** `approvalStatus ≠ approved`

---

#### `DELETE /v1/creative-assets/:id`

**Validations：** `approved` 素材不能刪除（需先 revoke）

---

### 群組 10：Creative Approval APIs

#### `GET /v1/creative-approvals/queue`

**用途：** Admin 查看所有 `pending_media_owner_review` 的素材

**Response `200`：**
```json
{
  "data": [{
    "creativeId": "uuid-creative",
    "name": "Summer Banner",
    "approvalStatus": "pending_media_owner_review",
    "campaign": { "id": "uuid-campaign", "name": "...", "buyingMethod": "sales_assisted" },
    "advertiser": { "name": "Brand X" },
    "fileType": "video",
    "durationSec": 15,
    "fileSizeMb": 18.5,
    "previewUrl": "https://cdn.dooh.io/...",
    "submittedAt": "2026-05-13T09:00:00Z"
  }],
  "totalPending": 4
}
```

---

#### `POST /v1/creative-approvals/:creativeId/review`

**用途：** Admin 審核素材
**Request：**
```json
{
  "decision": "approved",
  "notes": "Compliant with all standards.",
  "restrictions": null,
  "expiresAt": "2026-12-31T00:00:00Z"
}
```

有限制條件的核准：
```json
{
  "decision": "approved_with_restrictions",
  "restrictions": { "allowedHours": "18:00-23:00", "reason": "Alcohol product" }
}
```

退回：
```json
{
  "decision": "rejected",
  "rejectionReason": "Video exceeds 30-second maximum.",
  "suggestedFix": "Please re-cut to 30 seconds or below."
}
```

**副作用：**
- 更新 `creative_assets.approval_status`
- 重新計算 Campaign `creativeStatus`
- 觸發 `creative_eligibility_checks`（異步，逐螢幕）
- 通知廣告主

---

#### `GET /v1/creative-assets/:creativeId/eligibility`

**Response：**
```json
{
  "creativeId": "uuid-creative",
  "overallEligible": false,
  "checks": [
    { "screenId": "SCR-1000", "isEligible": true, "checkedAt": "..." },
    { "screenId": "SCR-1005", "isEligible": false, "failureReasons": ["content_rating mismatch"] }
  ]
}
```

---

#### `POST /v1/creative-assets/:creativeId/eligibility-check`

**用途：** 手動觸發資格重新檢查
**Response `202`：** `{ "jobId": "uuid-job", "status": "queued" }`

---

### 群組 11：Launch Readiness APIs

#### `GET /v1/campaigns/:id/launch-readiness`

**Response `200`：**
```json
{
  "campaignId": "uuid-campaign",
  "launchReadiness": "blocked_by_creative",
  "bookingStatus": "inventory_reserved",
  "creativeStatus": "rejected",
  "blockers": [
    {
      "type": "blocked_by_creative",
      "message": "All creative assets have been rejected.",
      "suggestedAction": "Upload replacement creative and resubmit for review.",
      "affectedCreatives": ["uuid-creative-1"]
    }
  ],
  "requirements": {
    "bookingConfirmed": true,
    "inventoryReserved": true,
    "creativeApproved": false,
    "playlistAssigned": false,
    "paymentCleared": null,
    "policyChecked": true,
    "scheduleValid": true
  }
}
```

---

#### `POST /v1/campaigns/:id/launch-readiness/check`

**用途：** 強制重新計算 launch_readiness
**Response `200`：** 最新 launch readiness 狀態

---

#### `POST /v1/campaigns/:id/schedule`

**用途：** 排程 Campaign
**Validations：** `launchReadiness = ready_for_scheduling`
**Request：** `{ "startDate": "2026-07-01", "endDate": "2026-07-14", "timeSlots": "all_day" }`
**狀態轉換：** `bookingStatus → scheduled`；`launchReadiness → ready_for_launch`
**副作用：** 建立 `playlists` + `playlist_items`
**Error：** `422 LAUNCH_READINESS_BLOCKED`

---

### 群組 12：Admin / Sales CMS APIs

#### `GET /v1/admin/briefs`

**用途：** 業務查看所有廣告主 Brief（含狀態篩選）
**Query：** `status=submitted`, `advertiserId`, `cursor`

---

#### `GET /v1/admin/campaign-drafts`

**用途：** 業務追蹤所有 Draft 狀態
**Response 含：** `draftStatus`、`commentCount`、`lastModifiedBy`、廣告主名稱

---

#### `GET /v1/admin/campaign-drafts/:id`

**用途：** 業務查看 Draft 完整詳情（包含所有版位、留言、版本歷程）

---

#### `GET /v1/admin/campaigns`

**用途：** 列出所有 Campaign（三狀態篩選）
**Query：** `bookingStatus`, `creativeStatus`, `launchReadiness`, `buyingMethod`, `advertiserId`

---

#### `GET /v1/admin/campaigns/:id`

**Response：** 完整 Campaign 詳情，含三狀態、Draft 關聯、素材、版位

---

#### `PATCH /v1/admin/campaigns/:id/status`

**用途：** Admin 更新 Campaign `bookingStatus`
**Request：** `{ "bookingStatus": "blocked", "reason": "Policy violation" }`

---

#### `GET/POST/PATCH /v1/admin/inventory-locations`

**用途：** 版位管理（列表 / 新增 / 更新）

---

#### `GET/POST/PATCH /v1/admin/screens`

**用途：** 螢幕裝置管理

---

### 群組 13：Loop & Slot Management APIs

#### `GET/POST /v1/loop-templates`

**用途：** 列出 / 建立 Loop 模板

---

#### `GET/PATCH/DELETE /v1/loop-templates/:id`

**用途：** 讀取 / 更新 / 刪除 Loop 模板
**刪除限制：** 有螢幕使用中不可刪除

---

#### `GET /v1/loop-templates/:id/slots`

**Response：**
```json
{
  "data": [
    { "position": 1, "slotType": "direct_sold", "durationSec": 10 },
    { "position": 2, "slotType": "house_content", "durationSec": 10 },
    { "position": 3, "slotType": "programmatic_open", "floorPriceCpm": 25.00, "isPremium": true },
    { "position": 4, "slotType": "fallback", "durationSec": 10 }
  ]
}
```

Slot 類型：`direct_sold | house_content | programmatic_open | programmatic_pmp | fallback | blackout`

---

#### `POST /v1/loop-templates/:id/slots`

**用途：** 批次設定 Slot 配置

---

#### `PATCH/DELETE /v1/loop-slots/:slotId`

**用途：** 更新 / 刪除單一 Slot

---

### 群組 14：Player Runtime APIs

#### `GET /v1/player/:screenId/bootstrap`

**用途：** Player 啟動時取得初始設定
**認證：** `X-Screen-Key: sk_screen_SCR1000_xxxxx`

**Response `200`：**
```json
{
  "screenId": "SCR-1000",
  "screenName": "台北 101 Display A",
  "serverTime": "2026-05-13T10:30:00.000Z",
  "loopTemplate": {
    "loopDurationSec": 300,
    "slots": [
      { "position": 1, "slotType": "direct_sold", "durationSec": 10 },
      { "position": 3, "slotType": "programmatic_open", "durationSec": 10, "floorPriceCpm": 25 }
    ]
  },
  "programmaticEnabled": true,
  "defaultFallback": {
    "type": "video",
    "url": "https://cdn.dooh.io/fallback/default.mp4",
    "durationSec": 10
  },
  "syncIntervalSec": 300,
  "heartbeatIntervalSec": 10
}
```

---

#### `GET /v1/player/:screenId/active-loop`

**用途：** 取得目前有效的播放清單（Player 定期 sync，每 5 分鐘）

**Response `200`：**
```json
{
  "playlistId": "uuid-playlist",
  "validUntil": "2026-05-13T11:00:00Z",
  "items": [
    {
      "position": 1,
      "slotType": "direct_sold",
      "durationSec": 10,
      "creative": {
        "id": "uuid-creative",
        "playUrl": "https://cdn.dooh.io/creative/summer.mp4",
        "approvalStatus": "approved"
      }
    },
    {
      "position": 3,
      "slotType": "programmatic_open",
      "durationSec": 10,
      "programmaticSlotId": "uuid-prog-slot",
      "fallback": { "url": "https://cdn.dooh.io/fallback/slot3.mp4" }
    }
  ]
}
```

**重要：** Player 播出前需確認 `approvalStatus = approved`；否則播 fallback

---

#### `POST /v1/player/:screenId/heartbeat`

**Request：**
```json
{
  "status": "online",
  "currentPlaylistId": "uuid-playlist",
  "currentPosition": 5,
  "timestamp": "2026-05-13T10:30:00Z"
}
```
**Response `200`：** `{ "ok": true, "serverTime": "2026-05-13T10:30:01Z" }`

---

### 群組 15：Programmatic Ad Decision APIs

#### `POST /v1/ad-opportunities`

**用途：** Player 即將播出 Programmatic Slot 時，請求廣告決策
**SLA：** < 300ms 回應
**認證：** Screen API Key

**Request：**
```json
{
  "screenId": "SCR-1000",
  "programmaticSlotId": "uuid-prog-slot",
  "loopSlotPosition": 3,
  "floorPriceCpm": 25.00,
  "opportunityAt": "2026-05-13T10:30:05.000Z"
}
```

**Response `200`（得標，素材合格）：**
```json
{
  "opportunityId": "uuid-opp",
  "status": "filled",
  "decision": {
    "id": "uuid-decision",
    "creativeUrl": "https://cdn.dsp.example/ad.mp4",
    "durationSec": 10,
    "winningBidCpm": 32.50,
    "isEligible": true,
    "approvalStatus": "approved"
  }
}
```

**Response `200`（Fallback，各種情況）：**
```json
{
  "opportunityId": "uuid-opp",
  "status": "fallback_used",
  "decisionStatus": "no_bid",
  "fallback": {
    "url": "https://cdn.dooh.io/fallback/default.mp4",
    "durationSec": 10
  }
}
```

**Fallback 觸發條件：**

| `decisionStatus` | 觸發情境 |
|-----------------|---------|
| `no_bid` | 無人出價 |
| `timeout` | 超過 300ms |
| `invalid_creative` | 素材格式錯誤 |
| `not_approved` | 素材未通過審核 |
| `preload_failed` | 素材無法預載 |
| `error` | SSP 回應錯誤 |

---

#### `POST /v1/ad-decisions/request`

**用途：** 批量請求廣告決策（非即時競標，預排用）

---

#### `GET /v1/ad-decisions/:id`

**用途：** 查詢特定競標決策詳情（除錯用）

---

### 群組 16：Proof-of-Play APIs

#### `POST /v1/proof-of-play-logs`

**用途：** Player 每次播出後即時回報（< 100ms，不等回應繼續播）

**Request（Direct Sold）：**
```json
{
  "screenId": "SCR-1000",
  "campaignId": "uuid-campaign",
  "creativeAssetId": "uuid-creative",
  "playlistItemId": "uuid-item",
  "playbackSource": "direct_sold",
  "playbackStatus": "completed",
  "durationSec": 15,
  "playedAt": "2026-05-13T10:30:15.000Z",
  "loopSlotPosition": 1
}
```

**Request（Programmatic）：**
```json
{
  "playbackSource": "programmatic_open",
  "adDecisionId": "uuid-decision",
  "winningBidCpm": 32.50,
  "loopSlotPosition": 3
}
```

**Request（Fallback）：**
```json
{
  "playbackSource": "fallback",
  "fallbackReason": "no_bid",
  "adOpportunityId": "uuid-opp",
  "loopSlotPosition": 3
}
```

**`playbackSource` 值：** `direct_sold | programmatic_open | programmatic_pmp | house_content | fallback`

---

#### `GET /v1/proof-of-play-logs`

**Query Parameters：** `campaignId`, `screenId`, `from`, `to`, `playbackSource`, `cursor`

---

#### `GET /v1/proof-of-play-logs/:id`

**用途：** 查詢單筆 PoP 詳情

---

### 群組 17：Reporting APIs

#### `GET /v1/reports/campaigns/:campaignId`

**Response `200`：**
```json
{
  "campaignId": "uuid-campaign",
  "summary": {
    "totalPlays": 12450,
    "completedPlays": 11890,
    "estimatedImpressions": 8500000,
    "budgetSpent": 45000,
    "avgCpm": 5.29,
    "directSoldPlays": 8400,
    "programmaticPlays": 3450,
    "fallbackPlays": 600,
    "programmaticFillRate": 0.852,
    "fallbackRate": 0.048
  }
}
```

---

#### `GET /v1/reports/campaigns/:campaignId/proof-of-play`

**用途：** 原始 PoP log 列表（廣告主可下載佐證）
**Query：** `from`, `to`, `playbackSource`, `cursor`

---

#### `GET /v1/reports/campaigns/:campaignId/delivery`

**用途：** 每日投放趨勢（含分拆數據）

---

#### `GET /v1/reports/programmatic/fill-rate`

**用途：** 媒體主查看 Programmatic 整體 fill rate 分析

---

### 群組 18：Notification APIs

#### `GET /v1/notifications`

**Response：**
```json
{
  "data": [{
    "id": "uuid-notif",
    "type": "draft_sent_to_advertiser",
    "title": "業務已傳送廣告方案給您確認",
    "body": "「2026 夏季新品上市 — 建議方案 v1」請查看並確認。",
    "link": "/campaign-drafts/uuid-draft",
    "isRead": false,
    "createdAt": "..."
  }],
  "unreadCount": 3
}
```

**通知類型完整列表：**
```
brief_submitted              → Admin 收到（廣告主送 Brief）
draft_sent_to_advertiser     → 廣告主收到（業務傳 Draft）
draft_approved_by_advertiser → 業務收到（廣告主確認 Draft）
draft_modified_by_advertiser → 業務收到（廣告主修改 Draft）
booking_confirmed            → 廣告主收到（版位已確認）
creative_upload_requested    → 廣告主收到（請上傳素材）
creative_submitted           → Admin 收到（廣告主上傳了素材）
creative_approved            → 廣告主收到
creative_rejected            → 廣告主收到（含原因）
launch_readiness_blocked     → 廣告主、業務收到（阻擋原因）
campaign_scheduled           → 廣告主收到
campaign_live                → 廣告主收到
creative_expiring_soon       → 廣告主收到（7 天前提醒）
```

---

#### `PATCH /v1/notifications/:id/read`

**Response：** `204 No Content`

---

### 群組 19：Audit Log APIs

#### `GET /v1/audit-logs`

**角色：** `super_admin` only
**Query：** `resourceType`, `resourceId`, `actorUserId`, `from`, `to`, `cursor`

**`action` 值完整列表：**
```
brief.submitted | brief.converted
draft.created | draft.sent | draft.modified | draft.approved | draft.expired
booking.confirmed | inventory.reserved | booking.cancelled
creative.uploaded | creative.technical_check_passed
creative.approved | creative.rejected | creative.revoked
launch_readiness.checked | campaign.scheduled | campaign.live
loop.updated | slot.updated
ad_opportunity.created | ad_decision.fallback
pop_log.received
```

---

## 7. 工作流程 API 序列

### Workflow 1：業務協助訂購（Sales-Assisted）

```
[廣告主] GET /inventory-locations?includeHeatmap=true
         → 瀏覽地圖，查看受眾熱區

[廣告主] GET /inventory-recommendations?objective=product_launch&audience=Commuters
         → 看推薦版位和匹配分數

[廣告主] POST /performance-estimates
         → 即時看預估觸及和 CPM

[廣告主] POST /briefs → { briefStatus: "draft" }
         POST /briefs/:id/submit → { briefStatus: "submitted" }
         ← 業務收到通知

[業務]   GET /admin/briefs
         → 查看 Brief 詳情，與廣告主聯繫確認

[業務]   POST /admin/campaign-drafts → { draftStatus: "created" }
         POST /campaign-drafts/:id/send-to-advertiser → { draftStatus: "sent_to_advertiser" }
         ← 廣告主收到「請確認 Draft」通知

[廣告主] GET /campaign-drafts/:id
         POST /campaign-drafts/:id/comments → 留言討論
         PATCH /campaign-drafts/:id → 修改天數 → { draftStatus: "modified_by_advertiser" }
         ← 業務收到修改通知

[業務]   PATCH /campaign-drafts/:id → 根據修改調整定價
         POST /campaign-drafts/:id/send-to-advertiser → { draftStatus: "sent_to_advertiser" }

[廣告主] POST /campaign-drafts/:id/approve → { draftStatus: "approved_by_advertiser" }
         ← 業務收到「廣告主已確認」通知

[業務]   POST /campaigns/:id/confirm-booking → { bookingStatus: "confirmed" }
         系統自動：POST /campaigns/:id/reserve-inventory → { bookingStatus: "inventory_reserved" }
         ← 廣告主收到「版位已確認，請上傳素材」通知

[廣告主] POST /creative-assets → { approvalStatus: "submitted" }
         系統異步：technical check → { approvalStatus: "pending_media_owner_review" }

[Admin]  GET /creative-approvals/queue
         POST /creative-approvals/:id/review { decision: "approved" }
         → creativeStatus: "approved"
         系統計算：launchReadiness: "ready_for_scheduling"
         ← 廣告主收到「素材通過審核」通知

[業務/系統] POST /campaigns/:id/schedule → { bookingStatus: "scheduled", launchReadiness: "ready_for_launch" }
```

---

### Workflow 2：自助訂購（Self-Service）

```
[廣告主] GET /inventory-locations
         → 瀏覽版位

[廣告主] POST /campaigns → { bookingStatus: "not_confirmed", creativeStatus: "not_requested" }
         POST /campaigns/:id/inventory-items × N
         POST /creative-assets → { approvalStatus: "submitted" }

         [系統] technical check → pending_media_owner_review
         [Admin] POST /creative-approvals/:id/review { decision: "approved" }
         → creativeStatus: "approved"
         → launchReadiness: "ready_for_confirmation"

[廣告主] POST /campaigns/:id/confirm-booking
         (Validation: creativeStatus = "approved" ✓)
         → { bookingStatus: "inventory_reserved" }
         → launchReadiness: "ready_for_scheduling"

         POST /campaigns/:id/schedule
         → { bookingStatus: "scheduled", launchReadiness: "ready_for_launch" }
```

---

### Workflow 3：素材退回與替換

```
[狀態] bookingStatus: "inventory_reserved"
       creativeStatus: "pending_media_owner_review"

[Admin] POST /creative-approvals/:id/review { decision: "rejected", rejectionReason: "..." }
        → creativeStatus: "rejected"
        → launchReadiness: "blocked_by_creative"
        ← 廣告主收到退回通知

[廣告主] GET /campaigns/:id/launch-readiness
         → { launchReadiness: "blocked_by_creative", blockers: [...] }

[廣告主] POST /creative-assets → 新素材
         [系統] technical check → pending_media_owner_review
         → creativeStatus: "pending_review"（有新素材待審）

[Admin]  POST /creative-approvals/:newCreativeId/review { decision: "approved" }
         → creativeStatus: "approved"
         → launchReadiness: "ready_for_scheduling"
         ← 廣告主收到通知
```

---

### Workflow 4：Programmatic 廣告決策

```
[Player] Loop 執行到 position 3（programmatic_open slot）

[Player] POST /ad-opportunities
         { screenId: "SCR-1000", programmaticSlotId: "...", floorPriceCpm: 25 }

         [後端] 向 SSP 發送 Bid Request（< 300ms）

         Case A — 得標且素材合格：
         [後端] 查 creative_eligibility_checks: is_eligible = true
              返回 { status: "filled", decision: { creativeUrl, winningBidCpm } }
         [Player] 播出廣告

         Case B — 未得標 / 超時 / 素材不合格：
         [後端] 返回 { status: "fallback_used", decisionStatus: "no_bid" | "timeout" | "not_approved" }
         [Player] 播出 Fallback

[Player] POST /proof-of-play-logs
         { playbackSource: "programmatic_open", adDecisionId: "...", winningBidCpm: 32.50 }
         或
         { playbackSource: "fallback", fallbackReason: "no_bid" }
```

---

### Workflow 5：Launch Readiness Check

```
[系統] GET /campaigns/:id/launch-readiness

       Checks:
       ① bookingStatus ∈ { confirmed, inventory_reserved } → ✓
       ② inventory_reserved = true → ✓
       ③ creativeStatus = approved → ✗（阻擋）
       ④ playlistAssigned = true → 未檢查（等③）
       ⑤ paymentCleared = null → 跳過（MVP 不啟用）
       ⑥ scheduleValid = true → 未檢查（等③）

       Response:
       {
         launchReadiness: "blocked_by_creative",
         blockers: [{
           type: "blocked_by_creative",
           message: "Creative approval pending.",
           suggestedAction: "Please wait for admin to review your creative."
         }]
       }

[素材通過後] 系統重新計算：
       ① ✓ ② ✓ ③ ✓ ④ 待確認 → launchReadiness: "ready_for_scheduling"

[排程後] 系統再次確認：
       所有項目 ✓ → launchReadiness: "ready_for_launch"
```

---

## 8. 統一錯誤回應格式

```json
{
  "error": {
    "code": "CREATIVE_NOT_APPROVED",
    "message": "Campaign cannot be scheduled until at least one creative is approved.",
    "details": {
      "campaignId": "uuid-xxx",
      "creativeStatus": "pending_media_owner_review",
      "launchReadiness": "blocked_by_creative"
    },
    "blockingReason": "Creative is still under media owner review.",
    "suggestedNextAction": "Wait for admin to complete creative review, or upload a replacement.",
    "requestId": "req-uuid-yyy"
  }
}
```

**完整錯誤碼列表：**

```
BRIEF_NOT_SUBMITTED          → Brief 未送出不可轉 Draft
DRAFT_NOT_APPROVED           → 廣告主未確認 Draft 不可 Confirm Booking
DRAFT_ALREADY_APPROVED       → 已確認的 Draft 不可再修改
BOOKING_NOT_CONFIRMED        → 未 Confirm Booking 不可排程
INVENTORY_NOT_AVAILABLE      → 版位已被他人預訂
CREATIVE_NOT_APPROVED        → 自助模式需先審核素材
CREATIVE_REJECTED            → 素材退回，需替換
CREATIVE_DURATION_MISMATCH   → 素材時長不符螢幕規格
LAUNCH_READINESS_BLOCKED     → 尚有阻擋因素，不可上線
NO_ACTIVE_LOOP               → 螢幕無有效播放清單
AD_DECISION_TIMEOUT          → 競標超時，使用 Fallback
NO_BID                       → 無人出價，使用 Fallback
FALLBACK_REQUIRED            → 需播 Fallback，附原因
PROOF_OF_PLAY_SUBMIT_FAILED  → PoP log 寫入失敗（Player 應重試）
FIELD_NOT_MODIFIABLE         → 廣告主嘗試修改業務專屬欄位
COMMENT_EDIT_WINDOW_EXPIRED  → 超過 5 分鐘不可修改留言
```

---

## 9. 角色與 API 授權

| 角色 | 認證方式 | 可存取的 API |
|------|---------|------------|
| `advertiser_user` | Supabase JWT | 自己的 campaigns、briefs、drafts、creative upload、notifications |
| `sales_user` | Supabase JWT | `/admin/briefs`、`/admin/campaign-drafts`、`/campaigns/:id/confirm-booking`（直銷）、所有 admin 讀取 |
| `super_admin` | Supabase JWT | 所有 API |
| `media_owner_reviewer` | Supabase JWT | `/creative-approvals/queue`、`/creative-approvals/:id/review` |
| `player_device` | Screen API Key | `/player/:screenId/*`、`/proof-of-play-logs`（POST） |
| `ad_decision_service` | Internal Service Token | `/ad-opportunities`、`/ad-decisions/*` |
| `ssp_dsp` | SSP API Key | 透過 Ad Decision Service 間接存取（不直接呼叫 API） |

---

## 10. MVP vs Production

### MVP 範圍（現在可做）

```
✅ GET /inventory-locations（已接 Supabase）
✅ POST /performance-estimates（靜態計算）
✅ POST /briefs, submit（建立 Brief 流程）
✅ POST /admin/campaign-drafts（業務建 Draft）
✅ GET/PATCH /campaign-drafts/:id（廣告主查看 / 修改）
✅ POST /campaign-drafts/:id/send-to-advertiser
✅ POST /campaign-drafts/:id/approve
✅ POST /campaign-drafts/:id/comments
✅ POST /campaigns（自助訂購）
✅ POST /campaigns/:id/confirm-booking
✅ POST /creative-assets（真實上傳 Supabase Storage）
✅ GET /creative-approvals/queue
✅ POST /creative-approvals/:id/review
✅ GET /campaigns/:id/launch-readiness（三狀態計算）
✅ GET /player/:screenId/active-loop（基本）
✅ POST /player/:screenId/heartbeat
✅ POST /proof-of-play-logs
✅ GET /reports/campaigns/:id
✅ GET /notifications
```

### 待後期實作

```
⏳ GET /inventory-locations/:id/dna（DNA 詳細資料）
⏳ GET /inventory-recommendations（ML matchScore）
⏳ POST /ad-opportunities（真實 SSP 連接）
⏳ GET /reports/programmatic/fill-rate
⏳ GET /audit-logs
⏳ 完整 Loop / Slot 管理 APIs
⏳ POST /campaigns/:id/schedule（完整排程）
⏳ 通知 Email / Push 推播
```

---

## 11. Open Questions

1. **Brief 有效期限：** Brief 送出後若業務 7 天沒處理，要自動 `closed` 嗎？
2. **Draft 版本管理：** 業務更新 Draft 後，舊版本是否保留歷程？廣告主是否能看到版本比對？
3. **廣告主修改 Draft 的權限邊界：** 只能改天數和移除版位？還是也可以要求換版位？是否允許廣告主增加新版位？
4. **DNA 資料來源：** 受眾 DNA 和熱區資料由誰提供？第三方服務（如 Placer.ai）還是自建模型？
5. **Performance Estimates 的精確度聲明：** 前端需要清楚標示「此為估算值，實際效果依刊播結果而定」
6. **留言刪除後的 Audit：** 刪除的留言是否保留在 audit log？
7. **直銷訂單的版位衝突：** 業務 Confirm Booking 前，同一版位時段若已被自助廣告主預訂怎麼辦？
8. **Programmatic + Direct Sold 混合 Loop：** 同一個 Loop 裡有 direct sold 的 Creative 審核失敗，是否影響整個 Loop 播出？
9. **多廣告主 PoP 合計：** 同一螢幕同時有多個 Campaign 的直銷和 Programmatic，PoP log 如何分配曝光歸因？
10. **Draft Comment 的檔案附件：** 業務是否可以在留言中附上更新的版位報價 PDF？

---

## 12. 建議實作順序

```
Phase 1：核心業務（已完成大部分）
  Inventory browsing, Campaign CRUD, Creative upload, Admin review
  ← 已完成

Phase 2：Brief + Draft 流程（直銷訂單）
  POST /briefs + submit
  POST /admin/campaign-drafts + send-to-advertiser
  POST /campaign-drafts/:id/approve
  POST /campaign-drafts/:id/comments
  POST /campaigns/:id/confirm-booking（業務版）
  ← 本次 spec 設計完，待實作

Phase 3：Launch Readiness 完整版
  GET /campaigns/:id/launch-readiness（完整 8 項檢查）
  POST /campaigns/:id/schedule
  DNA 靜態展示

Phase 4：Inventory DNA & Recommendation
  GET /inventory-locations/:id/dna
  GET /inventory-recommendations（靜態規則版）
  POST /performance-estimates（精確計算）

Phase 5：Programmatic（MVP SSP）
  POST /ad-opportunities（mock SSP）
  完整 PoP pipeline
  GET /reports/programmatic/fill-rate

Phase 6：Production 強化
  ML matchScore, 真實 SSP, RLS, Auth, Audit logs, Monitoring
```

---

*文件結束。Step 15 v3.0 整合自助訂購、業務協助訂購（含 Brief → Draft → 線上確認）、Programmatic 三種採購模式，共設計 80+ 個 API 端點，涵蓋完整的採購、素材審核、上線準備、播放管理、報表流程。*
