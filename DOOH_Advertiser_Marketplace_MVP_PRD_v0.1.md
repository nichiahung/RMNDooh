# PRD: DOOH Advertiser Marketplace MVP v0.1

## 1. Product Overview

### Product Name

**DOOH Advertiser Marketplace MVP**

### Product Type

Self-service DOOH advertising marketplace

### One-liner

讓廣告主可以用地圖或清單方式探索可投放的 DOOH 點位，建立 media plan，預估曝光與預算，上傳素材，並送出 campaign 進入審核流程。

### Product Summary

本產品是一個面向廣告主的 DOOH 自助式投放平台。廣告主可以在平台上搜尋、篩選、比較不同數位戶外廣告點位，透過 Map View 或 List View 選擇想投放的 inventory，加入 media plan，查看預估曝光、CPM 與預算，接著上傳廣告素材，最後 review 並送出 campaign。

MVP 版本使用 mock data，不串接真實後端、付款、地圖服務或素材審核系統，重點是驗證完整投放流程與產品體驗。

---

## 2. Problem Statement

傳統 DOOH 廣告購買流程通常依賴業務、媒體代理商或人工報價。廣告主在前期規劃時常遇到以下問題：

1. 不知道有哪些 DOOH 點位可以投放。
2. 難以快速比較不同點位的價格、曝光與地理位置價值。
3. 投放規劃過程不透明，通常需要反覆與業務確認。
4. 無法快速建立初步 media plan。
5. 無法即時看到預估預算與曝光。
6. 素材規格、審核狀態與 campaign submission 流程不夠清楚。

因此，廣告主需要一個更透明、更快速、更自助式的方式來規劃 DOOH campaign。

---

## 3. Target Users

### Primary User

**Advertiser / Marketer**

包含：

- 品牌行銷人員
- 中小企業主
- 廣告代理商 planner
- 零售品牌 marketing team
- 活動推廣人員
- Growth / performance marketing team

### User Goals

使用者希望能夠：

- 快速找到可投放的 DOOH 區域。
- 用地圖或清單方式比較點位。
- 依照地區、場域、螢幕類型、受眾、預算篩選 inventory。
- 看懂每個點位的曝光、CPM 與每日價格。
- 建立 media plan。
- 上傳廣告素材。
- 在送出前 review campaign。
- 將 campaign 送出進入審核流程。

### Secondary Users

MVP v0.1 暫不直接支援，但未來會包含：

- 平台管理員
- 媒體主
- 素材審核人員
- 螢幕營運人員

---

## 4. Goals and Non-goals

### 4.1 Goals

MVP 需要讓廣告主可以完成以下流程：

```text
進入 Campaign Planner
→ 篩選 DOOH inventory
→ 使用 Map View / List View 探索點位
→ 查看 inventory detail
→ 加入 Media Plan
→ 查看預估曝光與預算
→ 上傳 creative
→ Review campaign
→ Submit mock campaign
→ Campaign status 變成 Pending Review
```

### MVP 成功標準

使用者應該能在 **5 分鐘內** 完成一個 mock campaign submission。

### 4.2 Non-goals

MVP v0.1 不包含：

- 真實付款
- 真實 booking confirmation
- 真實後端 API
- 真實資料庫
- 真實登入 / 權限
- 真實 Google Maps / Mapbox integration
- 真實素材上傳 storage
- 真實 creative approval
- 真實投放排程
- 真實 Web Player
- 真實 Proof-of-Play
- 真實 Reporting Dashboard
- 真實 billing / invoice

這些會放到未來版本。

---

## 5. User Journey

### 5.1 Main User Flow

```text
Step 1：廣告主進入 Campaign Planner
Step 2：選擇 campaign objective
Step 3：使用左側 Filter Sidebar 篩選 inventory
Step 4：在 Map View 或 List View 查看可投放點位
Step 5：點擊點位查看 detail
Step 6：將點位加入 Media Plan
Step 7：右側 Media Plan Summary 即時更新曝光與預算
Step 8：點擊 Continue to Creative Upload
Step 9：上傳或 mock upload creative
Step 10：進入 Review Campaign
Step 11：確認 inventory、creative、budget、impressions
Step 12：Submit Campaign
Step 13：Campaign status 從 Draft 變成 Pending Review
```

