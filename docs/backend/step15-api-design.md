# Step 15: DOOH Platform — API Contract & Backend Service Architecture

**版本：** v1.0
**日期：** 2026-05-13
**前置：** Step 14 Schema Design（14A + 14B + 14C）

> **此文件不含實作代碼，不連接 Supabase，不整合 OpenRTB / SSP / DSP。**
> 專注於 API 設計、請求 / 回應結構、服務邊界與職責。

---

## 0. 給產品經理的入門說明

**什麼是 API Contract？**

API Contract 就像兩個人之間的「合約」：
- 前端（或 Player）說：「我要發送這樣格式的請求」
- 後端說：「我會回傳這樣格式的回應」

只要雙方遵守這份合約，前後端可以獨立開發，互不干擾。

**本文件的命名規則**

```
POST   /api/v1/campaigns          → 建立廣告活動
GET    /api/v1/campaigns/abc-123  → 讀取單一廣告活動
PATCH  /api/v1/campaigns/abc-123  → 更新廣告活動
DELETE /api/v1/campaigns/abc-123  → 刪除廣告活動
```

- `POST` = 新增（Create）
- `GET`  = 讀取（Read）
- `PATCH` = 部分更新（Update）
- `PUT`  = 完整取代（Replace）
- `DELETE` = 刪除

---

## 1. API 設計原則

### 1.1 版本控制

所有 API 路徑加上 `/v1/` 前綴，確保未來可以推出 v2 而不影響現有客戶：

```
https://api.dooh.io/v1/campaigns
```

### 1.2 HTTP 狀態碼規範

| 狀態碼 | 情境 |
|--------|------|
| `200 OK` | 請求成功，有資料回傳 |
| `201 Created` | 資源建立成功 |
| `204 No Content` | 操作成功，無回傳內容（如刪除） |
| `400 Bad Request` | 請求格式錯誤或缺少必要欄位 |
| `401 Unauthorized` | 未登入 |
| `403 Forbidden` | 已登入但無權限 |
| `404 Not Found` | 資源不存在 |
| `409 Conflict` | 衝突（如重複資料） |
| `422 Unprocessable Entity` | 格式正確但業務邏輯不通過 |
| `429 Too Many Requests` | 請求頻率超過限制 |
| `500 Internal Server Error` | 伺服器內部錯誤 |

### 1.3 命名規範

- 路徑用 **kebab-case**（小寫 + 連字號）：`/creative-assets`
- JSON 欄位用 **camelCase**：`campaignId`, `createdAt`
- 時間格式統一用 **ISO 8601**：`2026-05-13T10:30:00Z`
- 金額以**最小單位整數**傳輸：NTD 用元，USD 用 cent（避免浮點誤差）
  - 但為了 PM 可讀性，本文件 example 仍用小數

### 1.4 分頁格式

所有列表 API 一律使用 Cursor-based pagination：

```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6Ijg3YiJ9",
    "hasMore": true,
    "limit": 20
  }
}
```

---

## 2. 服務邊界總覽

```
┌─────────────────────────────────────────────────────────────┐
│                    客戶端 / 裝置                             │
│  Advertiser Web App │ Admin Dashboard │ Web Player           │
└──────────┬──────────┴────────┬────────┴──────────┬──────────┘
           │                   │                    │
           ▼                   ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│                    API Gateway / BFF                          │
│              Auth check · Rate limit · Routing               │
└──────┬───────────────┬────────────────────────┬─────────────┘
       │               │                        │
       ▼               ▼                        ▼
┌──────────┐  ┌─────────────────┐  ┌────────────────────────┐
│Advertiser│  │   Admin / CMS   │  │   Player Runtime       │
│  Service │  │    Service      │  │      Service           │
│          │  │                 │  │ · Playlist fetching    │
│·Campaign │  │·Campaign review │  │ · Heartbeat            │
│·Inventory│  │·Creative review │  │ · PoP logging          │
│·Creative │  │·Inventory mgmt  │  │ · Programmatic trigger │
│·Media    │  │·Screen mgmt     │  │                        │
│  upload  │  │·Audit logs      │  └────────────┬───────────┘
└──────────┘  └─────────────────┘               │
                                                 ▼
                                   ┌─────────────────────────┐
                                   │  Programmatic Engine    │
                                   │  · SSP connector        │
                                   │  · Bid timeout          │
                                   │  · Ad decision          │
                                   │  · Eligibility check    │
                                   └─────────────────────────┘
                                                 │
                          ┌──────────────────────┼──────────────┐
                          ▼                      ▼              ▼
                   ┌────────────┐  ┌──────────────────┐  ┌──────────┐
                   │ PostgreSQL │  │ Supabase Storage │  │  Redis   │
                   │(Supabase)  │  │(creative assets) │  │ (pacing) │
                   └────────────┘  └──────────────────┘  └──────────┘
```

