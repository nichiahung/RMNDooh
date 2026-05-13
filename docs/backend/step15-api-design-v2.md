# Step 15: DOOH Platform — API Contract & Backend Service Architecture v2.0

**版本：** v2.0（整合 Booking / Creative Approval / Launch Readiness 三狀態模型）
**日期：** 2026-05-13
**前置文件：** Step 14 Schema、booking-creative-approval-model.md

> 不含實作代碼。不連接 Supabase。不整合真實 OpenRTB / SSP / DSP。
> 專注於 API 合約、產品邏輯、服務職責與上線準備。

---

## 給 PM 的基礎說明

**什麼是 API？**
API 是前端（介面）和後端（資料庫＋邏輯）之間的合約。
`GET /campaigns/123` = 「我要讀取 ID 為 123 的廣告活動資料」
`POST /campaigns/123/submit-for-review` = 「我要把這個活動送去審核」

**三個核心狀態（不要混在一起）：**

```
booking_status    → 版位有沒有被預訂？
creative_status   → 素材有沒有通過審核？
launch_readiness  → 系統判斷：現在可以播出嗎？
```

---

## 1. API 設計原則

### 版本控制
```
https://api.dooh.io/v1/campaigns
```
所有路徑加 `/v1/` — 未來推 v2 不影響現有整合。

### HTTP 方法語意

| 方法 | 用途 | 例子 |
|------|------|------|
| `GET` | 讀取 | 查看 Campaign 資料 |
| `POST` | 建立 | 建立新 Campaign |
| `PATCH` | 部分更新 | 改 Campaign 名稱 |
| `PUT` | 完整取代 | 取代整份播放清單 |
| `DELETE` | 刪除 | 移除版位 |

### HTTP 狀態碼

| 狀態碼 | 情境 |
|--------|------|
| `200 OK` | 讀取成功 |
| `201 Created` | 建立成功 |
| `204 No Content` | 刪除或操作成功，無回傳 |
| `400 Bad Request` | 格式錯誤 |
| `401 Unauthorized` | 未登入 |
| `403 Forbidden` | 無權限 |
| `404 Not Found` | 資源不存在 |
| `409 Conflict` | 重複資料或狀態衝突 |
| `422 Unprocessable` | 格式對但業務邏輯不通過 |
| `500 Server Error` | 伺服器錯誤 |

### 統一錯誤格式

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
    "requestId": "req-uuid-yyy"
  }
}
```

**常用錯誤碼：**
```
INVALID_BOOKING_STATUS     → 狀態不允許此操作
CREATIVE_NOT_APPROVED      → 素材未審核通過
LAUNCH_BLOCKED_BY_CREATIVE → 因素材問題阻擋上線
LAUNCH_BLOCKED_BY_PAYMENT  → 因付款問題阻擋上線
INVENTORY_CONFLICT         → 版位時段已被佔用
CAMPAIGN_ALREADY_LIVE      → Campaign 已在播出中
CREATIVE_EXPIRED           → 素材已過期，需重新送審
CREATIVE_REVOKED           → 素材已被撤銷
```

---

## 2. 服務邊界總覽

```
┌──────────────────────────────────────────────────────────────┐
│                        客戶端                                 │
│   Advertiser Web App   Admin Dashboard   Web Player          │
└──────────┬─────────────────┬────────────────┬────────────────┘
           │                 │                │
           ▼                 ▼                ▼
┌──────────────────────────────────────────────────────────────┐
│                   API Gateway / BFF Layer                     │
│           Auth check · Rate limit · Request routing           │
└──┬────────────────┬──────────────────────┬───────────────────┘
   │                │                      │
   ▼                ▼                      ▼
┌────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│ Advertiser │ │   Admin / CMS    │ │   Player Runtime     │
│  Service   │ │    Service       │ │      Service         │
│            │ │                  │ │                      │
│ · Campaign │ │ · Booking confirm│ │ · Bootstrap config   │
│ · Inventory│ │ · Creative review│ │ · Active loop fetch  │
│ · Creative │ │ · Screen mgmt    │ │ · Heartbeat          │
│   upload   │ │ · Launch control │ │ · PoP logging        │
│ · Booking  │ │ · Audit logs     │ │ · Programmatic trigger│
│   submit   │ └──────────────────┘ └────────────┬─────────┘
│ · Launch   │                                    │
│   readiness│                       ┌────────────┘
└────────────┘                       ▼
                          ┌────────────────────────┐
                          │  Programmatic Engine   │
                          │  · SSP connector       │
                          │  · Bid timeout 300ms   │
                          │  · Eligibility check   │
                          │  · Pacing enforcement  │
                          └────────────────────────┘