### 5.2 User Value

這個流程幫助廣告主回答：

```text
我可以在哪裡投放？
哪些點位適合我的目標？
每個點位大概多少曝光？
每個點位大概要多少錢？
我目前選了哪些點位？
整個 campaign 預估多少預算？
素材需要符合什麼規格？
送出後下一步會發生什麼？
```

---

## 6. MVP Scope

### 6.1 Included in v0.1

MVP v0.1 包含以下模組：

1. Campaign Planner Page
2. Filter Sidebar
3. Inventory Discovery
4. List View
5. Mock Map View
6. Inventory Detail Card
7. Media Plan Summary
8. Creative Upload Step
9. Creative Preview Card
10. Campaign Review Step
11. Mock Submit Campaign
12. Local state management
13. Mock inventory data
14. Mock creative upload
15. Mock campaign status transition

### 6.2 Excluded from v0.1

不包含：

1. Admin / CMS Dashboard
2. Web Player
3. Proof-of-Play Logging
4. Advertiser Reporting Dashboard
5. Backend database
6. Supabase integration
7. Authentication
8. Payment
9. Real booking
10. Real map service
11. Real file upload
12. Real approval workflow

---

## 7. Functional Requirements

### 7.1 Campaign Planner Page

#### Description

Campaign Planner 是廣告主建立 campaign 的第一個主要頁面。

#### Layout

桌面版三欄式 layout：

```text
Top：Header
Left：Filter Sidebar
Center：Inventory Discovery
Right：Media Plan Summary
```

#### Required UI Elements

Header 需要包含：

- Page title：Campaign Planner
- Campaign name input 或 campaign name display
- Save Draft button
- Continue button

#### Acceptance Criteria

- 使用者可以進入 `/campaign-planner`。
- 頁面呈現三欄 layout。
- 左側顯示 filters。
- 中間顯示 inventory discovery area。
- 右側顯示 media plan summary。
- 沒有選擇 inventory 時，summary 顯示 empty state。

---

### 7.2 Inventory Data

#### Description

系統需要使用 mock data 顯示可投放 DOOH inventory。

#### Inventory Location Fields

每筆 inventory 需要包含：

```text
id
name
city
district
address
latitude
longitude
venueType
screenType
dailyImpressions
cpm
pricePerDay
availability
audienceTags
imageUrl
description
operatingHours
minimumBookingDays
```

#### Required Mock Locations

MVP 需要至少包含以下點位：

- Taipei 101 / Xinyi District
- Taipei Main Station
- Zhongxiao Fuxing
- Ximending
- Nangang Software Park
- Songshan Airport
- Banqiao Station
- Neihu Technology Park
- Shilin Night Market
- Gongguan

#### Acceptance Criteria

- mock inventory 至少有 10 筆資料。
- 每筆資料都有 id。
- 每筆資料可以被篩選、搜尋、排序與加入 media plan。
- pricing / impressions 欄位需為 number，方便計算。

---

### 7.3 Filter Sidebar

#### Description

使用者可以透過篩選器縮小可投放 inventory。

#### Filters

需要支援：

- Campaign objective
- City
- District
- Venue type
- Screen type
- Audience tags
- Availability
- Budget range
- Impressions range

#### Campaign Objective Options

```text
Awareness
Store visits
Product launch
Event promotion
```

#### Venue Type Examples

```text
Mall
Office building
Transit
Retail store
Outdoor billboard
Elevator
Airport
Night market
```

#### Screen Type Examples

```text
Indoor screen
Outdoor LED
Video wall
Elevator screen
Transit screen
Airport screen
```

#### Availability Options

```text
Available
Limited
Unavailable
```

#### Functional Behavior

