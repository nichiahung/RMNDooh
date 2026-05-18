# Step 14: DOOH Platform — Complete Backend Schema Design

**版本：** v1.0 (14A + 14B + 14C)
**日期：** 2026-05-13
**技術假設：** PostgreSQL / Supabase、Supabase Storage、未來啟用 Row Level Security

> **此文件不含實作代碼，不連接 Supabase，不整合真實 OpenRTB / SSP / DSP。**
> SQL 為草稿示意，供產品討論與技術評估使用。

---

## 背景：兩種播放模式

```
模式 1：CMS 直播（Direct-Sold）
  媒體主在後台排好清單 → 螢幕照單播放
  就像電視台預排節目表

模式 2：Programmatic DOOH
  螢幕播到「競標 Slot」→ 即時向 SSP 發出拍賣
  → DSP 在 300ms 內回應出價 → 得標者的廣告播出
  → 沒人出價 / 超時 / 素材不合規 → 播 Fallback
```

**一個 5 分鐘的 Loop 可能長這樣：**
```
[Slot 1 直買-品牌A 10s][Slot 2 House內容 10s][Slot 3 競標 10s]
[Slot 4 直買-品牌B 10s][Slot 5 競標 10s]...[Slot 30 House 10s]
播完 30 格，回到 Slot 1，無限循環
```

---

## Entity Relationship 總覽

```
users ──┬── advertiser_members ──► advertisers
        │                              │
        │                         campaigns
        │                              ├── campaign_inventory_items ──► inventory_locations
        │                              │                                       └── screens
        │                              │                                             ├── loop_templates
        │                              │                                             │     └── loop_slots
        │                              │                                             │           ├─[direct] creative_assets
        │                              │                                             │           └─[prog] programmatic_slots
        │                              │                                             │                   ├── ad_opportunities
        │                              │                                             │                   │     └── ad_decisions
        │                              │                                             │                   └── pacing_rules
        │                              │                                             └── proof_of_play_logs
        │                              ├── creative_assets ──► media_assets
        │                              │     ├── creative_approval_logs
        │                              │     └── creative_eligibility_checks ◄── creative_approval_rules
        │                              └── campaign_reports
        ├── notifications
        └── audit_logs

ssp_connections (全域)
creative_approval_rules (全域)
```

---

# Step 14A: Core DOOH Backend Schema

---

## A-1. `users`

**用途：** 所有登入帳號，包含廣告主人員和平台管理員。每個人都有一筆。

**對應模組：** 登入系統 / Admin Dashboard / 通知系統

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'advertiser_user',
  -- 'super_admin'     = 平台管理員（可看全部資料）
  -- 'advertiser_user' = 一般廣告主帳號
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_sign_in_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `email`（unique）、`role`
**MVP：** 直接使用，登入整合 Supabase Auth
**生產：** 加入 MFA、OAuth（Google / LINE）、session 管理

---

## A-2. `advertisers`

**用途：** 購買廣告的公司或品牌。一個廣告主帳號下可有多位使用者。

**對應模組：** Campaign Planner / Admin Dashboard

