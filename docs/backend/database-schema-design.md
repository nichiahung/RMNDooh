# DOOH Platform — Backend Database Schema Design

**版本：** v0.1  
**日期：** 2026-05-13  
**目的：** 為 DOOH 平台設計生產級資料庫 schema，支援當前 MVP 並為未來後端整合預做準備。  
**假設技術棧：** PostgreSQL（透過 Supabase）、Supabase Storage、未來啟用 Row Level Security（RLS）

> **此文件不含任何實作代碼。** 以下 SQL 為草稿示意，供產品討論與技術評估使用。

---

## 1. Entity Relationship 總覽

用一句話理解各實體的關係：

```
一個 User（使用者）屬於多個 Advertiser（廣告主公司），
  透過 advertiser_members 管理成員身份。

一個 Advertiser 可以建立多個 Campaign（廣告活動）。

一個 Campaign 選擇多個 InventoryLocation（刊播版位），
  記錄在 campaign_inventory_items。

一個 Campaign 上傳多個 CreativeAsset（廣告素材），
  CreativeAsset 背後對應 MediaAsset（儲存的實際檔案）。

一個 InventoryLocation 有多個 Screen（播出裝置）。

一個 Screen 執行一個 Playlist（播放清單），
  Playlist 由多個 PlaylistItem 組成，
  每個 PlaylistItem 對應一個 CreativeAsset。

Screen 播放時產生 ProofOfPlayLog（刊播佐證紀錄）。

CampaignReport 是從 ProofOfPlayLog 彙整而來的報表。

Notification 推播給特定 User。

AuditLog 記錄所有重要系統操作。
```

---

## 2. Relationship Diagram（文字版）

```
users
  ├── advertiser_members ──► advertisers
  │                              ├── campaigns
  │                              │     ├── campaign_inventory_items ──► inventory_locations
  │                              │     │                                      └── screens
  │                              │     │                                            ├── playlists
  │                              │     │                                            │     └── playlist_items
  │                              │     │                                            └── proof_of_play_logs
  │                              │     ├── creative_assets ──► media_assets
  │                              │     └── campaign_reports
  │                              └── media_assets
  └── notifications
  └── audit_logs
```

---

## 3. 各表格詳細設計

---

### 表 1：`users`

**用途：** 儲存所有使用者登入帳號，包含廣告主人員和平台管理員。

**對應模組：** 登入 / 權限管理 / Admin Dashboard

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'advertiser_user',
  -- role 可選：'super_admin' | 'advertiser_user'
  -- super_admin = 平台後台管理員
  -- advertiser_user = 一般廣告主帳號
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_sign_in_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**主鍵：** `id`  
**唯一約束：** `email`  
**索引：** `email`、`role`  
**備注：** Supabase Auth 的 `auth.users` 是認證來源，此表是 public schema 的使用者資料表，透過 `id` 對應。未來啟用 RLS 後，每位使用者只能讀取自己的資料。

---

### 表 2：`advertisers`

**用途：** 代表購買廣告的公司或品牌，一個廣告主帳號可有多位成員使用者。

**對應模組：** Campaign Planner / Admin Dashboard