- 空的 filter 不應影響結果。
- 多個 filters 可以一起作用。
- Audience tags 採 OR matching。
- Budget range 根據 `pricePerDay` 篩選。
- Impressions range 根據 `dailyImpressions` 篩選。
- City 和 district 需要能一起作用。
- Clear Filters 可以重置所有 filters。
- Active filter count 顯示目前有幾個 active filters。

#### Acceptance Criteria

- 使用者調整 filter 後，inventory 結果即時更新。
- 使用者可以清除 filters。
- 沒有符合條件的 inventory 時，顯示 empty state。

Empty state copy：

```text
No inventory matches your filters. Try adjusting your criteria.
```

---

### 7.4 Search

#### Description

使用者可以搜尋 inventory。

#### Search Fields

搜尋需要支援：

- Location name
- District
- Address

#### Behavior

- Search should be case-insensitive.
- Search query empty 時，顯示所有符合 filters 的結果。
- Search 應該與 filters 和 sort 一起運作。

#### Acceptance Criteria

- 搜尋 Taipei、Xinyi、Station、Banqiao 等關鍵字時能回傳相關結果。
- 搜尋無結果時顯示 empty state。

---

### 7.5 Sort

#### Description

使用者可以排序 inventory。

#### Sort Options

```text
impressions_desc
impressions_asc
price_desc
price_asc
cpm_desc
cpm_asc
```

#### Behavior

資料處理順序：

```text
Raw inventory
→ filters
→ search
→ sort
→ visible inventory
```

#### Acceptance Criteria

- 使用者切換排序後，visible inventory 順序正確更新。
- sort 作用在 filter / search 後的結果上。

---

### 7.6 List View

#### Description

List View 用 card 或 table 方式呈現 inventory。

#### Inventory Card Fields

每張 card 需要顯示：

- Location name
- City / district
- Venue type
- Screen type
- Daily impressions
- CPM
- Price per day
- Availability status
- Audience tags
- Short description
- View Details button
- Add to Media Plan button

#### Behavior

- 使用者可以點擊 View Details。
- 使用者可以點擊 Add to Media Plan。
- 已加入的 inventory card 顯示 selected 狀態。
- 不允許重複加入。

#### Acceptance Criteria

- List View 顯示 visible inventory。
- Card 上的數字格式清楚。
- selected inventory 有明顯 visual state。
- Add to Media Plan 後，右側 summary 更新。

---

### 7.7 Mock Map View

#### Description

Map View 使用 mock UI 模擬地圖，不串真實地圖服務。

#### Features

- 顯示 mock map-like interface。
- 顯示 clickable inventory pins。
- pin 位置根據 latitude / longitude normalization。
- 點擊 pin 顯示 Inventory Detail Card。
- selected inventory pin 高亮。
- Map View 和 List View 共用同一份 filtered / searched / sorted inventory。

#### Legend

Map View 需要顯示 legend：

```text
Available
Limited
Unavailable
Selected
```

#### Empty State

當沒有符合條件 inventory 時顯示：

```text
No locations available on the map. Try adjusting your filters.
```

#### Acceptance Criteria

- 使用者可以切換 Map View / List View。
- Map View 顯示與 List View 相同的 visible inventory。
- 點擊 pin 可以查看 detail。
- 從 Map View 加入 inventory 後，Media Plan Summary 更新。
- 切回 List View 時，該 inventory 仍顯示 selected。

---

### 7.8 Inventory Detail Card

#### Description

使用者點擊 card 或 map pin 後，可以看到 inventory 詳情。

#### Required Fields

- Location name
- Address
- City / district
- Venue type
- Screen type
- Daily impressions
- CPM
- Price per day
- Availability
- Audience tags
- Operating hours
- Minimum booking days
- Description
- Add to Media Plan button
- Close button

#### Acceptance Criteria

- 使用者可以打開與關閉 detail card。
- Detail card 可以加入 media plan。
- 已加入時 button 顯示 Added / Selected。
- 不能重複加入同一 inventory。

---

### 7.9 Media Plan Summary