```sql
CREATE TABLE advertisers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  -- URL 友善識別碼，如 "coca-cola-tw"
  logo_url      TEXT,
  contact_email TEXT NOT NULL,
  billing_email TEXT,
  address       TEXT,
  country       TEXT NOT NULL DEFAULT 'TW',
  currency      TEXT NOT NULL DEFAULT 'TWD',
  status        TEXT NOT NULL DEFAULT 'active',
  -- 'active' | 'suspended' | 'pending_verification'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `slug`（unique）、`status`

---

## A-3. `advertiser_members`

**用途：** 管理「誰屬於哪個廣告主帳號」以及在帳號內的角色。

**對應模組：** 廣告主帳號管理 / RLS 授權

```sql
CREATE TABLE advertiser_members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id      UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role               TEXT NOT NULL DEFAULT 'member',
  -- 'owner' | 'admin' | 'member' | 'viewer'
  invited_by_user_id UUID REFERENCES users(id),
  invited_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at        TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'active',
  -- 'pending' | 'active' | 'removed'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(advertiser_id, user_id)
);
```

**索引：** `user_id`、`advertiser_id`、`(advertiser_id, user_id)`（unique）
**MVP：** 可先只支援單一使用者，多成員管理後期加入
**生產：** 是 RLS 的核心判斷依據

---

## A-4. `campaigns`

**用途：** 廣告主建立的廣告活動，是平台最核心的業務實體。

**對應模組：** Campaign Planner / Admin CMS / Reporting

```sql
CREATE TABLE campaigns (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id            UUID NOT NULL REFERENCES advertisers(id),
  created_by_user_id       UUID NOT NULL REFERENCES users(id),
  name                     TEXT NOT NULL,
  objective                TEXT NOT NULL,
  -- 'awareness' | 'store_visits' | 'product_launch' | 'event_promotion'
  status                   TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'pending_review' | 'approved' | 'rejected'
  -- | 'scheduled' | 'live' | 'completed' | 'cancelled'
  buying_type              TEXT NOT NULL DEFAULT 'direct',
  -- 'direct'       = 傳統直買，指定版位 + 天數
  -- 'programmatic' = 即時競標，透過 DSP 購買
  start_date               DATE,
  end_date                 DATE,
  campaign_days            INT NOT NULL DEFAULT 7,
  total_budget             NUMERIC(12, 2),
  currency                 TEXT NOT NULL DEFAULT 'TWD',
  estimated_impressions    BIGINT,
  -- Programmatic 專用欄位
  programmatic_budget_daily NUMERIC(10, 2),
  -- 每日程式化預算上限
  target_cpm               NUMERIC(8, 2),
  -- 廣告主願意出的目標 CPM
  frequency_cap_per_hour   INT,
  -- 同螢幕每小時最多播幾次
  submitted_at             TIMESTAMPTZ,
  reviewed_by_user_id      UUID REFERENCES users(id),
  reviewed_at              TIMESTAMPTZ,
  approval_notes           TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `advertiser_id`、`status`、`(advertiser_id, status)`、`submitted_at`

**Campaign 狀態流程：**
```
draft → pending_review → approved → scheduled → live → completed
                      ↘ rejected  (廣告主修改後可重新送出)
```

---

## A-5. `campaign_inventory_items`

**用途：** Media Plan 中選了哪些版位、各刊播幾天、定價快照。

**對應模組：** Campaign Planner / Media Plan Summary / Admin CMS

```sql
CREATE TABLE campaign_inventory_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  inventory_location_id UUID NOT NULL REFERENCES inventory_locations(id),
  days                  INT NOT NULL DEFAULT 7,
  start_date            DATE,
  -- 可選：單一版位子走期；未設定時使用 campaigns.start_date
  end_date              DATE,
  -- 可選：單一版位子走期；未設定時使用 campaigns.end_date
  price_per_day         NUMERIC(10, 2) NOT NULL,
  -- 下單時的定價快照（不隨版位調價而變動）
  daily_impressions     BIGINT NOT NULL,
  -- 下單時的曝光快照
  total_price           NUMERIC(12, 2) GENERATED ALWAYS AS (price_per_day * days) STORED,
  total_impressions     BIGINT GENERATED ALWAYS AS (daily_impressions * days) STORED,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, inventory_location_id)
);
```

**索引：** `campaign_id`、`inventory_location_id`
**備注：** 價格快照是設計關鍵：廣告主送出後定價鎖定，即使媒體主後來調漲，這筆訂單依然照原價計算。

---

## A-6. `inventory_locations`

**用途：** 平台上所有可刊播的 DOOH 廣告版位（地點層級）。

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
  -- 'mall' | 'subway' | 'highway' | 'street' | 'airport'
  -- | 'night_market' | 'office_building' | 'station'
  screen_type          TEXT NOT NULL,
  -- 'billboard' | 'transit' | 'street_furniture' | 'indoor'
  -- | 'kiosk' | 'mega_screen'
  daily_impressions    BIGINT NOT NULL DEFAULT 0,
  cpm                  NUMERIC(8, 2) NOT NULL DEFAULT 0,
  price_per_day        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  availability         NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
  -- 0.00~1.00 (1.0=充足, 0.3~0.7=有限, <0.3=緊張)
  audience_tags        TEXT[] NOT NULL DEFAULT '{}',
  image_url            TEXT,
  description          TEXT,
  operating_hours      TEXT,
  minimum_booking_days INT NOT NULL DEFAULT 7,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  owner_user_id        UUID REFERENCES users(id),
  -- 未來：媒體主自己管理的版位
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_loc_district    ON inventory_locations(district);
CREATE INDEX idx_inv_loc_venue_type  ON inventory_locations(venue_type);
CREATE INDEX idx_inv_loc_is_active   ON inventory_locations(is_active);
-- 地理索引（需啟用 PostGIS）：
-- CREATE INDEX idx_inv_loc_geo ON inventory_locations
--   USING GIST(ST_MakePoint(longitude, latitude));
```

---

## A-7. `screens`

**用途：** 每個版位的實際播出裝置。一個版位可能有多台螢幕。

**對應模組：** Web Player / Admin CMS 螢幕管理 / Programmatic 競標

```sql
CREATE TABLE screens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_code           TEXT NOT NULL UNIQUE,
  -- 人類可讀識別碼，如 'SCR-1000'
  screen_name           TEXT NOT NULL,
  inventory_location_id UUID NOT NULL REFERENCES inventory_locations(id),
  loop_template_id      UUID REFERENCES loop_templates(id),
  -- 此螢幕使用的播放循環模板
  status                TEXT NOT NULL DEFAULT 'offline',
  -- 'online' | 'offline' | 'maintenance'
  orientation           TEXT NOT NULL DEFAULT 'landscape',
  -- 'landscape' | 'portrait'
  resolution            TEXT NOT NULL DEFAULT '1920x1080',
  programmatic_enabled  BOOLEAN NOT NULL DEFAULT false,
  -- 是否開放 Programmatic 競標
  ssp_screen_id         TEXT,
  -- 此螢幕在 SSP 平台上的識別碼
  default_fallback_asset_id UUID REFERENCES media_assets(id),
  -- 無廣告時播放的預設素材（house content）
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

**索引：** `screen_code`（unique）、`status`、`inventory_location_id`

---

## A-8. `media_assets`

**用途：** 實際上傳到 Supabase Storage 的原始檔案記錄（素材倉庫）。

**對應模組：** Creative Upload / Admin CMS / Programmatic 外部素材

```sql
CREATE TABLE media_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id       UUID NOT NULL REFERENCES advertisers(id),
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
  original_filename   TEXT NOT NULL,
  storage_path        TEXT NOT NULL UNIQUE,
  -- Supabase Storage 路徑
  public_url          TEXT NOT NULL,
  file_type           TEXT NOT NULL,
  -- 'image' | 'video'
  mime_type           TEXT NOT NULL,
  file_size_bytes     BIGINT NOT NULL,
  duration_seconds    INT,
  -- 影片才有
  width_px            INT,
  height_px           INT,
  status              TEXT NOT NULL DEFAULT 'uploading',
  -- 'uploading' | 'ready' | 'failed' | 'deleted'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `advertiser_id`、`status`
**備注：** 同一個檔案可被多個 `creative_assets` 引用，避免重複上傳。

---

## A-9. `creative_assets`

**用途：** 廣告素材與 Campaign 的綁定記錄，包含審核狀態和 Programmatic 播出資格。

**對應模組：** Campaign Planner / Admin CMS 審查 / Web Player / Programmatic 競標

```sql
CREATE TABLE creative_assets (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id               UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  -- null = 外部 Programmatic 廣告（非平台 campaign）
  media_asset_id            UUID REFERENCES media_assets(id),
  -- null = 外部 DSP 素材（只有 external_creative_url）
  name                      TEXT NOT NULL,

  -- 素材來源（新增）
  source                    TEXT NOT NULL DEFAULT 'platform',
  -- 'platform'   = 廣告主透過平台上傳
  -- 'programmatic_external' = 外部 DSP 即時帶入

  -- 廣告主識別（新增，Programmatic 場景需要）
  advertiser_name           TEXT,
  -- 廣告主公司名稱（Programmatic 外部廣告會帶入）
  brand_name                TEXT,
  -- 品牌名稱（如「可口可樂」）

  -- Programmatic 來源識別（新增）
  ssp_name                  TEXT,
  -- 這支廣告透過哪個 SSP 來的，如 'Hivestack'
  dsp_name                  TEXT,
  -- 這支廣告從哪個 DSP 出價，如 'The Trade Desk'
  deal_id                   TEXT,
  -- Private Marketplace Deal ID（如有）
  external_creative_url     TEXT,
  -- 外部 DSP 素材 URL（VAST / 圖片直連）

  -- 審核欄位（更新）
  approval_status           TEXT NOT NULL DEFAULT 'pending_review',
  -- 'pending_review' | 'approved' | 'rejected' | 'flagged'
  approval_scope            TEXT NOT NULL DEFAULT 'platform',
  -- 'platform'     = 平台 Admin 審核
  -- 'screen'       = 需逐螢幕 / 逐媒體主審核
  -- 'auto'         = 符合規則自動通過
  reviewed_by               UUID REFERENCES users(id),
  -- 審核人員的 user_id（人工審核才有）
  reviewed_at               TIMESTAMPTZ,
  rejection_reason          TEXT,
  -- 拒絕原因（'rejection' 時才有）

  -- Programmatic 播出資格（新增）
  is_programmatic_eligible  BOOLEAN NOT NULL DEFAULT false,
  -- 是否可在 Programmatic 槽位播出
  -- 只有通過 creative_eligibility_checks 才設為 true
  content_rating            TEXT NOT NULL DEFAULT 'general',
  -- 'general' | 'pg13' | 'adult'

  -- 有效期限（新增）
  expires_at                TIMESTAMPTZ,
  -- 審核通過的有效期限，過期需重審

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `campaign_id`、`approval_status`、`is_programmatic_eligible`、`source`
**備注：** `source = 'programmatic_external'` 的素材可能沒有 `campaign_id` 和 `media_asset_id`，直接用 `external_creative_url` 播出。

---

## A-10. `playlists`

**用途：** 一台螢幕在某時段的播放規則，決定播什麼內容、什麼時候播。

**對應模組：** Web Player / Admin CMS / 排程系統

```sql
CREATE TABLE playlists (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id             UUID NOT NULL REFERENCES screens(id),
  campaign_id           UUID REFERENCES campaigns(id),
  -- null = 預設（default）播放清單，非特定 campaign
  name                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'active' | 'inactive' | 'expired'
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  start_time            TIME,
  -- null = 全天候
  end_time              TIME,
  loop_duration_seconds INT NOT NULL DEFAULT 60,
  -- 整個 loop 的秒數（通常由 loop_template 決定）
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `screen_id`、`status`、`(screen_id, status)`

---

## A-11. `playlist_items`

**用途：** 播放清單中的每一個插槽，現在可以是直買、House 或 Programmatic 三種類型。

**對應模組：** Web Player / Admin CMS

```sql
CREATE TABLE playlist_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id          UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  loop_slot_id         UUID REFERENCES loop_slots(id),
  -- 對應 Loop Template 的哪個 Slot（可為 null 表示自由排程）
  position             INT NOT NULL,
  slot_type            TEXT NOT NULL DEFAULT 'direct_sold',
  -- 'direct_sold'   = 固定播指定素材
  -- 'house_content' = 媒體主預設內容
  -- 'programmatic'  = 即時競標，播出前才決定內容
  creative_asset_id    UUID REFERENCES creative_assets(id),
  -- 'direct_sold' / 'house_content' 才有值；'programmatic' 為 null
  programmatic_slot_id UUID REFERENCES programmatic_slots(id),
  -- 'programmatic' 才有值
  duration_seconds     INT NOT NULL DEFAULT 10,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, position)
);
```

**索引：** `playlist_id`、`slot_type`

---

## A-12. `proof_of_play_logs`

**用途：** 每一次播出的佐證記錄。是 Reporting 的原始資料來源，永不修改。

**對應模組：** Web Player / Proof-of-Play / Reporting Dashboard

```sql
CREATE TABLE proof_of_play_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 螢幕資訊
  screen_id         UUID REFERENCES screens(id),
  screen_code       TEXT NOT NULL,
  -- Denormalized：即使螢幕被刪除也保有紀錄
  -- Campaign / Creative 資訊
  campaign_id       UUID REFERENCES campaigns(id),
  creative_asset_id UUID REFERENCES creative_assets(id),
  playlist_item_id  UUID REFERENCES playlist_items(id),
  creative_name     TEXT NOT NULL,
  -- Denormalized 快照
  creative_type     TEXT NOT NULL,
  -- 'image/jpeg' | 'video/mp4' 等
  -- 播放類型（新增）
  playback_type     TEXT NOT NULL DEFAULT 'direct',
  -- 'direct'       = CMS 直播
  -- 'house'        = House content
  -- 'programmatic' = 競標得標播出
  -- 'fallback'     = Fallback 內容（競標失敗）
  -- Programmatic 相關（新增）
  ad_decision_id    UUID REFERENCES ad_decisions(id),
  -- 如果是 programmatic 播出，對應的競標決定
  winning_bid_cpm   NUMERIC(8, 2),
  -- 得標 CPM（denormalized）
  loop_slot_position INT,
  -- 在這一輪 Loop 的第幾個 Slot
  fallback_reason   TEXT,
  -- 'no_bid' | 'timeout' | 'invalid_creative'
  -- | 'unapproved_creative' | 'pacing_limit' | 'preload_failure'
  -- 播放結果
  playback_status   TEXT NOT NULL,
  -- 'started' | 'completed' | 'failed' | 'skipped'
  duration_seconds  INT NOT NULL,
  played_at         TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pop_campaign_id    ON proof_of_play_logs(campaign_id);