---

## 3. Advertiser Marketplace APIs

廣告主使用的全部 API：瀏覽版位、建立 Campaign、上傳素材。

---

### 3A. 版位 Inventory

#### `GET /api/v1/inventory`

- **用途：** 列出所有可投放的 DOOH 版位（支援篩選、搜尋、排序）
- **使用模組：** Campaign Planner / Inventory Discovery

**Query Parameters：**

| 參數 | 類型 | 說明 |
|------|------|------|
| `city` | string | 城市篩選，如 `Taipei` |
| `district` | string | 行政區，如 `Xinyi` |
| `venueType` | string | 場域類型 |
| `screenType` | string | 版面類型 |
| `minBudget` | number | 每日最低價格 |
| `maxBudget` | number | 每日最高價格 |
| `minImpressions` | number | 每日最低曝光 |
| `q` | string | 搜尋關鍵字（名稱/地址） |
| `sort` | string | `impressions_desc`/`price_asc` 等 |
| `limit` | number | 每頁筆數（預設 20） |
| `cursor` | string | 分頁游標 |

**Response `200`：**

```json
{
  "data": [
    {
      "id": "uuid-xxxx",
      "name": "Taipei 101 Mega Screen",
      "city": "Taipei",
      "district": "Xinyi",
      "address": "No. 7, Section 5, Xinyi Rd",
      "latitude": 25.033964,
      "longitude": 121.564468,
      "venueType": "Mall",
      "screenType": "Mega Screen",
      "dailyImpressions": 850000,
      "cpm": 17.65,
      "pricePerDay": 15000,
      "availability": 0.8,
      "audienceTags": ["Tourists", "Shoppers", "Professionals"],
      "imageUrl": "https://cdn.dooh.io/images/tpe_101.png",
      "description": "Iconic mega screen at the base of Taipei 101."
    }
  ],
  "pagination": { "cursor": "eyJpZCI...", "hasMore": false, "limit": 20 }
}
```

**Error Cases：** `400` 無效的 sort 參數
**MVP：** 直接查 `inventory_locations` 表，無快取
**Production：** 加 Redis 快取（TTL 5 分鐘）；搜尋改用 Full-text search

---

#### `GET /api/v1/inventory/:id`

- **用途：** 讀取單一版位詳情
- **使用模組：** Inventory Detail Card

**Response `200`：** 同上單一物件，額外含 `operatingHours`、`minimumBookingDays`、`activeScreenCount`

**Error Cases：** `404` 版位不存在或已下架

---

### 3B. Campaign 廣告活動

#### `POST /api/v1/campaigns`

- **用途：** 建立新廣告活動（初始狀態為 draft）
- **使用模組：** Campaign Planner

**Request Body：**

```json
{
  "name": "2026 Summer Campaign",
  "objective": "awareness",
  "buyingType": "direct",
  "campaignDays": 7
}
```

**Response `201`：**

```json
{
  "id": "uuid-campaign",
  "advertiserId": "uuid-adv",
  "name": "2026 Summer Campaign",
  "objective": "awareness",
  "status": "draft",
  "buyingType": "direct",
  "campaignDays": 7,
  "totalBudget": null,
  "estimatedImpressions": null,
  "createdAt": "2026-05-13T10:00:00Z"
}
```

**Validations：**
- `name` 必填，1–100 字元
- `objective` 必須是有效 enum
- `buyingType` 預設 `direct`

---

#### `GET /api/v1/campaigns/:id`

- **用途：** 讀取單一 Campaign 詳情（含 inventory items + creatives）

**Response `200`：**

```json
{
  "id": "uuid-campaign",
  "name": "2026 Summer Campaign",
  "status": "draft",
  "inventoryItems": [
    {
      "id": "uuid-item",
      "inventoryLocationId": "uuid-loc",
      "inventoryLocation": { "name": "Taipei 101...", "district": "Xinyi" },
      "days": 7,
      "pricePerDay": 15000,
      "dailyImpressions": 850000,
      "totalPrice": 105000,
      "totalImpressions": 5950000
    }
  ],
  "creativeAssets": [
    {
      "id": "uuid-creative",
      "name": "summer_banner.jpg",
      "approvalStatus": "pending_review"
    }
  ],
  "estimate": {
    "totalBudget": 105000,
    "estimatedImpressions": 5950000,
    "avgCpm": 17.65
  }
}
```