#### Description

右側 Media Plan Summary 顯示目前選擇的 inventory 與預估結果。

#### Required Fields

- Selected location count
- Selected locations list
- Total daily impressions
- Estimated campaign impressions
- Total daily budget
- Estimated campaign budget
- Average CPM
- Campaign days
- Remove item button
- CTA：Continue to Creative Upload
- Secondary CTA：Save Draft

#### Calculation Logic

```text
totalDailyImpressions = sum(selectedInventory.dailyImpressions)

totalDailyBudget = sum(selectedInventory.pricePerDay)

estimatedCampaignImpressions = totalDailyImpressions * campaignDays

estimatedCampaignBudget = totalDailyBudget * campaignDays

averageCPM = estimatedCampaignBudget / estimatedCampaignImpressions * 1000
```

#### Guardrails

- selected inventory 為空時，Continue to Creative Upload disabled。
- 如果 impressions 為 0，average CPM 顯示 0 或 N/A。
- campaignDays invalid 時，default 為 1。

#### Acceptance Criteria

- 加入 inventory 後，summary 即時更新。
- 移除 inventory 後，summary 即時更新。
- 不允許重複 inventory。
- 沒有選擇時顯示 empty state。

Empty state copy：

```text
Select locations to build your media plan.
```

---

### 7.10 Creative Upload Step

#### Description

使用者建立 media plan 後，可以上傳或 mock upload 廣告素材。

#### Entry Condition

使用者必須至少選擇一個 inventory，才能進入 Creative Upload。

#### UI Elements

Creative Upload Step 需要包含：

- Page title：Upload Creative
- Selected media plan summary
- Upload area / dropzone style card
- Upload Image or Video button
- Creative requirements
- Creative preview card
- Back to Inventory button
- Continue to Review button

#### Supported Formats

```text
JPG
PNG
MP4
```

#### Recommended Specs

```text
1920x1080
1080x1920
Max video length: 15 seconds
Max file size: 100MB
```

#### Creative Approval Note

```text
Creatives will be reviewed before campaign launch.
```

#### CreativeAsset Type

```text
id
name
type
fileSize
durationSeconds
previewUrl
status
uploadedAt
```

#### Creative Status Options

```text
uploaded
pending_review
approved
rejected
```

#### Behavior

- 使用者可以 mock upload creative。
- 上傳後顯示 preview card。
- 使用者可以 remove creative。
- 沒有 creative 時，Continue to Review disabled。
- 如果 selected screens 包含多種 screen type，顯示提醒。

Warning copy：

```text
Your selected screens may require multiple creative formats.
```

#### Acceptance Criteria

- 沒選 inventory 不能進入 Creative Upload。
- mock upload 後顯示 creative preview。
- remove creative 後，preview 消失。
- 沒有 creative 時不能進 Review。

---

### 7.11 Campaign Review Step

#### Description

使用者在送出前 review campaign 內容。

#### Required Sections

Review page 需要包含：

1. Campaign status badge：Draft
2. Selected inventory summary
3. Creative assets summary
4. Estimated campaign performance
5. Budget summary
6. Campaign settings summary
7. Approval and launch note
8. Submit Campaign button
9. Back to Creative Upload button

#### Selected Inventory Summary

顯示：

- Number of selected locations
- Location name
- District / city
- Venue type
- Screen type
- Daily impressions
- Price per day
- Availability

#### Creative Assets Summary

顯示：

- Uploaded creative count
- Creative name
- Type
- File size
- Status
- Uploaded time
- Preview placeholder

#### Estimated Campaign Performance

顯示：

- Total daily impressions
- Estimated campaign impressions
- Average CPM
- Selected screen types
- Selected audience tags

#### Budget Summary

顯示：

- Total daily budget
- Estimated campaign budget
- Average CPM
- Pricing note

Pricing note：

```text
Final pricing may depend on approval and inventory availability.
```

#### Campaign Settings Summary

MVP 可使用 default mock values：

```text
objective: Awareness
date range: next 7 days
time slot: All day
duration: 7 days
```