CREATE INDEX idx_pop_screen_id      ON proof_of_play_logs(screen_id);
CREATE INDEX idx_pop_played_at      ON proof_of_play_logs(played_at);
CREATE INDEX idx_pop_status         ON proof_of_play_logs(playback_status);
CREATE INDEX idx_pop_playback_type  ON proof_of_play_logs(playback_type);
```

**備注：** 高寫入量表。未來需按月 Table Partitioning，或定期歸檔舊資料。

---

## A-13. `campaign_reports`

**用途：** 從 `proof_of_play_logs` 彙整的每日 Campaign 報表快取，避免每次查詢重新掃描所有 log。

**對應模組：** Reporting Dashboard

```sql
CREATE TABLE campaign_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID NOT NULL REFERENCES campaigns(id),
  report_date           DATE NOT NULL,
  -- 每 campaign 每天一筆彙整
  total_plays           INT NOT NULL DEFAULT 0,
  completed_plays       INT NOT NULL DEFAULT 0,
  failed_plays          INT NOT NULL DEFAULT 0,
  skipped_plays         INT NOT NULL DEFAULT 0,
  -- 播放類型分類（新增）
  direct_plays          INT NOT NULL DEFAULT 0,
  programmatic_plays    INT NOT NULL DEFAULT 0,
  house_plays           INT NOT NULL DEFAULT 0,
  fallback_plays        INT NOT NULL DEFAULT 0,
  -- 成效指標
  estimated_impressions BIGINT NOT NULL DEFAULT 0,
  fill_rate             NUMERIC(5, 4),
  -- programmatic_plays / (programmatic_plays + fallback_plays)
  avg_winning_cpm       NUMERIC(8, 2),
  -- Programmatic 平均得標 CPM
  budget_spent          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  revenue_gross         NUMERIC(12, 2),
  -- 稅前總收益（媒體主角度）
  revenue_net           NUMERIC(12, 2),
  -- 扣除 SSP revenue share 後的淨收益
  avg_cpm               NUMERIC(8, 2),
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, report_date)
);
```

**索引：** `campaign_id`、`report_date`、`(campaign_id, report_date)`（unique）
**備注：** 由每日 Cron Job 自動彙整 PoP logs 寫入，Dashboard 直接查此表，速度快。

---

## A-14. `notifications`

**用途：** 系統推播給特定使用者的通知。

**對應模組：** Campaign Planner / Admin CMS / 通知中心

```sql
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  -- 'campaign_approved' | 'campaign_rejected' | 'creative_approved'
  -- | 'creative_rejected' | 'campaign_live' | 'campaign_completed'
  -- | 'campaign_submitted' | 'system_notice'
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  link       TEXT,
  -- App 內深層連結
  is_read    BOOLEAN NOT NULL DEFAULT false,
  read_at    TIMESTAMPTZ,
  metadata   JSONB,
  -- 彈性附加資料，如 { "campaign_id": "..." }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;