---

#### `PATCH /api/v1/campaigns/:id`

- **用途：** 更新 Campaign 基本設定
- **限制：** 只有 `draft` 或 `rejected` 狀態可以修改

**Request Body（部分更新）：**

```json
{
  "name": "2026 Summer Campaign v2",
  "campaignDays": 14,
  "startDate": "2026-06-01",
  "endDate": "2026-06-14"
}
```

**Error Cases：**
- `422` 嘗試修改 `pending_review` 以後的 campaign

---

#### `POST /api/v1/campaigns/:id/submit`

- **用途：** 廣告主送出審核（Draft → Pending Review）
- **使用模組：** Campaign Review Step

**Response `200`：**

```json
{
  "id": "uuid-campaign",
  "status": "pending_review",
  "submittedAt": "2026-05-13T12:00:00Z"
}
```

**Validations：**
- 必須有至少 1 個 inventory item
- 必須有至少 1 個 creative asset
- Campaign 必須是 `draft` 或 `rejected` 狀態

**Error Cases：**
- `422` 沒有 inventory 或 creative

---

### 3C. Campaign Inventory Items（Media Plan）

#### `POST /api/v1/campaigns/:id/inventory-items`

- **用途：** 加入版位到 Media Plan
- **使用模組：** Campaign Planner

**Request Body：**

```json
{
  "inventoryLocationId": "uuid-loc",
  "days": 7
}
```

**Response `201`：**

```json
{
  "id": "uuid-item",
  "inventoryLocationId": "uuid-loc",
  "days": 7,
  "pricePerDay": 15000,
  "dailyImpressions": 850000,
  "totalPrice": 105000,
  "totalImpressions": 5950000
}
```

**Validations：**
- `days` ≥ 版位的 `minimumBookingDays`
- 同一版位在同一 Campaign 不能重複加入（`409 Conflict`）
- Campaign 必須是可編輯狀態

---

#### `DELETE /api/v1/campaigns/:id/inventory-items/:itemId`

- **用途：** 從 Media Plan 移除版位
- **Response：** `204 No Content`

---

#### `PATCH /api/v1/campaigns/:id/inventory-items/:itemId`

- **用途：** 更新刊播天數

**Request Body：** `{ "days": 14 }`

---

### 3D. Creative Assets 廣告素材

#### `POST /api/v1/media-assets/upload-url`

- **用途：** 取得 Supabase Storage 的預簽名上傳 URL（不直接把檔案傳到 API server）
- **使用模組：** Creative Upload Step

**Request Body：**

```json
{
  "filename": "summer_banner.mp4",
  "contentType": "video/mp4",
  "fileSizeBytes": 52428800
}
```

**Response `200`：**

```json
{
  "uploadUrl": "https://gfrppplnqx.supabase.co/storage/v1/object/...",
  "storagePath": "advertisers/uuid-adv/assets/uuid-summer_banner.mp4",
  "expiresAt": "2026-05-13T10:15:00Z"
}
```

**Validations：**
- `contentType` 必須是 `image/jpeg`、`image/png`、`video/mp4` 之一
- `fileSizeBytes` ≤ 104857600（100MB）

---

#### `POST /api/v1/campaigns/:id/creative-assets`

- **用途：** 上傳完成後，將素材與 Campaign 綁定並建立審核記錄
- **使用模組：** Creative Upload Step

**Request Body：**

```json
{
  "name": "Summer Banner",
  "storagePath": "advertisers/uuid-adv/assets/uuid-summer_banner.mp4",
  "fileType": "video",
  "mimeType": "video/mp4",
  "fileSizeBytes": 52428800,
  "durationSeconds": 15
}
```

**Response `201`：**

```json
{
  "id": "uuid-creative",
  "name": "Summer Banner",
  "approvalStatus": "pending_review",
  "source": "platform",
  "previewUrl": "https://cdn.dooh.io/...",
  "createdAt": "2026-05-13T10:05:00Z"
}
```

---

#### `DELETE /api/v1/campaigns/:id/creative-assets/:assetId`

- **用途：** 從 Campaign 移除素材
- **Response：** `204 No Content`

---

## 4. Admin / CMS APIs

平台管理員使用的 API。所有 Admin API 都需要 `role = super_admin`。

---

#### `GET /api/v1/admin/campaigns`