#### Warning Notes

需要顯示：

```text
Creative approval is required before launch.
Inventory availability is not guaranteed until confirmed.
Multiple screen formats may require additional creative versions.
```

#### Acceptance Criteria

- 使用者可以看到完整 campaign summary。
- 沒有 inventory 或 creative 時不能 submit。
- Review page 資訊與前面步驟一致。
- Submit button 明確可見。

---

### 7.12 Mock Campaign Submit

#### Description

使用者點擊 Submit Campaign 後，系統模擬送出 campaign。

#### Behavior

送出前：

```text
Campaign status = Draft
```

送出後：

```text
Campaign status = Pending Review
```

Success message：

```text
Your campaign has been submitted for review. Creative and inventory availability will be checked before launch.
```

#### Acceptance Criteria

- Submit 後顯示 success state。
- Campaign status badge 從 Draft 改成 Pending Review。
- 不 call backend。
- 不進行真實 payment 或 booking。

---

## 8. Data Requirements

### 8.1 TypeScript Types

#### CampaignObjective

```ts
type CampaignObjective =
  | "awareness"
  | "store_visits"
  | "product_launch"
  | "event_promotion";
```

#### VenueType

```ts
type VenueType =
  | "mall"
  | "office_building"
  | "transit"
  | "retail_store"
  | "outdoor_billboard"
  | "elevator"
  | "airport"
  | "night_market";
```

#### ScreenType

```ts
type ScreenType =
  | "indoor_screen"
  | "outdoor_led"
  | "video_wall"
  | "elevator_screen"
  | "transit_screen"
  | "airport_screen";
```

#### AvailabilityStatus

```ts
type AvailabilityStatus = "available" | "limited" | "unavailable";
```

#### AudienceTag

```ts
type AudienceTag =
  | "business_professionals"
  | "shoppers"
  | "commuters"
  | "tourists"
  | "students"
  | "families"
  | "travelers"
  | "nightlife";
```

#### InventoryLocation

```ts
interface InventoryLocation {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  venueType: VenueType;
  screenType: ScreenType;
  dailyImpressions: number;
  cpm: number;
  pricePerDay: number;
  availability: AvailabilityStatus;
  audienceTags: AudienceTag[];
  imageUrl: string;
  description: string;
  operatingHours: string;
  minimumBookingDays: number;
}
```

#### FilterState

```ts
interface FilterState {
  campaignObjective?: CampaignObjective;
  city?: string;
  district?: string;
  venueTypes: VenueType[];
  screenTypes: ScreenType[];
  audienceTags: AudienceTag[];
  availability?: AvailabilityStatus;
  minBudget?: number;
  maxBudget?: number;
  minImpressions?: number;
  maxImpressions?: number;
}
```

#### SortOption

```ts
type SortOption =
  | "impressions_desc"
  | "impressions_asc"
  | "price_desc"
  | "price_asc"
  | "cpm_desc"
  | "cpm_asc";
```

#### MediaPlanItem

```ts
interface MediaPlanItem {
  inventoryLocationId: string;
  inventoryLocation: InventoryLocation;
  addedAt: string;
}
```

#### CampaignEstimate

```ts
interface CampaignEstimate {
  selectedLocationCount: number;
  totalDailyImpressions: number;
  estimatedCampaignImpressions: number;
  totalDailyBudget: number;
  estimatedCampaignBudget: number;
  averageCPM: number;
  campaignDays: number;
}
```

#### CreativeAsset

```ts
interface CreativeAsset {
  id: string;
  name: string;
  type: "image" | "video";
  fileSize: number;
  durationSeconds?: number;
  previewUrl: string;
  status: "uploaded" | "pending_review" | "approved" | "rejected";
  uploadedAt: string;
}
```

#### CampaignStatus

```ts
type CampaignStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "live"
  | "completed";
```

---

## 9. Utility Requirements

### 9.1 Inventory Utilities

Required functions：