-- Partial index：只索引未讀，查詢更快
```

---

## A-15. `audit_logs`

**用途：** 所有重要系統操作的不可修改歷史，供安全稽核和問題追蹤。

**對應模組：** Admin CMS / 系統稽核

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  -- null = 系統自動觸發
  action        TEXT NOT NULL,
  -- 格式：'{resource}.{verb}'
  -- 如 'campaign.approved' | 'creative.rejected' | 'screen.status_changed'
  resource_type TEXT NOT NULL,
  -- 'campaign' | 'creative_asset' | 'screen' | 'user'
  resource_id   UUID NOT NULL,
  old_value     JSONB,
  -- 操作前的狀態快照
  new_value     JSONB,
  -- 操作後的狀態快照
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  -- 永不修改，只能新增
);

CREATE INDEX idx_audit_actor      ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_resource   ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action     ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
```

---

# Step 14B: Programmatic DOOH Loop / Slot / Ad Decision Schema

---

## 核心概念圖解

```
5 分鐘 Loop（300 秒，30 個 Slot）：
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ S1  │ S2  │ S3  │ S4  │ S5  │ ... │ S29 │ S30 │
│直買 │House│競標 │直買 │競標 │     │競標 │House│
│10s  │10s  │10s  │10s  │10s  │     │10s  │10s  │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
                  ↑
      S3 播出前 300ms：
      Player → SSP: "我這個槽位要拍賣"
      SSP → DSP: 廣播競標請求
      DSP → SSP: 出價回應（需在 300ms 內）
      SSP → Player: 誰得標、要播哪支廣告
      Player: 播出 / Fallback
```

---

## B-1. `loop_templates`

**用途：** 定義螢幕播放循環的抽象模板（幾分鐘一個 loop、幾個 slot）。

**對應模組：** Admin CMS / Player Engine