- **用途：** 列出所有廣告主的 Campaign（支援狀態篩選）

**Query Parameters：** `status`, `advertiserId`, `sort`, `cursor`

**Response `200`：** Campaign 列表，含 advertiser 基本資訊

---

#### `PATCH /api/v1/admin/campaigns/:id/status`

- **用途：** 核准或退回廣告活動

**Request Body：**

```json
{
  "status": "approved",
  "notes": "All creatives comply with standards."
}
```

**Validations：**
- `status` 只能是 `approved` 或 `rejected`
- 只有 `pending_review` 的 Campaign 可以做這個操作

**副作用：**
- 建立 `audit_logs` 記錄
- 發送 `notifications` 給廣告主

---

#### `GET /api/v1/admin/inventory`

- **用途：** 管理所有版位（含非公開的）

---

#### `POST /api/v1/admin/inventory`

- **用途：** 新增版位

**Request Body：** 完整的 `inventory_locations` 欄位

---

#### `PUT /api/v1/admin/inventory/:id`

- **用途：** 完整更新版位資訊（含價格、曝光數更新）

---

#### `PATCH /api/v1/admin/inventory/:id`

- **用途：** 部分更新（如只改 availability 或 is_active）

---

#### `GET /api/v1/admin/screens`

- **用途：** 列出所有播出裝置及其狀態

**Response `200`：**

```json
{
  "data": [
    {
      "id": "uuid-screen",
      "screenCode": "SCR-1000",
      "screenName": "Taipei 101 Display A",
      "status": "online",
      "lastHeartbeatAt": "2026-05-13T10:29:45Z",
      "currentCampaignId": "uuid-campaign",
      "inventoryLocation": { "name": "Taipei 101...", "district": "Xinyi" }
    }
  ]
}
```

---

#### `PATCH /api/v1/admin/screens/:id`

- **用途：** 更新螢幕設定（loop template、programmatic 開關等）

**Request Body：**

```json
{
  "loopTemplateId": "uuid-loop",
  "programmaticEnabled": true,
  "defaultFallbackAssetId": "uuid-asset"
}
```

---

## 5. Loop / Slot Management APIs

管理播放循環模板與 Programmatic Slot 配置。

---

#### `GET /api/v1/admin/loop-templates`

- **用途：** 列出所有 Loop Templates

---

#### `POST /api/v1/admin/loop-templates`

- **用途：** 建立新 Loop Template

**Request Body：**

```json
{
  "name": "5-min Standard Loop",
  "loopDurationSec": 300,
  "totalSlots": 30,
  "defaultSlotDurationSec": 10,
  "applicableScreenTypes": ["Billboard", "Mega Screen"]
}
```

---

#### `GET /api/v1/admin/loop-templates/:id/slots`

- **用途：** 讀取 Loop Template 的所有 Slot 定義

**Response `200`：**

```json
{
  "data": [
    {
      "id": "uuid-slot",
      "position": 1,
      "label": "Slot 1",
      "durationSec": 10,
      "slotType": "direct_sold",
      "floorPriceCpm": null
    },
    {
      "id": "uuid-slot-3",
      "position": 3,
      "label": "Slot 3 - Prime",
      "durationSec": 10,
      "slotType": "programmatic",
      "isPremium": true,
      "floorPriceCpm": 25.00
    }
  ]
}
```

---

#### `PUT /api/v1/admin/loop-templates/:id/slots`

- **用途：** 批次更新 Slot 配置（一次送出全部 slots）

**Request Body：**

```json
{
  "slots": [
    { "position": 1, "slotType": "direct_sold", "durationSec": 10 },
    { "position": 2, "slotType": "house_content", "durationSec": 10 },
    { "position": 3, "slotType": "programmatic", "floorPriceCpm": 25.00 }
  ]
}
```

---

#### `GET /api/v1/admin/screens/:screenId/programmatic-slots`

- **用途：** 讀取特定螢幕的 Programmatic Slot 配置

---

#### `PATCH /api/v1/admin/screens/:screenId/programmatic-slots/:slotId`

- **用途：** 更新特定 Programmatic Slot（底價、超時、定向參數）

**Request Body：**

```json
{
  "floorPriceCpm": 30.00,
  "timeoutMs": 250,
  "targetingParams": {
    "geo": "Taipei",
    "venue": "mall",
    "audience": ["Professionals", "Shoppers"]
  },
  "fallbackAssetId": "uuid-asset"
}
```

---

## 6. Player Runtime APIs