```

---

## 3. 狀態定義

### Booking Status（訂單狀態）

| 值 | 說明 |
|----|------|
| `draft` | 廣告主規劃中，尚未送出 |
| `pending_creative` | 送出但素材尚未上傳 |
| `pending_review` | 等待 Admin 審核素材和訂單 |
| `pending_confirmation` | 素材已審核，等 Admin 確認訂單 |
| `confirmed` | 版位已確認預訂 |
| `scheduled` | 已排程，等待播出日期到來 |
| `live` | 播出中 |
| `completed` | 刊播完成 |
| `cancelled` | 取消 |
| `blocked` | 因素材或其他問題暫時封鎖 |

### Creative Approval Status（素材審核狀態，`creative_assets` 表）

| 值 | 說明 |
|----|------|
| `not_submitted` | 尚未上傳素材 |
| `submitted` | 已上傳，等待技術檢查 |
| `technical_check_passed` | 格式/大小符合規格 |
| `pending_media_owner_review` | 等待媒體主人工審核 |
| `approved` | 通過審核，可以播出 |
| `approved_with_restrictions` | 有條件通過（如限特定時段） |
| `rejected` | 退回，需要替換素材 |
| `expired` | 有效期到期，需重新送審 |
| `revoked` | 已撤銷（如廣告主違規） |

### Launch Readiness Status（上線準備，系統計算）

| 值 | 說明 |
|----|------|
| `not_ready` | 條件未齊備 |
| `ready_for_confirmation` | 素材通過，等訂單確認 |
| `ready_for_scheduling` | 訂單確認，可以排程 |
| `ready_for_launch` | 所有條件滿足，播出日到即上線 |
| `blocked_by_creative` | 因素材被退回或過期 |
| `blocked_by_inventory` | 因版位衝突或不可用 |
| `blocked_by_payment` | 因付款問題（未來功能） |
| `blocked_by_policy` | 因平台政策（如廣告主違規） |

---

## 4. Advertiser Marketplace APIs

### `GET /v1/inventory-locations`

**用途：** 列出可投放版位（支援篩選、搜尋、排序）
**使用者：** 廣告主 / Advertiser Web App

**Query Parameters：**

| 參數 | 說明 |
|------|------|
| `city` | 城市 |
| `district` | 行政區 |
| `venueType` | 場域類型 |
| `screenType` | 版面類型 |
| `minBudget` | 每日最低費 |
| `maxBudget` | 每日最高費 |
| `minImpressions` | 最低每日觸及 |
| `q` | 搜尋關鍵字 |
| `sort` | `impressions_desc` / `price_asc` 等 |
| `cursor` / `limit` | 分頁 |

**Response `200`：**
```json
{
  "data": [{
    "id": "uuid-loc",
    "name": "Taipei 101 Mega Screen",
    "city": "Taipei",
    "district": "Xinyi",
    "venueType": "Mall",
    "screenType": "Mega Screen",
    "dailyImpressions": 850000,
    "cpm": 17.65,
    "pricePerDay": 15000,
    "availability": 0.8,
    "audienceTags": ["Tourists", "Shoppers"],
    "imageUrl": "https://cdn.dooh.io/images/tpe_101.jpg"
  }],
  "pagination": { "cursor": "abc", "hasMore": false }
}
```

**MVP：** 直查 Supabase，無快取
**Production：** Redis 快取 5 分鐘；Full-text search；地理篩選（PostGIS）

---

### `GET /v1/inventory-locations/:id`

**用途：** 單一版位詳情
**Response：** 同上，加上 `operatingHours`、`minimumBookingDays`、`screenCount`

---

## 5. Campaign / Media Plan APIs

### `POST /v1/campaigns`

**用途：** 建立廣告活動（初始狀態 draft）
**角色：** 廣告主

**Request：**
```json
{
  "name": "2026 Summer Campaign",
  "objective": "awareness",
  "buyingType": "self_service"
}
```

**Response `201`：**
```json
{
  "id": "uuid-campaign",
  "name": "2026 Summer Campaign",
  "bookingStatus": "draft",
  "creativeStatus": "not_submitted",
  "launchReadiness": "not_ready",
  "buyingType": "self_service",
  "createdAt": "2026-05-13T10:00:00Z"
}
```

---

### `GET /v1/campaigns/:id`

**用途：** 讀取 Campaign 詳情（含三個狀態、版位、素材）

**Response `200`：**
```json
{
  "id": "uuid-campaign",
  "name": "2026 Summer Campaign",
  "bookingStatus": "pending_review",
  "creativeStatus": "pending_media_owner_review",
  "launchReadiness": "not_ready",
  "inventoryItems": [
    {
      "id": "uuid-item",
      "inventoryLocation": { "name": "Taipei 101...", "district": "Xinyi" },
      "days": 7,
      "pricePerDay": 15000,
      "totalPrice": 105000
    }
  ],
  "creativeAssets": [
    {
      "id": "uuid-creative",
      "name": "summer_banner.jpg",
      "approvalStatus": "pending_media_owner_review",
      "technicalCheck": "passed"
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

### `PATCH /v1/campaigns/:id`

**用途：** 更新 Campaign 基本設定（名稱、日期）
**狀態限制：** 只有 `bookingStatus = draft` 或 `blocked` 才可修改
**Error：** `422 INVALID_BOOKING_STATUS` 若嘗試修改已確認的 Campaign

---

### `POST /v1/campaigns/:id/inventory-items`

**用途：** 加入版位到 Media Plan

**Request：**
```json
{ "inventoryLocationId": "uuid-loc", "days": 7 }
```

**Validations：**
- `days` ≥ 版位的 `minimumBookingDays`
- 同一版位不能重複加入（`409`）
- Campaign 必須是 `draft` 狀態

---

### `DELETE /v1/campaigns/:id/inventory-items/:itemId`

**用途：** 從 Media Plan 移除版位
**Response：** `204 No Content`
**狀態限制：** bookingStatus 必須是 `draft`

---

## 6. Creative Upload APIs

### `POST /v1/creative-assets`

**用途：** 上傳廣告素材（上傳後初始狀態為 `submitted`，系統觸發技術檢查）

**Request（multipart/form-data）：**
```
file: [binary]
campaignId: uuid-campaign
name: "Summer Banner"
```

**Response `201`：**
```json
{
  "id": "uuid-creative",
  "name": "Summer Banner",
  "approvalStatus": "submitted",
  "technicalCheck": "pending",
  "previewUrl": "blob://...",
  "fileType": "image",
  "fileSizeMb": 2.3,
  "uploadedAt": "2026-05-13T10:05:00Z"
}
```

**系統副作用（異步）：**
1. 格式/大小檢查 → `approvalStatus` 更新為 `technical_check_passed` 或 `rejected`
2. 通過技術檢查後 → `approvalStatus = pending_media_owner_review`
3. 更新 Campaign 的 `creativeStatus`

**Validations：**
- 支援格式：`image/jpeg`, `image/png`, `video/mp4`
- 最大 100MB
- 影片不超過 30 秒

**MVP：** 跳過技術檢查，直接設為 `pending_media_owner_review`
**Production：** 接入自動化檢查（解析度、比例、檔案完整性）

---

### `GET /v1/creative-assets/:id`

**用途：** 查詢單一素材的審核狀態

**Response：**
```json
{
  "id": "uuid-creative",
  "name": "Summer Banner",
  "approvalStatus": "pending_media_owner_review",
  "technicalCheck": "passed",
  "rejectionReason": null,
  "restrictions": null,
  "expiresAt": null
}
```

---

### `PATCH /v1/creative-assets/:id`

**用途：** 更新素材名稱（不能更換檔案內容，需重新上傳）
**Validations：** `approvalStatus` 必須是 `submitted` 或 `rejected`

---

### `DELETE /v1/creative-assets/:id`

**用途：** 廣告主移除素材
**Response：** `204`
**限制：** `approved` 或 `approved_with_restrictions` 的素材不能刪除（需先 revoke）

---

## 7. Creative Approval APIs

### `GET /v1/creative-approvals/queue`

**用途：** Admin 查看所有待審核的廣告素材佇列
**角色：** `super_admin` / 媒體主審核人員

**Query Parameters：** `status=pending_media_owner_review`, `advertiserId`, `cursor`

**Response `200`：**
```json
{
  "data": [{
    "creativeId": "uuid-creative",
    "name": "Summer Banner",
    "approvalStatus": "pending_media_owner_review",
    "campaign": { "id": "uuid-campaign", "name": "2026 Summer Campaign" },
    "advertiser": { "name": "Brand X" },
    "fileType": "image",
    "fileSizeMb": 2.3,
    "previewUrl": "https://cdn.dooh.io/...",
    "submittedAt": "2026-05-13T09:00:00Z"
  }],
  "totalPending": 3
}
```

---

### `POST /v1/creative-approvals/:creativeId/review`

**用途：** Admin 審核素材（核准 / 退回 / 有條件核准）
**角色：** `super_admin`

**Request：**
```json
{
  "decision": "approved",
  "notes": "Compliant with all standards.",
  "restrictions": null,
  "expiresAt": "2026-12-31T00:00:00Z"
}
```

核准有限制的範例：
```json
{
  "decision": "approved_with_restrictions",
  "restrictions": {
    "allowedHours": "18:00-23:00",
    "reason": "Alcohol product — restricted to evening slots only"
  }
}
```

退回範例：
```json
{
  "decision": "rejected",
  "rejectionReason": "Video exceeds 30-second maximum. Please re-edit to 30s or below."
}
```

**系統副作用：**
- 更新 `creative_assets.approval_status`
- 重新計算 Campaign 的 `creativeStatus` 和 `launchReadiness`
- 觸發異步 `creative_eligibility_checks`（逐螢幕）
- 發送通知給廣告主

**Validations：**
- `decision` 只能是 `approved`, `approved_with_restrictions`, `rejected`
- `rejected` 必須附上 `rejectionReason`

---

### `GET /v1/creative-assets/:creativeId/eligibility`

**用途：** 查詢特定素材在各螢幕的播出資格結果

**Response：**
```json
{
  "creativeId": "uuid-creative",
  "overallEligible": false,
  "checks": [
    {
      "screenId": "uuid-screen",
      "screenName": "Taipei 101 Display A",
      "isEligible": true,
      "checkedAt": "2026-05-13T10:10:00Z"
    },
    {
      "screenId": "uuid-screen-2",
      "screenName": "Songshan Airport Gate B",
      "isEligible": false,
      "failureReasons": ["content_rating: screen requires 'general', creative rated 'pg13'"]
    }
  ]
}
```

---

### `POST /v1/creative-assets/:creativeId/eligibility-check`

**用途：** 手動觸發（或重新觸發）特定素材的資格檢查
**Response `202`：** `{ "jobId": "uuid-job", "status": "queued" }`

---

## 8. Booking / Insertion Order APIs

### `POST /v1/campaigns/:id/submit-for-review`

**用途：** 廣告主正式送出 Campaign，進入審核流程
**角色：** 廣告主

**Validations：**
- 至少 1 個 inventory item
- 至少 1 支 creative asset（`approvalStatus ≠ rejected`）
- `bookingStatus` 必須是 `draft`

**系統副作用：**
- `bookingStatus` → `pending_review`（自助）/ 若無素材 → `pending_creative`
- `creativeStatus` → `pending_media_owner_review`
- `launchReadiness` → `not_ready`
- 觸發通知給 Admin

**Response `200`：**
```json
{
  "campaignId": "uuid-campaign",
  "bookingStatus": "pending_review",
  "creativeStatus": "pending_media_owner_review",
  "launchReadiness": "not_ready",
  "submittedAt": "2026-05-13T12:00:00Z",
  "message": "Your campaign has been submitted for review."
}
```

**Error Cases：**
- `422 MISSING_INVENTORY` 沒有版位
- `422 MISSING_CREATIVE` 沒有可用素材
- `422 INVALID_BOOKING_STATUS` 狀態不允許

---

### `POST /v1/campaigns/:id/confirm-booking`

**用途：** Admin 確認訂單（版位預留）
**角色：** `super_admin`

**Validations：**
- `bookingStatus` 必須是 `pending_confirmation`
- 自助模式：`creativeStatus` 必須有至少一個 `approved`
- 直銷模式：可繞過素材審核直接確認（Admin 特權）

**Request：**
```json
{
  "notes": "Insertion order #IO-2026-001 confirmed.",
  "bypassCreativeCheck": false
}
```

**系統副作用：**
- `bookingStatus` → `confirmed`
- 若 `creativeStatus = approved` → `launchReadiness = ready_for_scheduling`
- 版位在 `inventory_locations.availability` 標記為已預訂
- 通知廣告主

---

### `GET /v1/campaigns/:id/booking`

**用途：** 查詢 Campaign 的完整訂單狀態

**Response：**
```json
{
  "campaignId": "uuid-campaign",
  "bookingStatus": "confirmed",
  "creativeStatus": "approved",
  "launchReadiness": "ready_for_scheduling",
  "confirmedAt": "2026-05-13T14:00:00Z",
  "confirmedBy": { "id": "uuid-admin", "name": "DOOH Admin" },
  "startDate": "2026-06-01",
  "endDate": "2026-06-15",
  "inventoryCount": 3,
  "totalBudget": 378000
}
```

---

### `PATCH /v1/campaigns/:id/booking`

**用途：** Admin 更新訂單細節（日期、備注）
**角色：** `super_admin`
**限制：** `bookingStatus` 不能是 `live` 或 `completed`

---

### `POST /v1/campaigns/:id/cancel-booking`

**用途：** 取消訂單（廣告主或 Admin 皆可）

**Request：** `{ "reason": "Budget reallocation" }`

**系統副作用：**
- `bookingStatus` → `cancelled`
- `launchReadiness` → `not_ready`
- 釋放版位預訂
- 若已在播出中（`live`）→ 立刻停止播放

---

## 9. Launch Readiness APIs

### `GET /v1/campaigns/:id/launch-readiness`

**用途：** 查詢目前的上線準備狀態及阻擋原因
**角色：** 廣告主 / Admin

**Response `200`：**
```json
{
  "campaignId": "uuid-campaign",
  "launchReadiness": "blocked_by_creative",
  "bookingStatus": "confirmed",
  "creativeStatus": "rejected",
  "blockers": [
    {
      "type": "blocked_by_creative",
      "message": "All creative assets have been rejected. Please upload replacement creatives.",
      "affectedCreatives": ["uuid-creative-1"]
    }
  ],
  "requirements": {
    "bookingConfirmed": true,
    "creativeApproved": false,
    "startDateValid": true,
    "paymentCleared": null
  },
  "nextAction": "Upload and resubmit approved creative to proceed."
}
```

---

### `POST /v1/campaigns/:id/launch-readiness/check`

**用途：** 強制重新計算 launch_readiness（通常由系統觸發，也可手動）
**Response `200`：** 最新的 launch readiness 狀態

---

### `POST /v1/campaigns/:id/schedule`

**用途：** 排程 Campaign（設定具體播出時段）
**前提：** `launchReadiness = ready_for_scheduling`

**Request：**
```json
{
  "startDate": "2026-06-01",
  "endDate": "2026-06-15",
  "timeSlots": "all_day"
}
```

**系統副作用：**
- `bookingStatus` → `scheduled`
- `launchReadiness` → `ready_for_launch`
- 建立 `playlists` + `playlist_items`

**Error：** `422 LAUNCH_BLOCKED_BY_CREATIVE` 若 creativeStatus ≠ approved

---

## 10. Admin / CMS APIs

### `GET /v1/admin/campaigns`

**用途：** 列出所有廣告主的 Campaign（支援三狀態篩選）
**角色：** `super_admin`

**Query Parameters：** `bookingStatus`, `creativeStatus`, `launchReadiness`, `advertiserId`, `cursor`

**Response：** Campaign 列表，含三個狀態 + 廣告主名稱

---

### `GET /v1/admin/campaigns/:id`

**用途：** 完整 Campaign 詳情（含所有子資料）
**Response：** 同 `GET /campaigns/:id` 但包含 Admin 操作記錄和版位實際預留狀況

---

### `PATCH /v1/admin/campaigns/:id/status`

**用途：** Admin 更新 Campaign 的 booking_status
**角色：** `super_admin`

**Request：**
```json
{
  "bookingStatus": "confirmed",
  "notes": "Insertion order #IO-2026-001 approved."
}
```

**允許的狀態轉換（Admin 才能做）：**
```
pending_review → pending_confirmation （素材已審核）
pending_confirmation → confirmed
confirmed → blocked
blocked → confirmed （問題解決後）
live → blocked （緊急停播）
```

---

### `GET /v1/admin/inventory-locations`

**用途：** 管理所有版位（含非公開的）
**Response：** 同廣告主版，加上 `bookingCount`（目前預訂數）、`isPublished` 等

---

### `POST /v1/admin/inventory-locations`

**用途：** 新增版位

**Request：** 完整的版位欄位（名稱、座標、定價、曝光數等）

---

### `PATCH /v1/admin/inventory-locations/:id`

**用途：** 更新版位（定價、可用性、上下架）

---

### `GET /v1/admin/screens`

**用途：** 列出所有播出裝置及狀態

**Response：**
```json
{
  "data": [{
    "screenId": "SCR-1000",
    "screenName": "Taipei 101 Display A",
    "status": "online",
    "lastHeartbeatAt": "2026-05-13T10:29:45Z",
    "currentCampaignId": "uuid-campaign",
    "location": { "name": "Taipei 101", "district": "Xinyi" }
  }]
}
```

---

### `POST /v1/admin/screens`

**用途：** 新增播出裝置

---

### `PATCH /v1/admin/screens/:id`

**用途：** 更新裝置設定（loop template、programmatic 開關、fallback 素材）

---

## 11. Loop / Slot Management APIs

### `GET /v1/loop-templates`

**用途：** 列出所有 Loop 模板
**角色：** Admin

---

### `POST /v1/loop-templates`

**用途：** 建立新 Loop 模板

**Request：**
```json
{
  "name": "5-min Standard Loop",
  "loopDurationSec": 300,
  "totalSlots": 30,
  "defaultSlotDurationSec": 10
}
```

---

### `GET /v1/loop-templates/:id`

**用途：** 讀取 Loop 模板詳情（含所有 Slot）

---

### `PATCH /v1/loop-templates/:id`

**用途：** 更新 Loop 模板名稱或設定
**限制：** 已在使用中的 Loop 不能縮減 Slot 數量

---

### `DELETE /v1/loop-templates/:id`

**用途：** 刪除 Loop 模板
**限制：** 有螢幕正在使用的 Loop 不能刪除（`409 LOOP_IN_USE`）

---

### `GET /v1/loop-templates/:id/slots`

**用途：** 列出 Loop 的所有 Slot 定義

**Response：**
```json
{
  "data": [
    { "position": 1, "slotType": "direct_sold", "durationSec": 10 },
    { "position": 2, "slotType": "house_content", "durationSec": 10 },
    { "position": 3, "slotType": "programmatic", "floorPriceCpm": 25.00, "isPremium": true }
  ]
}
```

---

### `POST /v1/loop-templates/:id/slots`

**用途：** 批次設定 Slot（一次送出整個 loop 的 slot 配置）

**Request：**
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

### `PATCH /v1/loop-slots/:slotId`

**用途：** 更新單一 Slot 設定（底價、類型）

---

### `DELETE /v1/loop-slots/:slotId`

**用途：** 刪除 Slot（後面的 Slot 自動往前補位）

---

## 12. Player Runtime APIs

### `GET /v1/player/:screenId/bootstrap`

**用途：** Player 啟動時取得初始設定
**角色：** Player 裝置（使用 Screen API Key 認證）

**Response `200`：**
```json
{
  "screenId": "SCR-1000",
  "screenName": "Taipei 101 Display A",
  "loopTemplate": {
    "loopDurationSec": 300,
    "slots": [
      { "position": 1, "slotType": "direct_sold", "durationSec": 10 },
      { "position": 3, "slotType": "programmatic", "durationSec": 10, "floorPriceCpm": 25 }
    ]
  },
  "programmaticEnabled": true,
  "defaultFallbackUrl": "https://cdn.dooh.io/fallback/default.mp4"
}
```

---

### `GET /v1/player/:screenId/active-loop`

**用途：** 取得目前有效的播放清單（Player 定期 sync）

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
        "playUrl": "https://cdn.dooh.io/creative/summer_banner.mp4",
        "approvalStatus": "approved"
      }
    },
    {
      "position": 3,
      "slotType": "programmatic",
      "durationSec": 10,
      "programmaticSlotId": "uuid-prog-slot"
    }
  ]
}
```

**重要：** Player 播出前必須確認 `approvalStatus = approved`，否則改播 Fallback

---

### `POST /v1/player/:screenId/heartbeat`

**用途：** Player 每 10 秒回報一次存活狀態

**Request：**
```json
{
  "status": "online",
  "currentPlaylistId": "uuid-playlist",
  "currentPosition": 5,
  "timestamp": "2026-05-13T10:30:00Z"
}
```

**Response `200`：** `{ "ok": true }`

---

## 13. Programmatic Ad Decision APIs

### `POST /v1/ad-opportunities`

**用途：** Player 即將播出 Programmatic Slot 時，建立競標機會並向 SSP 發送請求
**角色：** Player 裝置
**SLA：** 必須在 300ms 內回應

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

**Response `200`（得標）：**
```json
{
  "opportunityId": "uuid-opp",
  "status": "won",
  "creative": {
    "playUrl": "https://cdn.dsp.example/ad.mp4",
    "durationSec": 10,
    "isEligible": true,
    "approvalStatus": "approved"
  },
  "winningBidCpm": 32.50
}
```

**Response `200`（未得標 / 超時 / 素材未審核）：**
```json
{
  "opportunityId": "uuid-opp",
  "status": "fallback",
  "fallbackReason": "unapproved_creative",
  "fallback": {
    "playUrl": "https://cdn.dooh.io/fallback/default.mp4"
  }
}
```

**Fallback 觸發條件：**
- `no_bid` — 無人出價
- `timeout` — 超過 300ms
- `unapproved_creative` — 素材未通過審核
- `ineligible_creative` — 素材在此螢幕不符資格
- `pacing_limit` — 超出頻率或預算上限
- `ssp_error` — SSP 回應錯誤

**MVP：** 回傳 mock decision，不真正呼叫 SSP
**Production：** 呼叫 SSP OpenRTB endpoint，驗證 eligibility，執行 pacing

---

### `POST /v1/ad-decisions/request`

**用途：** 主動請求廣告決策（不透過 opportunity 流程）
**用途場景：** 批量預排、測試

---

### `GET /v1/ad-decisions/:id`

**用途：** 查詢特定競標決策詳情（除錯用）

---

## 14. Proof-of-Play APIs

### `POST /v1/proof-of-play-logs`

**用途：** Player 每次播出後即時回報 PoP 記錄
**設計重點：** 高頻、快速（< 100ms），Player 不等回應繼續播

**Request：**
```json
{
  "screenId": "SCR-1000",
  "campaignId": "uuid-campaign",
  "creativeAssetId": "uuid-creative",
  "playbackType": "direct",
  "playbackStatus": "completed",
  "durationSec": 15,
  "playedAt": "2026-05-13T10:30:15.000Z",
  "loopSlotPosition": 1
}
```

Programmatic 播出需加：
```json
{
  "playbackType": "programmatic",
  "adDecisionId": "uuid-decision",
  "winningBidCpm": 32.50
}
```

Fallback 播出需加：
```json
{
  "playbackType": "fallback",
  "fallbackReason": "unapproved_creative"
}
```

**Response `201`：** `{ "id": "uuid-log", "ok": true }`

---

### `GET /v1/proof-of-play-logs`

**用途：** 查詢 PoP 記錄（管理員 / 報表服務）

**Query Parameters：** `campaignId`, `screenId`, `from`, `to`, `playbackType`, `cursor`

---

### `GET /v1/proof-of-play-logs/:id`

**用途：** 查詢單筆 PoP 記錄詳情

---

## 15. Reporting APIs

### `GET /v1/reports/campaigns/:campaignId`

**用途：** 廣告主查看 Campaign 總體成效
**Response：**
```json
{
  "campaignId": "uuid-campaign",
  "bookingStatus": "live",
  "summary": {
    "totalPlays": 12450,
    "completedPlays": 11890,
    "estimatedImpressions": 8500000,
    "budgetSpent": 45000,
    "avgCpm": 5.29,
    "programmaticFillRate": 0.94
  }
}
```

---

### `GET /v1/reports/campaigns/:campaignId/proof-of-play`

**用途：** 原始 PoP log 列表（廣告主可下載佐證）

---

### `GET /v1/reports/campaigns/:campaignId/delivery`

**用途：** 每日投放趨勢（折線圖資料）

**Response：**
```json
{
  "data": [{
    "date": "2026-05-07",
    "plays": 1780,
    "estimatedImpressions": 1200000,
    "directPlays": 1200,
    "programmaticPlays": 420,
    "fallbackPlays": 160,
    "fillRate": 0.91
  }]
}
```

---

### `GET /v1/reports/programmatic/fill-rate`

**用途：** 媒體主查看 Programmatic 槽位整體 fill rate（依時段、螢幕分析）

---

## 16. Notification APIs

### `GET /v1/notifications`

**用途：** 取得目前使用者的通知

**Response：**
```json
{
  "data": [{
    "id": "uuid-notif",
    "type": "creative_rejected",
    "title": "廣告素材審核未通過",
    "body": "「Summer Banner」未通過審核：影片超過 30 秒上限。請上傳替代素材。",
    "link": "/campaigns/uuid-campaign/creatives",
    "isRead": false,
    "createdAt": "2026-05-13T10:05:00Z"
  }],
  "unreadCount": 2
}
```

**通知類型（`type`）：**
```
creative_submitted         → 廣告主上傳了新素材（通知 Admin）
creative_approved          → 素材通過審核（通知廣告主）
creative_rejected          → 素材退回（通知廣告主）
booking_confirmed          → 訂單確認（通知廣告主）
booking_cancelled          → 訂單取消
campaign_live              → Campaign 開始播出
campaign_blocked           → Campaign 被封鎖
creative_expiring_soon     → 素材即將到期（7 天前提醒）
```

---

### `PATCH /v1/notifications/:id/read`

**用途：** 標記單一通知為已讀
**Response：** `204 No Content`

---

## 17. Audit Log APIs

### `GET /v1/audit-logs`

**用途：** 查詢系統操作歷史（僅 `super_admin`）

**Query Parameters：** `resourceType`, `resourceId`, `actorUserId`, `from`, `to`, `cursor`

**Response：**
```json
{
  "data": [{
    "id": "uuid-log",
    "actor": { "id": "uuid-admin", "name": "Jack Ni" },
    "action": "creative.approved",
    "resourceType": "creative_asset",
    "resourceId": "uuid-creative",
    "oldValue": { "approvalStatus": "pending_media_owner_review" },
    "newValue": { "approvalStatus": "approved" },
    "createdAt": "2026-05-13T10:05:00Z"
  }]
}
```

---

## 18. 認證與授權假設

### Token
所有請求帶 Bearer Token（Supabase JWT）：
```
Authorization: Bearer <jwt>
```

### 角色與 API 權限

| 角色 | 可存取 |
|------|-------|
| `super_admin` | 所有 API，含 `/admin/*`、`/audit-logs` |
| `advertiser_user` | 自己的 campaigns、creative upload、notifications |
| `player` | Player Runtime APIs（使用 Screen API Key，非 JWT） |

### Player 認證
```
X-Screen-Key: sk_screen_SCR1000_xxxxx
```
每台螢幕有獨立 API Key，可由 Admin 獨立撤銷。

---

## 19. API 工作流程範例

### 19.1 自助訂購完整流程

```
1. POST /campaigns
   → { bookingStatus: "draft", creativeStatus: "not_submitted" }

2. POST /campaigns/:id/inventory-items （x N 個版位）

3. POST /creative-assets （上傳檔案）
   → { approvalStatus: "submitted" }
   → 系統異步：approvalStatus → "technical_check_passed" → "pending_media_owner_review"

4. POST /campaigns/:id/submit-for-review
   → { bookingStatus: "pending_review" }
   → Admin 收到通知

5. Admin: POST /creative-approvals/:creativeId/review { decision: "approved" }
   → creativeStatus → "approved"
   → launchReadiness → "ready_for_confirmation"
   → 廣告主收到通知

6. Admin: PATCH /admin/campaigns/:id/status { bookingStatus: "confirmed" }
   → launchReadiness → "ready_for_scheduling"
   → 廣告主收到「版位已確認」通知

7. POST /campaigns/:id/schedule { startDate: ..., endDate: ... }
   → bookingStatus → "scheduled"
   → launchReadiness → "ready_for_launch"
   → 播出日到 → system → bookingStatus = "live"
```

---

### 19.2 直銷訂單流程

```
1. Admin 在後台建立 Campaign
   Admin: POST /admin/campaigns { buyingType: "direct_sold" }
   Admin: PATCH /admin/campaigns/:id/status { bookingStatus: "confirmed" }
   → 版位立刻預留，launchReadiness = "not_ready"（素材未上傳）

2. 通知廣告主上傳素材

3. 廣告主: POST /creative-assets
   → approvalStatus: "pending_media_owner_review"

4. Admin 審核素材: POST /creative-approvals/:creativeId/review
   → approvalStatus: "approved"
   → launchReadiness: "ready_for_scheduling"
   → 廣告主收到通知

5. POST /campaigns/:id/schedule → bookingStatus: "scheduled"
```

---

### 19.3 素材退回與替換流程

```
[廣告主收到通知：素材被退回]

1. GET /campaigns/:id/launch-readiness
   → { launchReadiness: "blocked_by_creative", blockers: [...] }

2. POST /creative-assets （上傳新素材）

3. 舊素材自動排除，新素材進審核佇列
   → creativeStatus: "pending_media_owner_review"

4. Admin 重新審核: POST /creative-approvals/:newCreativeId/review
   → approved → launchReadiness: "ready_for_scheduling"（若 booking 已 confirmed）
   → 廣告主收到通知，Campaign 解除封鎖
```

---

### 19.4 Programmatic 廣告決策流程

```
Player 準備播出 Slot 3（programmatic）:

1. POST /ad-opportunities
   { screenId, programmaticSlotId, floorPriceCpm: 25 }
   → 後端：向 SSP 發送 Bid Request
   → SSP：收到出價 32.50 CPM

2. 後端驗證：
   → creative_eligibility_checks: is_eligible = true
   → creative_assets.approval_status = approved
   → pacing_rules: 未超出限制
   → Response: { status: "won", playUrl: "...", isEligible: true }

3. Player 播出廣告

4. POST /proof-of-play-logs
   { playbackType: "programmatic", adDecisionId, winningBidCpm: 32.50 }

──────────

若素材未審核通過：

1. POST /ad-opportunities
   → 後端：creative 未在 approved 清單
   → Response: { status: "fallback", fallbackReason: "unapproved_creative" }

2. Player 播出 Fallback，同時後端觸發素材審核佇列

3. POST /proof-of-play-logs
   { playbackType: "fallback", fallbackReason: "unapproved_creative" }
```

---

### 19.5 Launch Readiness Check 流程

```
廣告主：GET /campaigns/:id/launch-readiness

Case A — 一切正常：
{
  "launchReadiness": "ready_for_launch",
  "requirements": {
    "bookingConfirmed": true,
    "creativeApproved": true,
    "startDateValid": true
  },
  "nextAction": "Campaign will launch automatically on 2026-06-01."
}

Case B — 素材被退回：
{
  "launchReadiness": "blocked_by_creative",
  "blockers": [{
    "type": "blocked_by_creative",
    "message": "All creative assets rejected. Please upload replacement.",
    "affectedCreatives": ["uuid-creative-1"]
  }],
  "nextAction": "Upload and resubmit approved creative to proceed."
}

Case C — 版位未確認：
{
  "launchReadiness": "ready_for_confirmation",
  "requirements": {
    "bookingConfirmed": false,
    "creativeApproved": true
  },
  "nextAction": "Waiting for admin to confirm the booking."
}
```

---

## 20. MVP APIs vs Production APIs

### Phase 1（MVP — 現在）

```
✅ GET /inventory-locations
✅ POST /campaigns + inventory-items
✅ POST /creative-assets（真實上傳到 Supabase Storage）
✅ POST /campaigns/:id/submit-for-review
✅ GET /creative-approvals/queue
✅ POST /creative-approvals/:id/review（核准 / 退回）
✅ PATCH /admin/campaigns/:id/status（確認訂單）
✅ GET /player/:screenId/active-loop
✅ POST /player/:screenId/heartbeat
✅ POST /proof-of-play-logs
✅ GET /reports/campaigns/:id
✅ GET /notifications
```

### Phase 2（加入 Launch Readiness）

```
GET/POST /campaigns/:id/launch-readiness
POST /campaigns/:id/schedule
GET /creative-assets/:id/eligibility
POST /creative-assets/:id/eligibility-check
```

### Phase 3（Loop / Slot / Programmatic）

```
所有 loop-templates + loop-slots APIs
POST /ad-opportunities（接真實 SSP）
GET /reports/programmatic/fill-rate
```

### Phase 4（完整生產）

```
GET /audit-logs
完整 notifications（含 Email / Push）
GET /ad-decisions/:id（除錯工具）
所有 Admin 螢幕管理 APIs
```

---

## 21. Open Questions

1. **Direct Sold 訂單確認的授權：** Admin 能否在素材未審核前就 `confirm-booking`？如果可以，需要額外的 flag（`bypassCreativeCheck: true`）和稽核記錄。
2. **Programmatic 素材有效期：** 外部 DSP 帶入的素材多久後自動過期？建議 30 天，超過需重新送審。
3. **素材有條件核准（`approved_with_restrictions`）：** 時段限制如何在播放清單層級落地？需要在 `playlists` 加 `allowedHours` 欄位。
4. **Multiple creatives per campaign：** 若有 3 支素材，1 通過 2 退回，`creativeStatus` 要設 `approved` 還是 `partially_approved`？目前設計：有任一通過即為 `approved`（播出那支），但 PM 應確認。
5. **Payment Blocking：** `blocked_by_payment` 何時觸發？需要 billing 模組才能啟用，MVP 先忽略。
6. **Programmatic Creative Approval SLA：** 新素材進審核佇列後，若 24 小時內無人審核，系統是否自動退回？建議設定，但需 PM 決策。
7. **Revoke vs Delete：** 已播出的素材應 revoke 而非 delete（保留歷史紀錄），API 是否需要 `POST /creative-assets/:id/revoke` 端點？
8. **Player API Key Rotation：** 螢幕 API Key 需要定期輪換嗎？需設計自動續期機制。

---

## 22. 建議實作順序

```
Phase 1：核心業務（Supabase Edge Functions）
  GET /inventory-locations                    ← 已完成
  POST /campaigns, inventory-items            ← 已完成
  POST /creative-assets                       ← 已完成
  POST /campaigns/:id/submit-for-review       ← 已完成
  GET /creative-approvals/queue               ← 已完成
  POST /creative-approvals/:id/review         ← 已完成
  PATCH /admin/campaigns/:id/status           ← 已完成

Phase 2：Launch Readiness
  GET /campaigns/:id/launch-readiness
  POST /campaigns/:id/schedule
  GET /creative-assets/:id/eligibility

Phase 3：Player 完整流程
  GET /player/:screenId/bootstrap
  GET /player/:screenId/active-loop           ← 部分完成
  POST /player/:screenId/heartbeat            ← 部分完成
  POST /proof-of-play-logs                    ← 部分完成

Phase 4：Programmatic
  POST /ad-opportunities（先用 mock SSP）
  GET /reports/programmatic/fill-rate

Phase 5：生產強化
  Audit logs, Full notification pipeline,
  Creative expiry automation, Pacing enforcement
```

---

*文件結束。Step 15 v2.0 整合了三狀態模型（booking / creative / launch readiness），涵蓋全部 40+ 個 API 端點，支援自助、直銷、Programmatic 三種業務模式。*