```sql
CREATE TABLE loop_templates (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  -- 如 '5-min Standard Loop' | '2-min Elevator Loop'
  description               TEXT,
  loop_duration_sec         INT NOT NULL,
  -- 一個 loop 的總秒數，如 300（5分鐘）
  total_slots               INT NOT NULL,
  -- loop 內的 slot 總數，如 30
  default_slot_duration_sec INT NOT NULL DEFAULT 10,
  -- 預設每個 slot 的秒數
  applicable_screen_types   TEXT[] NOT NULL DEFAULT '{}',
  -- 適用的螢幕類型，空陣列 = 全部適用
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id        UUID REFERENCES users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `is_active`
**MVP：** 可預設一個 template（如 5 分鐘 30 個 slot），不需要 UI 讓 Admin 自建
**生產：** Admin 可依不同螢幕類型設計不同 loop 結構

---

## B-2. `loop_slots`

**用途：** Loop Template 內每一個 Slot 的定義：位置、類型、時長、底價。

**對應模組：** Admin CMS / SSP 配置 / Player Engine

```sql
CREATE TABLE loop_slots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  position         INT NOT NULL,
  -- 播放順序，1 開始
  label            TEXT,
  -- 如 'Slot 3 - Prime Position'
  duration_sec     INT NOT NULL DEFAULT 10,
  slot_type        TEXT NOT NULL DEFAULT 'programmatic',
  -- 'direct_sold'   = 預售給特定廣告主
  -- 'house_content' = 媒體主自家內容
  -- 'programmatic'  = 即時競標
  is_premium       BOOLEAN NOT NULL DEFAULT false,
  -- Premium slot 可設較高底價
  floor_price_cpm  NUMERIC(8, 2),
  -- Programmatic slot 最低得標 CPM（底價）
  -- 出價低於此不得標，改播 fallback
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(loop_template_id, position)
);
```

**索引：** `loop_template_id`、`slot_type`

---

## B-3. `programmatic_slots`

**用途：** 特定螢幕上 Programmatic Slot 的即時競標配置，是 Loop Slot 的「執行層」。

**對應模組：** Player Engine / SSP 整合 / 競標引擎

```sql
CREATE TABLE programmatic_slots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id         UUID NOT NULL REFERENCES screens(id),
  loop_slot_id      UUID NOT NULL REFERENCES loop_slots(id),
  -- 螢幕層級可覆蓋 loop_slot 的底價
  floor_price_cpm   NUMERIC(8, 2),
  timeout_ms        INT NOT NULL DEFAULT 300,
  -- 競標超時（毫秒）。業界標準 100-300ms
  targeting_params  JSONB,
  -- 傳給 SSP 的定向參數
  -- 如 { "geo": "Taipei", "venue": "mall", "audience": "Professionals" }
  fallback_asset_id UUID REFERENCES media_assets(id),
  -- 此 slot 的專屬 fallback（覆蓋螢幕全域 fallback）
  ssp_tag           TEXT,
  -- SSP 提供的廣告標籤或 Deal ID
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(screen_id, loop_slot_id)
);
```

**索引：** `screen_id`、`(screen_id, loop_slot_id)`（unique）

---

## B-4. `ad_opportunities`

**用途：** 每次 Programmatic Slot 即將播出時，Player 向 SSP 發出的競標請求記錄。是 Programmatic 流程的起點。

**對應模組：** Player Engine / SSP 整合 / Reporting

```sql
CREATE TABLE ad_opportunities (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_slot_id UUID NOT NULL REFERENCES programmatic_slots(id),
  screen_id            UUID NOT NULL REFERENCES screens(id),
  screen_code          TEXT NOT NULL,
  -- Denormalized 快照
  loop_slot_position   INT NOT NULL,
  -- 這次在 Loop 的第幾個 Slot
  opportunity_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  floor_price_cpm      NUMERIC(8, 2),
  -- 當時底價快照
  request_payload      JSONB,
  -- 傳給 SSP 的完整 OpenRTB Bid Request（供除錯）
  status               TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'  = 已送出，等待回應
  -- 'won'      = 有得標廣告
  -- 'no_bid'   = 無人出價
  -- 'timeout'  = 超時無回應
  -- 'error'    = 技術錯誤
  -- 'fallback' = 最終播 fallback
  resolved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_opp_screen_id     ON ad_opportunities(screen_id);
CREATE INDEX idx_ad_opp_status        ON ad_opportunities(status);
CREATE INDEX idx_ad_opp_opportunity_at ON ad_opportunities(opportunity_at);
```

**MVP：** 可先不記錄 `request_payload`（節省儲存）
**生產：** `request_payload` 保留 30 天，供帳務核對和除錯

---

## B-5. `ad_decisions`

**用途：** SSP 回傳的競標結果記錄。每個 `ad_opportunity` 最多一筆。

**對應模組：** Player Engine / SSP 整合 / Billing / Reporting

```sql
CREATE TABLE ad_decisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id        UUID NOT NULL UNIQUE REFERENCES ad_opportunities(id),
  -- 1:1 對應
  campaign_id           UUID REFERENCES campaigns(id),
  -- 平台內部 campaign（外部 DSP 廣告此欄位為 null）
  creative_asset_id     UUID REFERENCES creative_assets(id),
  -- 得標廣告素材（外部廣告則用 external_creative_url）
  external_creative_url TEXT,
  -- 外部 DSP 素材 URL
  winning_dsp_id        TEXT,
  -- 得標 DSP 識別碼
  winning_bid_cpm       NUMERIC(8, 2) NOT NULL,
  -- 得標出價 CPM
  clearing_price_cpm    NUMERIC(8, 2),
  -- 實際成交價（Second-price: 第二高出價 + 0.01）
  currency              TEXT NOT NULL DEFAULT 'USD',
  -- Programmatic 交易通常以 USD 計
  response_time_ms      INT,
  -- 從請求到回應的毫秒數（效能監控）
  response_payload      JSONB,
  -- SSP 完整 Bid Response（供除錯）
  is_playable           BOOLEAN NOT NULL DEFAULT false,
  -- 是否通過 eligibility check，可以播出
  playability_reason    TEXT,
  -- is_playable = false 時的原因
  decided_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_decisions_campaign_id ON ad_decisions(campaign_id);
CREATE INDEX idx_ad_decisions_decided_at  ON ad_decisions(decided_at);
```

---

## B-6. `pacing_rules`

**用途：** 控制 Programmatic Campaign 的預算消耗速度和頻率限制。

**對應模組：** 競標引擎 / Campaign 管理

```sql
CREATE TABLE pacing_rules (
  id                               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id                      UUID NOT NULL UNIQUE REFERENCES campaigns(id),
  -- 一個 campaign 只有一份 pacing rule
  pacing_type                      TEXT NOT NULL DEFAULT 'even',
  -- 'even'         = 平均分配預算到每個時段
  -- 'front_loaded' = 前期加速（確保曝光）
  -- 'asap'         = 盡快消耗（不推薦）
  daily_budget_limit               NUMERIC(10, 2),
  hourly_budget_limit              NUMERIC(10, 2),
  total_budget_limit               NUMERIC(12, 2),
  frequency_cap_per_screen_per_hour INT,
  -- 同一台螢幕每小時最多播幾次
  frequency_cap_per_screen_per_day  INT,
  -- 同一台螢幕每天最多播幾次
  min_interval_sec                 INT,
  -- 同一台螢幕兩次播放的最短間隔秒數
  is_active                        BOOLEAN NOT NULL DEFAULT true,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `campaign_id`（unique）
**MVP：** 先實作 `daily_budget_limit` 和 `frequency_cap_per_screen_per_day`
**生產：** 全部欄位啟用，需搭配 Redis 計數器做即時 pacing

---

## B-7. `ssp_connections`

**用途：** 媒體主與各 SSP 平台的對接配置。可同時接入多個 SSP。

**對應模組：** Admin CMS / SSP 整合 / Player Engine

```sql
CREATE TABLE ssp_connections (
  id                TEXT PRIMARY KEY,
  -- 使用有意義的 slug，如 'hivestack-prod' | 'vistar-test'
  name              TEXT NOT NULL,
  -- 如 'Hivestack' | 'Vistar Media' | 'Place Exchange'
  endpoint_url      TEXT NOT NULL,
  -- OpenRTB Bid Request endpoint URL
  api_key_ref       TEXT,
  -- 指向 Vault / Secrets Manager 的 key 名稱（不存明文）
  protocol          TEXT NOT NULL DEFAULT 'openrtb_2_5',
  -- 'openrtb_2_5' | 'openrtb_3_0' | 'custom'
  timeout_ms        INT NOT NULL DEFAULT 300,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_test_mode      BOOLEAN NOT NULL DEFAULT false,
  -- true = 模擬競標，不真正計費
  supported_formats TEXT[] NOT NULL DEFAULT '{}',
  -- 如 ARRAY['image/jpeg','video/mp4']
  revenue_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  -- 平台從 SSP 收益中的抽成百分比（0~100）
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `is_active`
**重要：** `api_key_ref` 只存 Vault 的 key 名稱，**不存明文 API Key**。生產環境必須搭配 Supabase Vault 或外部 Secret Manager。

---

# Step 14C: Creative Approval & Eligibility Schema

---

## 審核系統設計理念

```
層次 1：平台審核（Platform Approval）
  Admin 審核素材是否符合平台規範
  → creative_assets.approval_status = 'approved'

層次 2：播出資格（Programmatic Eligibility）
  每支素材 × 每台螢幕 = 一筆資格記錄
  → creative_eligibility_checks.is_eligible = true/false
  原因：機場螢幕可能接受酒類廣告，學校附近螢幕不接受

層次 3：自動規則（Auto Rules）
  可配置的規則集，讓部分審核自動化
  → creative_approval_rules
```

---

## C-1. `creative_approval_rules`

**用途：** 定義素材審核的標準規則，讓審核流程可配置、可擴展，部分情況可自動審核。

**對應模組：** Admin CMS / 自動審核 Bot

```sql
CREATE TABLE creative_approval_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  -- 如 'Max File Size 100MB' | 'No Adult Content'
  description TEXT,
  rule_type   TEXT NOT NULL,
  -- 'file_format'    = 檔案格式限制
  -- 'file_size'      = 檔案大小限制
  -- 'duration'       = 影片時長限制
  -- 'resolution'     = 解析度要求
  -- 'aspect_ratio'   = 畫面比例限制
  -- 'content_rating' = 內容分級限制
  -- 'keyword_block'  = 禁用關鍵字（廣告文案）
  -- 'advertiser_block' = 禁止特定廣告主或品牌
  rule_params JSONB NOT NULL,
  -- 彈性參數，不同 rule_type 有不同結構：
  -- file_format:    { "allowed": ["image/jpeg","image/png","video/mp4"] }
  -- file_size:      { "max_mb": 100 }
  -- duration:       { "max_sec": 30 }
  -- resolution:     { "min_width": 1280, "min_height": 720 }
  -- content_rating: { "max_rating": "general" }
  -- keyword_block:  { "keywords": ["gambling","guns"] }
  applies_to  TEXT NOT NULL DEFAULT 'all',
  -- 'all'           = 所有素材
  -- 'programmatic'  = 只有 Programmatic 外部素材
  -- 'platform'      = 只有平台上傳素材
  severity    TEXT NOT NULL DEFAULT 'blocking',
  -- 'blocking' = 不通過就不能播
  -- 'warning'  = 警示但不擋播
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `rule_type`、`is_active`、`applies_to`
**MVP：** 先設定幾條基礎規則（格式、大小、時長），不做 keyword_block
**生產：** 全部規則啟用，搭配 AI 內容審核（如 Google Vision API）

---

## C-2. `creative_approval_logs`

**用途：** 每筆素材的完整審核歷史。人工審核和自動審核都記錄，永不修改。

**對應模組：** Admin CMS 素材審查 / 自動審核 Bot / 稽核

```sql
CREATE TABLE creative_approval_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_asset_id UUID NOT NULL REFERENCES creative_assets(id),
  reviewer_type     TEXT NOT NULL,
  -- 'human'  = Admin 人工審核
  -- 'auto'   = 自動規則審核
  -- 'system' = 系統觸發（如 SSP 回報不合規）
  reviewer_user_id  UUID REFERENCES users(id),
  -- 人工審核才有值
  previous_status   TEXT NOT NULL,
  -- 審核前的 approval_status
  new_status        TEXT NOT NULL,
  -- 審核後的 approval_status
  decision          TEXT NOT NULL,
  -- 'approved' | 'rejected' | 'flagged' | 'needs_revision'
  notes             TEXT,
  -- 審核備注或拒絕理由
  rules_checked     JSONB,
  -- 自動審核時的規則檢查結果：
  -- [{ "rule_id": "...", "rule_name": "...", "passed": true/false,
  --    "detail": "File size 120MB exceeds limit 100MB" }]
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_logs_creative    ON creative_approval_logs(creative_asset_id);
CREATE INDEX idx_approval_logs_decision    ON creative_approval_logs(decision);
CREATE INDEX idx_approval_logs_created_at  ON creative_approval_logs(created_at);
```

**備注：** `rules_checked` 讓廣告主和 Admin 清楚看到「哪條規則不通過、原因是什麼」。

---

## C-3. `creative_eligibility_checks`

**用途：** 特定素材在特定螢幕上的播出資格。同一支素材在不同螢幕可能有不同資格。

**對應模組：** Player Engine / Programmatic 競標引擎 / Admin CMS

```sql
CREATE TABLE creative_eligibility_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_asset_id UUID NOT NULL REFERENCES creative_assets(id),
  screen_id         UUID NOT NULL REFERENCES screens(id),
  is_eligible       BOOLEAN NOT NULL,
  -- 是否可在此螢幕播出
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 此筆資格的檢查時間（需定期重新檢查）
  eligibility_rules JSONB NOT NULL,
  -- 每條規則的通過情況：
  -- [{ "rule_id": "...", "rule_name": "content_rating",
  --    "passed": false, "detail": "Screen requires 'general', creative is 'pg13'" }]
  failure_reasons   TEXT[],
  -- 不合格原因清單（方便查詢）
  expires_at        TIMESTAMPTZ,
  -- 資格有效期限（過期需重新檢查）
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(creative_asset_id, screen_id)
);

CREATE INDEX idx_eligibility_creative  ON creative_eligibility_checks(creative_asset_id);
CREATE INDEX idx_eligibility_screen    ON creative_eligibility_checks(screen_id);
CREATE INDEX idx_eligibility_eligible  ON creative_eligibility_checks(is_eligible);
CREATE INDEX idx_eligibility_checked   ON creative_eligibility_checks(checked_at);
```

**備注：** 競標引擎在 `ad_decision` 建立後，必須查此表確認 `is_eligible = true`，才能設定 `ad_decisions.is_playable = true`。資格檢查應做 Redis 快取（TTL 15 分鐘），避免每次競標都打 DB。

---

# 附錄 1：更新後的 Player 執行流程

### 傳統 CMS 播放

```
1. Player 啟動 / 定期同步
   → 向後端拉取此螢幕的 active playlists
   → 按 start_date / end_date 選出目前有效的 playlist
   → 下載 playlist_items（按 position 排序）

2. 循環播放
   → 依序播 direct_sold / house_content 的 items
   → 播完一輪 → 從頭開始
   → 每 10 秒 heartbeat → 更新 screens.last_heartbeat_at
   → 播完一個 item → 寫入 proof_of_play_log（playback_type = 'direct'）
```

### Programmatic 播放（新增）

```
1. Player 執行到 slot_type = 'programmatic' 的 PlaylistItem
   ↓
2. 查詢 programmatic_slots 配置
   （floor_price, timeout_ms, targeting_params, fallback_asset_id）
   ↓
3. 建立 ad_opportunity（status = 'pending'）
   ↓
4. 向 SSP 發出 Bid Request（含螢幕資訊、定向、底價）
   ↓
5a. [收到出價，在 timeout 內]
    → 建立 ad_decision（winning_bid_cpm, creative 資訊）
    → 查 creative_eligibility_checks
        is_eligible = true  → 預加載素材 → 播出
                              PoP log（playback_type = 'programmatic'）
        is_eligible = false → 播 Fallback
                              PoP log（playback_type = 'fallback',
                                       fallback_reason = 'unapproved_creative'）

5b. [超時 / 無人出價 / SSP 錯誤 / 預加載失敗]
    → 更新 opportunity.status（timeout / no_bid / error）
    → 播 Fallback
      PoP log（playback_type = 'fallback', fallback_reason = 原因）
   ↓
6. 繼續下一個 Slot
```

---

# 附錄 2：Programmatic Slot 狀態機

```
         [Slot 即將播出]
               ↓
          'available'
               ↓ Player 建立 ad_opportunity
          'requesting'
               ↓
    ┌──────────┴──────────┐
    ↓                     ↓
有出價（won）          超時/無出價/錯誤
    ↓                     ↓
'decided'            更新 opportunity.status
    ↓                     ↓
eligibility check    'fallback'（播 fallback）
    ↓         ↓
  通過       未通過
    ↓         ↓
'playing'  'fallback'
    ↓
 'logged'（PoP 寫入）
```

---

# 附錄 3：素材審核狀態機

```
[廣告主上傳 / DSP 帶入素材]
         ↓
   'pending_review'
         ↓
  ┌──────┴──────────────┐
  ↓                     ↓
人工審核              自動規則審核
（Admin 操作）      （符合所有 rules?）
  ↓                  ↓       ↓
  ↓                 Yes      No
  ↓                  ↓       ↓
approved ──────→ 'approved'  'rejected'
                     ↓
         creative_eligibility_checks
         （逐螢幕檢查播出資格）
                     ↓
          is_programmatic_eligible
               = true / false
```

| 狀態 | 說明 |
|------|------|
| `pending_review` | 剛上傳，等待審核 |
| `approved` | 平台審核通過（但不代表每台螢幕都能播） |
| `rejected` | 審核未通過，不可播出 |
| `flagged` | 有疑慮，需人工複查 |

**重要：** `approval_status = 'approved'` 只是「平台層級通過」，能不能在特定螢幕的 Programmatic 槽位播出，還要看 `creative_eligibility_checks.is_eligible`。

---

# 附錄 4：Fallback 策略

**目的：** 確保螢幕永遠有東西播，不出現黑屏。

### Fallback 優先順序（由高到低）

```
優先 1：programmatic_slots.fallback_asset_id
  → 此 Programmatic Slot 的專屬 Fallback

優先 2：就近的 house_content playlist_item
  → 插入同一個 Loop 內最近的 house_content

優先 3：screens.default_fallback_asset_id
  → 整台螢幕的全域預設（品牌形象 / 天氣資訊等）
```

### Fallback 觸發條件

| 條件 | `fallback_reason` |
|------|-----------------|
| SSP 無回應超過 timeout | `timeout` |
| SSP 回傳但無人出價 | `no_bid` |
| 得標素材格式有誤 | `invalid_creative` |
| 得標素材未通過 eligibility | `unapproved_creative` |
| 觸發 pacing 上限 | `pacing_limit` |
| SSP 連線錯誤 | `ssp_error` |
| 素材預加載失敗 | `preload_failure` |

---

# 附錄 5：Migration 建議順序

```
Phase 1：基礎實體（無外鍵依賴）
  → users, advertisers, inventory_locations

Phase 2：播放結構
  → loop_templates, loop_slots

Phase 3：螢幕與 SSP 連接
  → screens（含 loop_template_id）
  → ssp_connections

Phase 4：Campaign 層
  → campaigns, advertiser_members
  → campaign_inventory_items
  → media_assets, creative_assets

Phase 5：審核規則
  → creative_approval_rules
  → creative_approval_logs
  → creative_eligibility_checks

Phase 6：播放排程
  → playlists, playlist_items
  → programmatic_slots, pacing_rules

Phase 7：競標記錄
  → ad_opportunities, ad_decisions

Phase 8：日誌與報表
  → proof_of_play_logs（含所有新欄位）
  → campaign_reports
  → notifications, audit_logs
```

---

# 附錄 6：Open Questions

1. **競標協定：** 採 OpenRTB 2.5 還是 3.0？還是先接特定 DOOH SSP 的 proprietary API（如 Hivestack SDK）？
2. **First-price vs Second-price：** 採哪種競標模型？目前業界 DOOH 逐漸走向 First-price。
3. **外部 DSP 素材審核：** 外部 DSP 帶入的素材（`external_creative_url`）如何做安全掃描？避免惡意 URL 或不合規內容。
4. **Deal ID / PMP：** 是否需要支援 Private Marketplace 預訂，讓特定廣告主以固定 CPM 預訂 programmatic 槽位？
5. **跨螢幕頻率控制：** 現在是「每台螢幕」維度。是否需要「同一商場所有螢幕合計不超過 N 次」？
6. **Context Signal 來源：** 天氣、時段、人流密度等即時定向資訊要從哪取得？第三方 API 還是平台自建感測器？
7. **素材預加載：** Player 是否需要在競標成功後提前快取素材？避免播出時才下載導致延遲或黑屏。
8. **Viewability：** DOOH 的「一次有效曝光」如何定義？純粹靠 PoP（播出完成）還是需要結合感測器確認真實觀看人數？
9. **Revenue Share 結算：** SSP revenue share 是自動計算還是月結對帳？需要獨立的 `billing_statements` 表？
10. **Pacing Redis 快取：** 即時 pacing 需要 Redis 計數器（每次播出 incr）。Supabase 目前沒有原生 Redis，需要獨立服務。

---

# 附錄 7：Risks and Tradeoffs

| 風險 | 說明 | 取捨建議 |
|------|------|---------|
| 競標延遲 | Eligibility check 必須在 300ms 內完成 | 用 Redis 快取 eligibility 結果，TTL 15 分鐘 |
| `ad_opportunities` 資料量 | 10 台螢幕 × 30 slot/5min × 16hr = 57,600 筆/天/台 | 按月 Partition，保留 90 天，舊資料歸檔 |
| 外部素材安全 | DSP 的 `external_creative_url` 可能含惡意內容 | 先限制只接受 HTTPS；生產環境加 URL 白名單 + 病毒掃描 |
| Pacing 準確性 | 即時 pacing 要知道「目前花了多少」 | 初期 DB 計算（查 PoP logs 加總）；量大後換 Redis incr |
| Loop 設計複雜度 | 三層結構（Template → Slot → Programmatic Slot）對 Admin 複雜 | 提供預設 Template，Admin 不需從零設計；UI 視覺化 loop 結構 |
| Schema 擴展性 | Programmatic 業界規格快速演進（OpenRTB 更新、新格式） | JSONB 欄位（`request_payload`、`targeting_params`、`rule_params`）保留彈性 |

---

*文件結束。Step 14A + 14B + 14C 完整涵蓋 DOOH 平台從 CMS 直播到 Programmatic 競標的完整 schema 設計。*