```ts
filterInventory(inventory, filters)
searchInventory(inventory, searchQuery)
sortInventory(inventory, sortOption)
getAvailableDistricts(inventory)
getAvailableVenueTypes(inventory)
getAvailableScreenTypes(inventory)
getAvailableAudienceTags(inventory)
```

### 9.2 Media Plan Utilities

Required functions：

```ts
addToMediaPlan(selectedItems, inventoryLocation)
removeFromMediaPlan(selectedItems, inventoryLocationId)
isInMediaPlan(selectedItems, inventoryLocationId)
calculateCampaignEstimate(selectedItems, campaignDays)
```

### 9.3 Formatter Utilities

Required functions：

```ts
formatCurrency(value)
formatNumber(value)
formatCPM(value)
formatDateRange(startDate, endDate)
```

Formatting rules：

- Currency 使用 TWD。
- Number 使用 comma separators。
- CPM 顯示兩位小數。
- Date range 顯示 readable format。

---

## 10. UX Requirements

### 10.1 Design Principles

整體設計應該符合：

- Modern B2B SaaS
- Premium advertising platform feel
- Light theme
- Desktop-first
- Clean spacing
- Clear hierarchy
- Data-dense but readable
- Strong CTA hierarchy
- Clear selected state
- Clear empty state
- Clear disabled state

### 10.2 Information Hierarchy

最重要資訊：

1. Location
2. Impressions
3. Price
4. CPM
5. Availability
6. Audience context
7. Selected state
8. Next action

### 10.3 Core UX Questions

介面應該幫助廣告主快速回答：

```text
我可以在哪裡投放？
這個點位值不值得？
大概有多少曝光？
大概要多少錢？
我目前選了哪些點位？
下一步是什麼？
```

---

## 11. Edge Cases

MVP 需要處理以下情境：

1. 沒有 inventory 符合 filters。
2. 搜尋無結果。
3. 使用者沒有選 inventory 就想進 Creative Upload。
4. 使用者沒有上傳 creative 就想進 Review。
5. 使用者重複加入同一 inventory。
6. selected inventory 為空時計算 summary。
7. impressions 為 0 時計算 CPM。
8. campaignDays 為 0 或 invalid。
9. unavailable inventory 是否允許加入 media plan。
10. Map View 沒有任何 pins。
11. Creative upload 後又刪除 creative。
12. Submit 前缺少必要資料。

---

## 12. Success Metrics

### 12.1 Product Usability Metrics

MVP 需要驗證：

- 使用者是否能在 5 分鐘內完成 mock campaign submission。
- 使用者是否能理解 Map View / List View。
- 使用者是否能找到並加入 inventory。
- 使用者是否能理解預估曝光與預算。
- 使用者是否能完成 creative upload。
- 使用者是否能理解 review page。
- 使用者是否知道 submit 後 campaign 會進入 pending review。

### 12.2 Product Value Metrics

需要觀察：

- 使用者是否覺得比傳統人工詢價更快。
- 使用者是否覺得 inventory 比較更透明。
- 使用者是否願意使用這個流程建立 campaign。
- 使用者是否覺得價格與曝光資訊足夠做初步決策。
- 使用者是否覺得 media plan summary 有幫助。

---

## 13. Future Scope

### v0.2：Admin / CMS Dashboard

未來加入：

- Campaign list
- Campaign detail
- Creative review queue
- Approve / reject campaign
- Inventory management
- Screen management
- Campaign status management

### v0.3：Web Player MVP

未來加入：

- `/player/[screenId]`
- Playlist playback
- Mock heartbeat
- Fullscreen player
- Empty playlist state
- Screen status overlay

### v0.4：Proof-of-Play

未來加入：

- Playback event logging
- Started / completed / failed logs
- Device status
- Proof-of-play summary
- Campaign delivery validation

### v0.5：Advertiser Reporting Dashboard

未來加入：

- Total plays
- Estimated impressions
- Budget spent
- Average CPM
- Plays by location
- Plays by creative
- Proof-of-play report table
- Delivery progress