Web Player 裝置呼叫的 API。

---

#### `GET /api/v1/player/:screenCode/config`

- **用途：** Player 啟動時取得初始配置
- **使用模組：** Web Player

**Response `200`：**

```json
{
  "screenId": "uuid-screen",
  "screenCode": "SCR-1000",
  "screenName": "Taipei 101 Display A",
  "loopTemplate": {
    "loopDurationSec": 300,
    "totalSlots": 30
  },
  "programmaticEnabled": true,
  "defaultFallbackUrl": "https://cdn.dooh.io/fallback/default.mp4"
}
```

---

#### `GET /api/v1/player/:screenCode/playlist`

- **用途：** 取得目前有效的播放清單
- **使用模組：** Web Player

**Response `200`：**

```json
{
  "playlistId": "uuid-playlist",
  "startDate": "2026-05-13",
  "endDate": "2026-05-20",
  "items": [
    {
      "id": "uuid-item",
      "position": 1,
      "slotType": "direct_sold",
      "durationSeconds": 10,
      "creative": {
        "id": "uuid-creative",
        "name": "Summer Banner",
        "fileType": "video",
        "playUrl": "https://cdn.dooh.io/creative/summer_banner.mp4"
      }
    },
    {
      "id": "uuid-item-3",
      "position": 3,
      "slotType": "programmatic",
      "durationSeconds": 10,
      "programmaticSlotId": "uuid-prog-slot"
    }
  ]
}
```

---

#### `POST /api/v1/player/:screenCode/heartbeat`

- **用途：** 每 10 秒回報一次裝置狀態，更新 `last_heartbeat_at`

**Request Body：**

```json
{
  "status": "online",
  "currentPlaylistId": "uuid-playlist",
  "currentItemPosition": 5,
  "timestamp": "2026-05-13T10:30:00Z"
}
```

**Response `200`：** `{ "ok": true }`

---

## 7. Programmatic Ad Decision APIs

Player 觸發競標時呼叫。速度是最高優先。

---

#### `POST /api/v1/programmatic/opportunity`

- **用途：** Player 即將播出 Programmatic Slot 時，觸發競標請求
- **使用模組：** Web Player / Programmatic Engine

**Request Body：**

```json
{
  "screenCode": "SCR-1000",
  "programmaticSlotId": "uuid-prog-slot",
  "loopSlotPosition": 3,
  "opportunityAt": "2026-05-13T10:30:05.000Z",
  "floorPriceCpm": 25.00
}
```

**Response `200`（有得標）：**

```json
{
  "opportunityId": "uuid-opp",
  "status": "won",
  "decision": {
    "id": "uuid-decision",
    "creativeUrl": "https://cdn.dsp.example/ad_creative.mp4",
    "winningBidCpm": 32.50,
    "isPlayable": true,
    "durationSeconds": 10
  }
}
```

**Response `200`（無人出價）：**

```json
{
  "opportunityId": "uuid-opp",
  "status": "no_bid",
  "decision": null,
  "fallback": {
    "url": "https://cdn.dooh.io/fallback/default.mp4",
    "reason": "no_bid"
  }
}
```

**SLA 要求：** 此 API 必須在 300ms 內回應（競標超時即回 fallback）
**MVP：** 回傳 mock decision，不真正呼叫 SSP
**Production：** 內部呼叫 SSP，做 eligibility check，計算 pacing

---

#### `GET /api/v1/programmatic/opportunities/:id`

- **用途：** 查詢特定競標的結果（供除錯用）

---

## 8. Creative Approval APIs

素材審核相關 API，管理員和自動審核 Bot 使用。

---

#### `GET /api/v1/admin/creative-review`

- **用途：** 取得待審核的素材佇列
- **使用模組：** Admin CMS 素材審查

**Query Parameters：** `status=pending_review`, `cursor`, `limit`

**Response `200`：**

```json
{
  "data": [
    {
      "id": "uuid-creative",
      "name": "Summer Banner",
      "campaign": { "id": "uuid-campaign", "name": "2026 Summer Campaign" },
      "advertiser": { "id": "uuid-adv", "name": "Brand X" },
      "fileType": "video",
      "fileSizeBytes": 52428800,
      "durationSeconds": 15,
      "previewUrl": "https://cdn.dooh.io/...",
      "approvalStatus": "pending_review",
      "createdAt": "2026-05-13T09:00:00Z"
    }
  ]
}
```

---

#### `POST /api/v1/admin/creative-assets/:id/approve`

- **用途：** 核准素材