```sql
CREATE TABLE advertisers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  -- slug = URL 友善識別碼，如 "coca-cola-tw"
  logo_url      TEXT,
  contact_email TEXT NOT NULL,
  billing_email TEXT,
  address       TEXT,
  country       TEXT NOT NULL DEFAULT 'TW',
  currency      TEXT NOT NULL DEFAULT 'TWD',
  status        TEXT NOT NULL DEFAULT 'active',
  -- status 可選：'active' | 'suspended' | 'pending_verification'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**主鍵：** `id`  
**唯一約束：** `slug`  
**索引：** `slug`、`status`  
**備注：** MVP 階段 advertiser 可先 hardcode，正式上線後才需要 onboarding 流程。

---

### 表 3：`advertiser_members`

**用途：** 管理「使用者屬於哪個廣告主帳號」的多對多關係，以及在該帳號內的角色。

**對應模組：** 廣告主帳號管理 / 權限控制

```sql
CREATE TABLE advertiser_members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id      UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role               TEXT NOT NULL DEFAULT 'member',
  -- role 可選：'owner' | 'admin' | 'member' | 'viewer'
  invited_by_user_id UUID REFERENCES users(id),
  invited_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at        TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'active',
  -- status 可選：'pending' | 'active' | 'removed'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(advertiser_id, user_id)
  -- 同一個 user 在同一個 advertiser 只能有一筆成員記錄
);
```

**主鍵：** `id`  
**外鍵：** `advertiser_id → advertisers`、`user_id → users`  
**唯一約束：** `(advertiser_id, user_id)`  
**索引：** `user_id`（查詢「我屬於哪些廣告主」）、`advertiser_id`  
**備注：** RLS 會利用此表判斷使用者能否存取特定廣告主的資料。

---

### 表 4：`campaigns`

**用途：** 廣告主建立的廣告活動，是整個平台最核心的實體。

**對應模組：** Campaign Planner / Admin CMS / Reporting

```sql
CREATE TABLE campaigns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id         UUID NOT NULL REFERENCES advertisers(id),
  created_by_user_id    UUID NOT NULL REFERENCES users(id),
  name                  TEXT NOT NULL,
  objective             TEXT NOT NULL,
  -- objective 可選：'awareness' | 'store_visits' | 'product_launch' | 'event_promotion'
  status                TEXT NOT NULL DEFAULT 'draft',
  -- status 可選：'draft' | 'pending_review' | 'approved' | 'rejected'
  --              | 'scheduled' | 'live' | 'completed' | 'cancelled'
  start_date            DATE,
  end_date              DATE,
  campaign_days         INT NOT NULL DEFAULT 7,
  total_budget          NUMERIC(12, 2),
  -- 預算以 TWD 為單位，精度到分
  currency              TEXT NOT NULL DEFAULT 'TWD',
  estimated_impressions BIGINT,
  -- 送出時快照（lock in）
  submitted_at          TIMESTAMPTZ,
  reviewed_by_user_id   UUID REFERENCES users(id),
  reviewed_at           TIMESTAMPTZ,
  approval_notes        TEXT,
  -- 審查員備注或退回原因
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**主鍵：** `id`  
**外鍵：** `advertiser_id`、`created_by_user_id`、`reviewed_by_user_id`  
**索引：** `advertiser_id`、`status`、`(advertiser_id, status)`、`submitted_at`  
**狀態流程：**

```
draft → pending_review → approved → scheduled → live → completed
                      ↘ rejected → (advertiser 修改後重新送出)
```

---

### 表 5：`campaign_inventory_items`

**用途：** 記錄一個 Campaign 的 Media Plan 選了哪些版位、各刊播幾天、當時的定價快照。

**對應模組：** Campaign Planner / Media Plan Summary / Admin CMS

```sql
CREATE TABLE campaign_inventory_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  inventory_location_id UUID NOT NULL REFERENCES inventory_locations(id),
  days                  INT NOT NULL DEFAULT 7,
  price_per_day         NUMERIC(10, 2) NOT NULL,
  -- 下單時的價格快照，不隨 inventory 更新而變動
  daily_impressions     BIGINT NOT NULL,
  -- 下單時的曝光快照
  total_price           NUMERIC(12, 2) GENERATED ALWAYS AS (price_per_day * days) STORED,
  total_impressions     BIGINT GENERATED ALWAYS AS (daily_impressions * days) STORED,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(campaign_id, inventory_location_id)
  -- 同一個版位在同一個 campaign 只能選一次
);
```

**主鍵：** `id`  
**外鍵：** `campaign_id`、`inventory_location_id`  
**唯一約束：** `(campaign_id, inventory_location_id)`  
**備注：** `total_price` 和 `total_impressions` 使用 PostgreSQL Generated Column，自動計算。快照定價設計是關鍵：廣告主確認訂單時，價格就應鎖定，不受後續版位定價調整影響。

---

### 表 6：`inventory_locations`

**用途：** 平台上所有可刊播的 DOOH 廣告版位（位置層級）。

**對應模組：** Campaign Planner / Admin CMS 版位管理