### v1.0：Production System

未來正式產品需要：

- Backend database
- Supabase / Postgres schema
- Real authentication
- Role-based access
- File storage
- Real map integration
- Real booking engine
- Real inventory availability
- Real creative approval
- Real playlist scheduling
- Real player device registration
- Real proof-of-play logging
- Real reporting
- Billing / invoice

---

## 14. Technical Implementation Plan

### Recommended Build Order

```text
Step 1：Code architecture
Step 2：Types + mock inventory data
Step 3：Utility functions
Step 4：Campaign Planner layout
Step 5：List View + Inventory Cards
Step 6：Filter Sidebar behavior
Step 7：Mock Map View
Step 8：Creative Upload Flow
Step 9：Campaign Review + Submit Mock
```

### Recommended File Structure

```text
src/
  app/
    campaign-planner/
      page.tsx

  components/
    campaign-planner/
      CampaignPlannerPage.tsx
      FilterSidebar.tsx
      InventoryDiscovery.tsx
      ListView.tsx
      MapView.tsx
      InventoryCard.tsx
      InventoryDetailCard.tsx
      MediaPlanSummary.tsx
      ViewToggle.tsx
      SearchAndSortBar.tsx
      CreativeUploadStep.tsx
      CreativePreviewCard.tsx
      CreativeRequirements.tsx
      CampaignReviewStep.tsx
      ReviewSection.tsx

  data/
    mockInventory.ts

  types/
    dooh.ts

  utils/
    inventoryFilters.ts
    mediaPlanCalculations.ts
    formatters.ts
```

---

## 15. Risks and Tradeoffs

### 15.1 Product Risks

1. 廣告主可能不信任 estimated impressions。
2. 價格模型如果不清楚，會影響決策。
3. Map View 如果做得太假，可能降低 demo 說服力。
4. 沒有真實 availability，可能讓 booking 流程不完整。
5. Creative spec 如果太簡化，未來接真實 DOOH 螢幕會需要重構。

### 15.2 Technical Risks

1. 如果 state 全部放在單一 component，未來可能變難維護。
2. Mock data schema 若設計不好，未來接 backend 會重做。
3. Map pin normalization 只是 MVP solution，不適合 production。
4. Creative upload mock 與真實 storage 差距較大。
5. Media plan calculation 需要避免 impressions 為 0 的錯誤。

### 15.3 Scope Risks

最大風險是一次想做太多。

因此 v0.1 應該只聚焦：

```text
Advertiser Campaign Creation Flow
```

不要在 v0.1 同時做 Admin、Player、Proof-of-Play、Reporting。

---

## 16. Open Questions

目前尚未決定：

1. 第一版市場是台灣、亞洲，還是全球？
2. 價格模型以 CPM 為主，還是 price per day 為主？
3. Inventory 是單一螢幕、點位、還是螢幕 network？
4. Availability 是否要影響是否能加入 Media Plan？
5. Campaign 是否需要使用者自訂日期與時段？
6. Creative approval 是平台審核還是媒體主審核？
7. 是否需要 advertiser workspace？
8. 是否要支援多個 campaign objectives 的不同推薦邏輯？
9. Map View 是否未來一定要接 Mapbox / Google Maps？
10. Proof-of-play 未來是否會影響 billing？
11. Reporting 的 estimated impressions 要如何計算？
12. 未來是否需要支援 programmatic bidding？

---

## 17. MVP Definition of Done

MVP v0.1 完成標準：

```text
使用者可以進入 Campaign Planner
可以看到 mock DOOH inventory
可以使用 filters / search / sort
可以切換 List View / Map View
可以查看 inventory detail
可以加入 inventory 到 Media Plan
Media Plan Summary 會即時更新
可以進入 Creative Upload
可以 mock upload creative
可以進入 Campaign Review
可以 Submit mock campaign
Campaign status 變成 Pending Review
```

完成後，這個 MVP 可以用來 demo：

> 廣告主如何透過 self-service marketplace 建立一個 DOOH campaign。