**Request Body：** `{ "notes": "Compliant with all standards." }`

**副作用：**
- 更新 `creative_assets.approval_status = 'approved'`
- 建立 `creative_approval_logs` 記錄
- 觸發 `creative_eligibility_checks`（異步）
- 發送通知給廣告主

---

#### `POST /api/v1/admin/creative-assets/:id/reject`

- **用途：** 拒絕素材，需提供原因

**Request Body：**

```json
{
  "rejectionReason": "Video exceeds maximum 15 seconds limit.",
  "notes": "Please re-cut to fit within 15s."
}
```

---

#### `POST /api/v1/creative-assets/:id/eligibility-check`

- **用途：** 手動觸發特定素材對特定螢幕的播出資格檢查
- **使用模組：** Admin CMS / Programmatic Engine

**Request Body：**

```json
{
  "screenIds": ["uuid-screen-1", "uuid-screen-2"]
}
```

**Response `202 Accepted`：** 非同步執行，立即回傳 job ID

```json
{ "jobId": "uuid-job", "status": "queued" }
```

---

#### `GET /api/v1/creative-assets/:id/eligibility`

- **用途：** 查詢素材的播出資格結果

**Response `200`：**

```json
{
  "creativeAssetId": "uuid-creative",
  "checks": [
    {
      "screenId": "uuid-screen-1",
      "screenName": "Taipei 101 Display A",
      "isEligible": true,
      "checkedAt": "2026-05-13T10:10:00Z"
    },
    {
      "screenId": "uuid-screen-2",
      "screenName": "Songshan Airport Gate B",
      "isEligible": false,
      "failureReasons": ["content_rating: screen requires 'general', creative rated 'pg13'"],
      "checkedAt": "2026-05-13T10:10:01Z"
    }
  ]
}
```

---

## 9. Proof-of-Play APIs

---

#### `POST /api/v1/pop/logs`

- **用途：** Player 每次播出後回報 PoP 記錄
- **使用模組：** Web Player

**Request Body：**

```json
{
  "screenCode": "SCR-1000",
  "campaignId": "uuid-campaign",
  "creativeAssetId": "uuid-creative",
  "playlistItemId": "uuid-item",
  "playbackType": "direct",
  "playbackStatus": "completed",
  "durationSeconds": 15,
  "playedAt": "2026-05-13T10:30:15.000Z",
  "loopSlotPosition": 1
}
```

**Response `201`：** `{ "id": "uuid-log", "ok": true }`

**Design 重點：**
- 這是高頻 API，每次播出就一筆
- 必須快速回應（< 100ms），Player 不等回應直接繼續播
- 可考慮異步寫入（寫 queue，再 batch insert）
- Programmatic 播出需額外帶 `adDecisionId` 和 `winningBidCpm`

**Programmatic 版的額外欄位：**

```json
{
  "playbackType": "programmatic",
  "adDecisionId": "uuid-decision",
  "winningBidCpm": 32.50
}
```

---

#### `GET /api/v1/pop/logs`

- **用途：** 查詢 PoP 記錄（限管理員或報表服務使用）

**Query Parameters：** `campaignId`, `screenId`, `from`, `to`, `limit`, `cursor`

---

## 10. Reporting APIs

---

#### `GET /api/v1/reports/campaigns/:id`

- **用途：** 取得廣告主的 Campaign 成效報表
- **使用模組：** Advertiser Reporting Dashboard

**Query Parameters：** `dateRange=last_7_days|last_30_days|this_month|all_time`

**Response `200`：**

```json
{
  "campaignId": "uuid-campaign",
  "campaignName": "2026 Summer Campaign",
  "advertiserName": "Brand X",
  "status": "live",
  "summary": {
    "totalPlays": 12450,
    "completedPlays": 11890,
    "estimatedImpressions": 8500000,
    "budgetSpent": 45000,
    "totalBudget": 105000,
    "avgCpm": 5.29,
    "fillRate": 0.96
  }
}
```

---

#### `GET /api/v1/reports/campaigns/:id/daily`

- **用途：** 每日趨勢資料（折線圖 / 柱狀圖用）

**Response `200`：**

```json
{
  "data": [
    {
      "date": "2026-05-07",
      "plays": 1780,
      "estimatedImpressions": 1200000,
      "budgetSpent": 6000,
      "programmaticPlays": 420,
      "fillRate": 0.94
    }
  ]
}
```

---

#### `GET /api/v1/reports/campaigns/:id/by-location`