```sql
CREATE TABLE inventory_locations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  slug                 TEXT NOT NULL UNIQUE,
  city                 TEXT NOT NULL,
  district             TEXT NOT NULL,
  address              TEXT NOT NULL,
  latitude             NUMERIC(10, 7) NOT NULL,
  longitude            NUMERIC(10, 7) NOT NULL,
  venue_type           TEXT NOT NULL,
  -- 可選：'mall' | 'subway' | 'highway' | 'street' | 'airport'
  --        | 'night_market' | 'office_building' | 'station'
  screen_type          TEXT NOT NULL,
  -- 可選：'billboard' | 'transit' | 'street_furniture' | 'indoor'
  --        | 'kiosk' | 'mega_screen'
  daily_impressions    BIGINT NOT NULL DEFAULT 0,
  cpm                  NUMERIC(8, 2) NOT NULL DEFAULT 0,
  price_per_day        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  availability         NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
  -- 0.00 ~ 1.00，1.0 = 完全可用
  audience_tags        TEXT[] NOT NULL DEFAULT '{}',
  -- PostgreSQL 陣列，如 ARRAY['Professionals', 'Commuters']
  image_url            TEXT,
  description          TEXT,
  operating_hours      TEXT,
  minimum_booking_days INT NOT NULL DEFAULT 7,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  owner_user_id        UUID REFERENCES users(id),
  -- 未來媒體主（media owner）會有自己帳號
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 地理位置索引（未來地圖搜尋）
CREATE INDEX idx_inventory_locations_geo
  ON inventory_locations USING GIST (
    ST_MakePoint(longitude, latitude)
  );
-- 需啟用 PostGIS extension

CREATE INDEX idx_inventory_locations_district ON inventory_locations(district);
CREATE INDEX idx_inventory_locations_venue_type ON inventory_locations(venue_type);
CREATE INDEX idx_inventory_locations_is_active ON inventory_locations(is_active);
```

**主鍵：** `id`  
**備注：** `availability` 是 0~1 的浮點數，0.7 以上 = 充足，0.3~0.7 = 有限，低於 0.3 = 緊張。地理索引需啟用 PostGIS，目前 MVP 可跳過，未來地圖篩選時使用。

---

### 表 7：`screens`

**用途：** 每個版位實際的播出裝置（硬體螢幕或虛擬播放器）。一個版位可能有多台螢幕。

**對應模組：** Web Player / Admin CMS 螢幕管理 / Proof-of-Play

```sql
CREATE TABLE screens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_code           TEXT NOT NULL UNIQUE,
  -- 人類可讀的裝置識別碼，如 'SCR-1000'
  screen_name           TEXT NOT NULL,
  inventory_location_id UUID NOT NULL REFERENCES inventory_locations(id),
  status                TEXT NOT NULL DEFAULT 'offline',
  -- 可選：'online' | 'offline' | 'maintenance'
  orientation           TEXT NOT NULL DEFAULT 'landscape',
  -- 可選：'landscape' | 'portrait'
  resolution            TEXT NOT NULL DEFAULT '1920x1080',
  current_campaign_id   UUID REFERENCES campaigns(id),
  current_playlist_id   UUID REFERENCES playlists(id),
  last_heartbeat_at     TIMESTAMPTZ,
  ip_address            INET,
  firmware_version      TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**主鍵：** `id`  
**唯一約束：** `screen_code`  
**外鍵：** `inventory_location_id`、`current_campaign_id`（nullable）、`current_playlist_id`（nullable）  
**索引：** `screen_code`、`status`、`inventory_location_id`  
**備注：** `last_heartbeat_at` 是 Web Player 定期回報的心跳時間。超過 5 分鐘無心跳可判定為離線。

---

### 表 8：`media_assets`

**用途：** 實際上傳到 Supabase Storage 的檔案記錄（原始素材倉庫）。

**對應模組：** Creative Upload / Admin CMS 素材審查

```sql
CREATE TABLE media_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id       UUID NOT NULL REFERENCES advertisers(id),
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
  original_filename   TEXT NOT NULL,
  storage_path        TEXT NOT NULL UNIQUE,
  -- Supabase Storage 路徑，如 'advertisers/{advertiser_id}/assets/{filename}'
  public_url          TEXT NOT NULL,
  file_type           TEXT NOT NULL,
  -- 可選：'image' | 'video'
  mime_type           TEXT NOT NULL,
  -- 如 'image/jpeg' | 'video/mp4'
  file_size_bytes     BIGINT NOT NULL,
  duration_seconds    INT,
  -- 影片才有
  width_px            INT,
  height_px           INT,
  status              TEXT NOT NULL DEFAULT 'uploading',
  -- 可選：'uploading' | 'ready' | 'failed' | 'deleted'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**主鍵：** `id`  