- **用途：** 各刊播地點成效分解

---

#### `GET /api/v1/reports/campaigns/:id/by-creative`

- **用途：** 各素材成效分解（完播率）

---

#### `GET /api/v1/reports/campaigns/:id/pop-logs`

- **用途：** 原始 PoP log 列表

**Query Parameters：** `from`, `to`, `playbackType`, `cursor`

---

## 11. Notification APIs

---

#### `GET /api/v1/notifications`

- **用途：** 取得當前使用者的通知列表

**Query Parameters：** `isRead=false`, `cursor`

**Response `200`：**

```json
{
  "data": [
    {
      "id": "uuid-notif",
      "type": "campaign_approved",
      "title": "廣告活動已核准",
      "body": "您的廣告活動「2026 Summer Campaign」已通過審核，即將開始刊播。",
      "link": "/campaigns/uuid-campaign",
      "isRead": false,
      "createdAt": "2026-05-13T10:05:00Z"
    }
  ],
  "unreadCount": 3
}
```

---

#### `PATCH /api/v1/notifications/:id/read`

- **用途：** 標記單一通知為已讀
- **Response：** `204 No Content`

---

#### `PATCH /api/v1/notifications/read-all`

- **用途：** 全部標為已讀
- **Response：** `204 No Content`

---

## 12. Audit Log APIs

---

#### `GET /api/v1/admin/audit-logs`

- **用途：** 查詢系統操作歷史（僅 super_admin）

**Query Parameters：** `resourceType`, `resourceId`, `actorUserId`, `from`, `to`, `cursor`

**Response `200`：**

```json
{
  "data": [
    {
      "id": "uuid-log",
      "actor": { "id": "uuid-user", "fullName": "Jack Ni" },
      "action": "campaign.approved",
      "resourceType": "campaign",
      "resourceId": "uuid-campaign",
      "oldValue": { "status": "pending_review" },
      "newValue": { "status": "approved" },
      "createdAt": "2026-05-13T10:05:00Z"
    }
  ]
}
```

---

## 13. 統一錯誤回應格式

所有 API 的錯誤回應統一格式：

```json
{
  "error": {
    "code": "CAMPAIGN_NOT_EDITABLE",
    "message": "This campaign cannot be edited because it is currently under review.",
    "details": {
      "currentStatus": "pending_review",
      "allowedStatuses": ["draft", "rejected"]
    },
    "requestId": "req-uuid-xxx"
  }
}
```

| 欄位 | 說明 |
|------|------|
| `code` | 機器可讀的錯誤識別碼（SCREAMING_SNAKE_CASE） |
| `message` | 人類可讀的錯誤說明 |
| `details` | 額外除錯資訊（選用） |
| `requestId` | 每個請求的唯一 ID，方便 Log 追蹤 |

**常見錯誤碼列表：**

```
UNAUTHORIZED              → 未登入
FORBIDDEN                 → 無權限
RESOURCE_NOT_FOUND        → 找不到資源
VALIDATION_ERROR          → 請求欄位格式錯誤
DUPLICATE_ENTRY           → 重複資料
CAMPAIGN_NOT_EDITABLE     → Campaign 狀態不允許編輯
INVALID_STATUS_TRANSITION → 不合法的狀態轉換
BUDGET_LIMIT_EXCEEDED     → 預算超出限制
CREATIVE_NOT_APPROVED     → 素材未通過審核
BID_TIMEOUT               → Programmatic 競標超時
INVENTORY_NOT_AVAILABLE   → 版位已售罄或不可用
```

---

## 14. 認證與授權假設

### 14.1 認證方式

所有 API 呼叫需帶上 Bearer Token：

```
Authorization: Bearer <supabase-jwt-token>
```

- 使用者登入後 Supabase Auth 發放 JWT
- JWT 包含 `userId`、`role`、`advertiserId` 等 claims
- Token 有效期 1 小時，可用 Refresh Token 續期

### 14.2 角色與權限

| 角色 | 可存取的 API |
|------|------------|
| `super_admin` | 所有 API，包含 `/admin/*` |
| `advertiser_user` | 自己廣告主的 Campaign、Creative、Notification；公開 Inventory |
| `player` | Player Runtime APIs（使用 Screen API Key，非 JWT） |

### 14.3 Player 認證

Player 使用固定的 **Screen API Key**（非使用者 JWT），在 Header 傳入：

```
X-Screen-Key: sk_screen_SCR1000_xxxxx
```

由 Admin 管理，每台螢幕有獨立的 API Key，方便獨立撤銷。

### 14.4 Rate Limiting

| API 類型 | 限制 |
|---------|------|
| 一般 API | 300 requests / minute / user |
| Player Heartbeat | 12 requests / minute / screen（每 5 秒一次） |
| PoP Log | 600 requests / minute / screen |
| Programmatic Opportunity | 600 requests / minute / screen |

---

## 15. MVP APIs vs Production APIs

### MVP 必要（最小可跑版本）

```
GET    /api/v1/inventory                    ✅ 已有 Supabase 資料
GET    /api/v1/inventory/:id
POST   /api/v1/campaigns
GET    /api/v1/campaigns/:id
PATCH  /api/v1/campaigns/:id
POST   /api/v1/campaigns/:id/submit
POST   /api/v1/campaigns/:id/inventory-items
DELETE /api/v1/campaigns/:id/inventory-items/:id
PATCH  /api/v1/campaigns/:id/inventory-items/:id
POST   /api/v1/media-assets/upload-url
POST   /api/v1/campaigns/:id/creative-assets
GET    /api/v1/admin/campaigns
PATCH  /api/v1/admin/campaigns/:id/status
GET    /api/v1/admin/creative-review
POST   /api/v1/admin/creative-assets/:id/approve
POST   /api/v1/admin/creative-assets/:id/reject
GET    /api/v1/player/:screenCode/playlist
POST   /api/v1/player/:screenCode/heartbeat
POST   /api/v1/pop/logs
GET    /api/v1/reports/campaigns/:id
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
```

### 後期加入

```
POST   /api/v1/programmatic/opportunity     ← Programmatic 上線後
GET    /api/v1/reports/campaigns/:id/daily  ← Reporting 強化後
POST   /api/v1/creative-assets/:id/eligibility-check
GET    /api/v1/admin/audit-logs
Loop / Slot Management APIs
```

---

## 16. Open Questions

1. **BFF vs 直打 Supabase？** 目前前端直打 Supabase Client SDK（如已做的 inventory fetch）還是全部透過自建的 API Server？→ Supabase 有 Edge Functions 可當輕量 BFF，適合 MVP。
2. **PoP Log 寫入效能：** 每次播出直接寫 DB 還是先寫 Queue（如 Supabase Realtime / SQS）再 batch insert？
3. **Programmatic 競標 SLA：** 300ms 的超時是否合理？業界有些場景要求 100ms。
4. **Report 計算：** `campaign_reports` 的每日彙整由誰觸發？Supabase Database Function + pg_cron，還是外部 Cron Job？
5. **通知推播：** 只存 DB 讓前端輪詢（polling）？還是要接 Supabase Realtime 做真正的即時推播？
6. **Player API Key 管理：** 由 Admin 手動發放？還是螢幕首次上線時自動申請？
7. **檔案上傳：** 直傳 Supabase Storage（推薦）還是先傳到 API Server 再轉傳？
8. **跨廣告主資料隔離：** advertiser_user 如何確保只能看到自己的 campaigns？ → Supabase RLS。
9. **API Gateway：** 用 Supabase Edge Functions 還是另架 API Gateway（如 Kong）？
10. **版本策略：** `/v1` 多久後需要 `/v2`？是否要維護多版本？

---

## 17. 建議實作順序

```
Phase 1：讀取版位（已完成）
  GET /api/v1/inventory → 直打 Supabase

Phase 2：Campaign CRUD
  POST/GET/PATCH /api/v1/campaigns
  POST /api/v1/campaigns/:id/inventory-items
  POST /api/v1/campaigns/:id/submit

Phase 3：素材上傳
  POST /api/v1/media-assets/upload-url（Supabase Storage）
  POST /api/v1/campaigns/:id/creative-assets

Phase 4：Admin 審查
  GET/PATCH /api/v1/admin/campaigns/:id/status
  GET /api/v1/admin/creative-review
  POST /api/v1/admin/creative-assets/:id/approve|reject

Phase 5：Player 播出
  GET /api/v1/player/:screenCode/playlist
  POST /api/v1/player/:screenCode/heartbeat
  POST /api/v1/pop/logs

Phase 6：Reporting
  GET /api/v1/reports/campaigns/:id

Phase 7：Programmatic（後期）
  POST /api/v1/programmatic/opportunity
  Eligibility checks
  Pacing enforcement
```

---

*文件結束。Step 15 API Contract 設計完整涵蓋 Advertiser、Admin、Player、Programmatic、Reporting 等所有模組的端點定義。*