**外鍵：** `advertiser_id`、`uploaded_by_user_id`  
**索引：** `advertiser_id`、`status`  
**備注：** `media_assets` 是「素材庫」，一個廣告主上傳的素材可被多個 Campaign 的 `creative_assets` 引用。這樣設計避免重複上傳同一個檔案。

---

### 表 9：`creative_assets`

**用途：** 將廣告素材（media_asset）與特定 Campaign 綁定，記錄審查狀態。

**對應模組：** Campaign Planner / Admin CMS 素材審查 / Web Player 播放

```sql
CREATE TABLE creative_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  media_asset_id      UUID NOT NULL REFERENCES media_assets(id),
  name                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending_review',
  -- 可選：'pending_review' | 'approved' | 'rejected'
  review_notes        TEXT,
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**主鍵：** `id`  
**外鍵：** `campaign_id`、`media_asset_id`、`reviewed_by_user_id`  
**索引：** `campaign_id`、`status`  
**備注：** 一個 Campaign 可有多個 `creative_assets`。審查通過的才能進入播放清單（`playlist_items`）。

---

### 表 10：`playlists`

**用途：** 一台螢幕在某段時間的播放清單配置，決定播什麼、什麼時候播。

**對應模組：** Web Player / Admin CMS / 排程系統

```sql
CREATE TABLE playlists (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id            UUID NOT NULL REFERENCES screens(id),
  campaign_id          UUID REFERENCES campaigns(id),
  -- null = 預設（default）播放清單，非特定 campaign
  name                 TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft',
  -- 可選：'draft' | 'active' | 'inactive' | 'expired'
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  start_time           TIME,
  -- null = 全天候
  end_time             TIME,
  loop_duration_seconds INT NOT NULL DEFAULT 60,
  -- 整個 loop 的總秒數
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**主鍵：** `id`  
**外鍵：** `screen_id`、`campaign_id`（nullable）  
**索引：** `screen_id`、`status`、`(screen_id, status)`  
**備注：** 未來排程引擎會根據 `start_date`、`end_date`、`start_time`、`end_time` 決定哪個 playlist 處於 active 狀態。

---

### 表 11：`playlist_items`

**用途：** 播放清單內的每一個廣告素材插槽，決定播放順序和時長。

**對應模組：** Web Player / 排程系統

```sql
CREATE TABLE playlist_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id       UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  creative_asset_id UUID NOT NULL REFERENCES creative_assets(id),
  position          INT NOT NULL,
  -- 播放順序，從 1 開始
  duration_seconds  INT NOT NULL DEFAULT 15,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(playlist_id, position)
  -- 同一個 playlist 的 position 不能重複
);
```

**主鍵：** `id`  
**外鍵：** `playlist_id`、`creative_asset_id`  
**唯一約束：** `(playlist_id, position)`  
**索引：** `playlist_id`（查詢某 playlist 的全部 items）

---

### 表 12：`proof_of_play_logs`

**用途：** Web Player 播出時產生的每一筆播放佐證記錄，是 Reporting 的原始資料來源。

**對應模組：** Web Player / Proof-of-Play / Reporting Dashboard

```sql
CREATE TABLE proof_of_play_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id         UUID REFERENCES screens(id),
  screen_code       TEXT NOT NULL,
  -- 冗餘存 screen_code，即使 screen 被刪除也保有歷史記錄
  campaign_id       UUID REFERENCES campaigns(id),
  creative_asset_id UUID REFERENCES creative_assets(id),
  playlist_item_id  UUID REFERENCES playlist_items(id),
  creative_name     TEXT NOT NULL,
  -- 冗餘存名稱，保有歷史快照
  creative_type     TEXT NOT NULL,
  -- 'image/jpeg' | 'video/mp4' 等
  playback_status   TEXT NOT NULL,
  -- 可選：'started' | 'completed' | 'failed' | 'skipped'
  duration_seconds  INT NOT NULL,
  played_at         TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  -- 此表不需 updated_at，log 只能新增不能修改
);

-- 高寫入量，需要分區策略（未來）
-- 建議按月分區：PARTITION BY RANGE (played_at)

CREATE INDEX idx_pop_logs_campaign_id ON proof_of_play_logs(campaign_id);
CREATE INDEX idx_pop_logs_screen_id ON proof_of_play_logs(screen_id);
CREATE INDEX idx_pop_logs_played_at ON proof_of_play_logs(played_at);
CREATE INDEX idx_pop_logs_status ON proof_of_play_logs(playback_status);
```

**主鍵：** `id`  
**外鍵：** 全部 nullable（log 是歷史快照，即使關聯資料刪除也應保留）  
**備注：** 這是整個平台寫入量最高的表。未來需考慮按月做 Table Partitioning，或定期歸檔到冷儲存。冗餘欄位（`screen_code`、`creative_name`）是刻意設計，保證即使關聯實體被刪除，歷史記錄仍完整。

---

### 表 13：`campaign_reports`

**用途：** 從 `proof_of_play_logs` 彙整計算的每日 Campaign 報表，避免每次查詢都重算所有 logs。

**對應模組：** Reporting Dashboard

```sql
CREATE TABLE campaign_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID NOT NULL REFERENCES campaigns(id),
  report_date           DATE NOT NULL,
  -- 每天一筆彙整記錄
  total_plays           INT NOT NULL DEFAULT 0,
  completed_plays       INT NOT NULL DEFAULT 0,
  failed_plays          INT NOT NULL DEFAULT 0,
  skipped_plays         INT NOT NULL DEFAULT 0,
  estimated_impressions BIGINT NOT NULL DEFAULT 0,
  budget_spent          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  avg_cpm               NUMERIC(8, 2),
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(campaign_id, report_date)
  -- 每個 campaign 每天只有一筆彙整
);
```

**主鍵：** `id`  
**外鍵：** `campaign_id`  
**唯一約束：** `(campaign_id, report_date)`  
**備注：** 這是一個「物化視圖」概念的實作方式。每天由 Cron Job 或 Database Function 從 `proof_of_play_logs` 彙整計算，寫入此表。這樣 Reporting Dashboard 查詢速度快，不需要掃描大量 log records。

---

### 表 14：`notifications`

**用途：** 系統推播給特定使用者的通知，如審查通過、Campaign 上線等。

**對應模組：** Campaign Planner / Admin CMS / 通知中心

```sql
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  -- 可選：'campaign_approved' | 'campaign_rejected' | 'creative_approved'
  --        | 'creative_rejected' | 'campaign_live' | 'campaign_completed'
  --        | 'campaign_submitted' | 'system_notice'
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  link       TEXT,
  -- App 內的深層連結，如 '/campaign-planner?campaignId=...'
  is_read    BOOLEAN NOT NULL DEFAULT false,
  read_at    TIMESTAMPTZ,
  metadata   JSONB,
  -- 彈性存額外資料，如 { "campaign_id": "..." }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read)
  WHERE is_read = false;
-- Partial index：只索引未讀通知，查詢更快
```

**主鍵：** `id`  
**外鍵：** `user_id`  
**索引：** `user_id`、未讀 partial index  
**備注：** `metadata` 用 JSONB 而非固定欄位，讓不同類型的通知可以附帶不同的結構化資料，保持 schema 彈性。

---

### 表 15：`audit_logs`

**用途：** 記錄所有重要系統操作的不可修改歷史，用於安全稽核和問題追蹤。

**對應模組：** Admin CMS / 系統稽核

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  -- null = 系統自動觸發的操作
  action        TEXT NOT NULL,
  -- 格式：'{resource}.{verb}'，如 'campaign.approved'、'creative.rejected'
  --        | 'screen.status_changed' | 'user.invited'
  resource_type TEXT NOT NULL,
  -- 如 'campaign' | 'creative_asset' | 'screen' | 'user'
  resource_id   UUID NOT NULL,
  old_value     JSONB,
  -- 操作前的狀態快照
  new_value     JSONB,
  -- 操作後的狀態快照
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  -- 此表永不更新，只能新增
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

**主鍵：** `id`  
**備注：** `old_value` 和 `new_value` 用 JSONB 存完整快照，讓稽核人員清楚看到「改了什麼」。此表只增不改，禁止任何 UPDATE 或 DELETE 操作。

---

## 4. Enum 值總整理

| 類別 | 欄位 | 可選值 |
|------|------|--------|
| 使用者角色 | `users.role` | `super_admin`, `advertiser_user` |
| 廣告主狀態 | `advertisers.status` | `active`, `suspended`, `pending_verification` |
| 成員角色 | `advertiser_members.role` | `owner`, `admin`, `member`, `viewer` |
| 成員狀態 | `advertiser_members.status` | `pending`, `active`, `removed` |
| Campaign 目標 | `campaigns.objective` | `awareness`, `store_visits`, `product_launch`, `event_promotion` |
| Campaign 狀態 | `campaigns.status` | `draft`, `pending_review`, `approved`, `rejected`, `scheduled`, `live`, `completed`, `cancelled` |
| 場域類型 | `inventory_locations.venue_type` | `mall`, `subway`, `highway`, `street`, `airport`, `night_market`, `office_building`, `station` |
| 版面類型 | `inventory_locations.screen_type` | `billboard`, `transit`, `street_furniture`, `indoor`, `kiosk`, `mega_screen` |
| 螢幕狀態 | `screens.status` | `online`, `offline`, `maintenance` |
| 螢幕方向 | `screens.orientation` | `landscape`, `portrait` |
| 素材檔案類型 | `media_assets.file_type` | `image`, `video` |
| 素材上傳狀態 | `media_assets.status` | `uploading`, `ready`, `failed`, `deleted` |
| 廣告素材審查 | `creative_assets.status` | `pending_review`, `approved`, `rejected` |
| 播放清單狀態 | `playlists.status` | `draft`, `active`, `inactive`, `expired` |
| 播放結果 | `proof_of_play_logs.playback_status` | `started`, `completed`, `failed`, `skipped` |
| 通知類型 | `notifications.type` | `campaign_approved`, `campaign_rejected`, `creative_approved`, `creative_rejected`, `campaign_live`, `campaign_completed`, `campaign_submitted`, `system_notice` |

> **PostgreSQL 實作建議：** 以上 enum 可用 `TEXT` 加 `CHECK constraint` 實作，或建立 PostgreSQL `ENUM TYPE`。建議用 TEXT + CHECK，未來修改 enum 值更方便（PostgreSQL ENUM 修改需要 migration，TEXT 只需更新 CHECK）。

---

## 5. 各模組的資料所有權

| 產品模組 | 主要資料表 | 說明 |
|---------|-----------|------|
| Campaign Planner | `campaigns`, `campaign_inventory_items`, `creative_assets` | 廣告主建立和管理 campaign |
| Inventory Discovery | `inventory_locations` | 篩選、搜尋、排序版位 |
| Media Plan Summary | `campaign_inventory_items` | 計算預估曝光和預算 |
| Creative Upload | `media_assets`, `creative_assets` | 上傳和管理廣告素材 |
| Campaign Review & Submit | `campaigns`（status 更新） | 送出時更新狀態 |
| Admin CMS | 所有表 | 平台管理員讀寫全部資料 |
| Web Player | `screens`, `playlists`, `playlist_items`, `proof_of_play_logs` | 播出裝置讀取和寫入 |
| Reporting Dashboard | `proof_of_play_logs`, `campaign_reports` | 廣告主查看成效 |
| 通知系統 | `notifications` | 事件觸發後推播給使用者 |
| 系統稽核 | `audit_logs` | 記錄所有重要操作 |

---

## 6. MVP 表 vs 未來表

### MVP 階段必要（v1.0 上線前）

| 表格 | 原因 |
|------|------|
| `users` | 登入基礎 |
| `advertisers` | 廣告主帳號 |
| `campaigns` | 核心業務實體 |
| `campaign_inventory_items` | Media Plan |
| `inventory_locations` | 版位資料 |
| `media_assets` | 素材儲存 |
| `creative_assets` | 素材審查 |
| `screens` | 播放裝置 |
| `playlists` / `playlist_items` | 播放排程 |
| `proof_of_play_logs` | PoP 記錄 |

### 可後期加入

| 表格 | 原因 |
|------|------|
| `advertiser_members` | MVP 可先只支援單一使用者，多成員管理後期加 |
| `campaign_reports` | 初期可直接從 PoP logs 計算，量大後再加 |
| `notifications` | 初期用 email 代替，App 通知後期加 |
| `audit_logs` | 合規要求或企業客戶才需要 |

---

## 7. 建議 Migration 順序

建立表格需依外鍵依賴順序，避免先建 child table 但 parent 還不存在的問題：

```
Step 1：基礎實體（無外鍵依賴）
  → users
  → advertisers
  → inventory_locations

Step 2：關聯實體（依賴 Step 1）
  → advertiser_members
  → campaigns
  → screens
  → media_assets

Step 3：Campaign 關聯（依賴 Step 2）
  → campaign_inventory_items
  → creative_assets

Step 4：播放系統（依賴 Step 3）
  → playlists
  → playlist_items

Step 5：日誌與報表（依賴 Step 4）
  → proof_of_play_logs
  → campaign_reports

Step 6：通知與稽核（可獨立）
  → notifications
  → audit_logs
```

---

## 8. 風險與取捨

### 風險 1：`proof_of_play_logs` 資料量爆炸
每台螢幕每分鐘可能產生 1~4 筆 log。10 台螢幕 × 4 log/min × 60min × 16hr = **38,400 筆/天**，一年超過 1,400 萬筆。  
**取捨：** 初期可接受，但半年後需要做 Table Partitioning by month，或考慮將舊 log 歸檔到 S3。

### 風險 2：`campaigns.total_budget` vs 計算值不一致
`campaign_inventory_items` 的 `total_price` 加總可能與 `campaigns.total_budget` 不同（例如平台服務費）。  
**取捨：** MVP 先讓兩者保持一致，未來加入服務費率時需要明確的 reconciliation 邏輯。

### 風險 3：`inventory_locations.availability` 是靜態數值
目前 availability 是手動設定的數字，不反映即時訂單狀況。  
**取捨：** MVP 可接受，未來需要動態計算（根據已確認的 campaign_inventory_items 計算真實可用比例）。

### 風險 4：沒有 `billing` / `invoices` 表
MVP 沒有真實付款，但正式上線後需要完整的帳務系統。  
**取捨：** 先預留 `campaigns.total_budget` 和 `currency` 欄位，讓未來接上 billing 系統時有基礎資料。

### 風險 5：`audit_logs` 資料量
所有操作都記錄的話，audit_logs 也會快速增長。  
**取捨：** 初期只記錄重要操作（campaign status 變更、creative 審查），不記錄每次查詢。

---

## 9. Open Questions

以下問題在 schema 設計前需要釐清：

1. **一個版位（inventory_location）有幾台螢幕？** 目前設計是 1:N，但如果版位等於螢幕，可以合併成一個表。
2. **Campaign 跨多台螢幕時，PoP logs 要如何對應到具體的計費？** 需要確認 billing 粒度是版位層級還是螢幕層級。
3. **Playlist 是誰建立的？** 廣告主 campaign 核准後自動建立？還是 Admin 手動建立？
4. **`availability` 未來要動態計算嗎？** 如果要，需要另一張 `bookings` 或 `inventory_blocks` 表來追蹤已售出時段。
5. **多幣別支援？** 目前 `currency` 欄位存在，但計算邏輯要統一在哪一層？
6. **Proof-of-Play 要做防偽驗證嗎？** 裝置端可以自簽 JWT，後端驗證，避免假造 PoP logs。
7. **`notifications` 未來要支援 Email 和 App Push 嗎？** 需確認通知渠道設計。
8. **廣告主之間的 inventory 是否需要隔離？** 即使多個廣告主同時排期同一個版位，schema 需要處理衝突。
9. **RLS 策略：** 廣告主只能看到自己的 campaigns，Admin 可以看全部，Media Owner 只看自己的 inventory_locations —— 這三種 policy 需要在 Supabase 設定。
10. **`campaign_reports` 什麼時候產生？** 即時計算、每小時 Cron、每日 Cron？

---

## 附錄：Supabase Storage 建議 Bucket 結構

```
dooh-media/
  advertisers/
    {advertiser_id}/
      assets/
        {uuid}-{filename}.jpg
        {uuid}-{filename}.mp4
  inventory/
    locations/
      {location_id}/
        {uuid}-photo.jpg
  system/
    default-creative/
      default-loop.mp4
```

---

*文件結束。此 schema 設計為產品討論草稿，正式實作前需經過工程師技術 review。*
