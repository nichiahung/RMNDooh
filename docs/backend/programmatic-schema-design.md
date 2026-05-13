# DOOH Platform — Programmatic Schema Design v0.2

**版本：** v0.2（在 v0.1 schema 基礎上擴充）  
**日期：** 2026-05-13  
**目的：** 擴充資料庫 schema，同時支援傳統 CMS 直播模式與即時 Programmatic DOOH 競標模式。  
**技術假設：** PostgreSQL / Supabase，未來接 SSP/DSP 採 OpenRTB 2.x 協定。

> **此文件不含實作代碼，不連接 Supabase，不整合真實 OpenRTB。**  
> 以下 SQL 為草稿示意，供產品討論與技術評估使用。

---

## 0. 背景：什麼是 Programmatic DOOH？

在理解 schema 設計前，先用淺顯的語言解釋幾個核心概念：

### 傳統 CMS 播放（Direct-Sold）
```
媒體主排好播放清單 → 螢幕照單播放 → 播完一遍再重來
就像電視台排好節目表，時間到了就播
```

### Loop（播放循環）
```
一個 5 分鐘的 Loop，內有 30 個 10 秒的 Slot：
[Slot 1 品牌A][Slot 2 品牌B][Slot 3 House內容][Slot 4 競標][Slot 5 品牌A]...
播完 30 格，回到 Slot 1，不斷循環
```

### Slot 類型
```
direct_sold   → 已預售給特定廣告主，固定播某支廣告
house_content → 媒體主自己的預設內容（品牌形象、天氣、活動資訊）
programmatic  → 即時競標決定播哪一支，可能每次循環都換不同廣告
```

### Programmatic 競標流程
```
Slot 4 即將播出（還剩 500ms）
  → Player 向 SSP 發出競標請求（Ad Opportunity）
  → SSP 向多個 DSP 廣播
  → DSP 在 100ms 內回應出價
  → SSP 選出最高出價者（Ad Decision）
  → Player 播出得標廣告
  → 如果超時 / 沒人出價 / 素材未審核通過 → 播 Fallback 內容
```

### SSP / DSP
```
SSP（Supply-Side Platform）= 媒體主的廣告交易所，賣廣告位
DSP（Demand-Side Platform）= 廣告主的程式化購買工具，買廣告位
```

---

## 1. 更新後的 Entity Relationship 總覽

```
users / advertisers / advertiser_members
  └── campaigns
        ├── campaign_inventory_items → inventory_locations → screens
        │                                                       ├── loop_templates
        │                                                       │     └── loop_slots
        │                                                       │           ├── [direct_sold] → creative_assets
        │                                                       │           ├── [house_content] → media_assets
        │                                                       │           └── [programmatic] → programmatic_slots
        │                                                       │                                   ├── ad_opportunities
        │                                                       │                                   │     └── ad_decisions
        │                                                       │                                   └── pacing_rules
        ├── creative_assets → media_assets
        │     ├── creative_approval_logs
        │     └── creative_eligibility_checks
        └── proof_of_play_logs

ssp_connections (全域設定)
creative_approval_rules (全域規則)
audit_logs / notifications
```

---

## 2. Layer 1：核心 DOOH 後端 Schema

以下為 v0.1 schema 的重要更新，主要是在 `screens`、`playlists`、`playlist_items`、`proof_of_play_logs` 加入 Programmatic 相關欄位。

---

### 表 L1-1：`users` _(無變動)_

與 v0.1 相同，略。

---

### 表 L1-2：`advertisers` _(無變動)_

與 v0.1 相同，略。

---

### 表 L1-3：`campaigns` _(小幅更新)_

**新增欄位：**

```sql
ALTER TABLE campaigns ADD COLUMN
  buying_type TEXT NOT NULL DEFAULT 'direct';
  -- 'direct'       → 傳統直買，廣告主指定版位、時段、天數
  -- 'programmatic' → 程式化購買，透過 DSP 即時競標

ALTER TABLE campaigns ADD COLUMN
  programmatic_budget_daily NUMERIC(10, 2);
  -- 程式化模式下，每日最高消耗預算（pacing 用）

ALTER TABLE campaigns ADD COLUMN
  target_cpm NUMERIC(8, 2);
  -- 程式化模式下，廣告主願意出的目標 CPM

ALTER TABLE campaigns ADD COLUMN
  frequency_cap_per_hour INT;
  -- 同一個螢幕，每小時最多播幾次（頻率控制）
```

**備注：** `buying_type` 決定這個 campaign 的預算消耗邏輯走哪條路。Direct campaign 用固定排程；programmatic campaign 走即時競標。

---

### 表 L1-4：`inventory_locations` _(無變動)_

與 v0.1 相同，略。

---

### 表 L1-5：`screens` _(更新)_

**新增欄位：**

```sql
ALTER TABLE screens ADD COLUMN
  loop_template_id UUID REFERENCES loop_templates(id);
  -- 此螢幕目前使用的 Loop Template

ALTER TABLE screens ADD COLUMN
  programmatic_enabled BOOLEAN NOT NULL DEFAULT false;
  -- 是否開放 Programmatic 競標

ALTER TABLE screens ADD COLUMN
  ssp_screen_id TEXT;
  -- 此螢幕在 SSP 平台上的識別碼（對接 SSP 時使用）

ALTER TABLE screens ADD COLUMN
  default_fallback_asset_id UUID REFERENCES media_assets(id);
  -- 沒有廣告時播放的預設內容（house content）
```

---

### 表 L1-6：`media_assets` _(無變動)_

與 v0.1 相同，略。

---

### 表 L1-7：`creative_assets` _(更新)_

**新增欄位：**

```sql
ALTER TABLE creative_assets ADD COLUMN
  approval_scope TEXT NOT NULL DEFAULT 'platform';
  -- 'platform'     → 平台審核（Admin 審）
  -- 'screen'       → 需逐螢幕 / 逐媒體主審核（Programmatic 場景）
  -- 'auto'         → 自動審核（符合規則即通過）

ALTER TABLE creative_assets ADD COLUMN
  is_programmatic_eligible BOOLEAN NOT NULL DEFAULT false;
  -- 是否通過審核，可在 Programmatic 槽位播出
  -- 只有通過 creative_eligibility_checks 才會設為 true

ALTER TABLE creative_assets ADD COLUMN
  content_rating TEXT NOT NULL DEFAULT 'general';
  -- 'general' | 'pg13' | 'adult'
  -- 用於判斷是否符合特定螢幕的播出規範
```

---

### 表 L1-8 & L1-9：`playlists` / `playlist_items` _(重新設計)_

**原本的 `playlists` 概念偏向「一份排好的清單」。**  
**新設計改為：`playlists` 代表某時段的播放規則，`playlist_items` 代表 Loop 內各 Slot 的內容指定。**

```sql
-- 更新 playlist_items 加入 slot 類型
ALTER TABLE playlist_items ADD COLUMN
  loop_slot_id UUID REFERENCES loop_slots(id);
  -- 對應 Loop Template 的哪個 Slot

ALTER TABLE playlist_items ADD COLUMN
  slot_type TEXT NOT NULL DEFAULT 'direct_sold';
  -- 'direct_sold'    → 固定播這個 creative
  -- 'house_content'  → 播媒體主預設內容
  -- 'programmatic'   → 播放時即時競標，此欄位不存 creative_asset_id

ALTER TABLE playlist_items ADD COLUMN
  programmatic_slot_id UUID REFERENCES programmatic_slots(id);
  -- 如果 slot_type = 'programmatic'，指向 programmatic_slots
  -- creative_asset_id 此時為 null
```

**備注：** 一個 playlist 現在可以混合三種類型的 item。Player 在播放前根據 `slot_type` 決定要直接播 creative 還是要去觸發競標。

---

### 表 L1-10：`proof_of_play_logs` _(更新)_

**新增欄位：**

```sql
ALTER TABLE proof_of_play_logs ADD COLUMN
  playback_type TEXT NOT NULL DEFAULT 'direct';
  -- 'direct'       → CMS 直播
  -- 'house'        → House content
  -- 'programmatic' → 競標得標播出
  -- 'fallback'     → Fallback 內容（競標失敗）

ALTER TABLE proof_of_play_logs ADD COLUMN
  ad_decision_id UUID REFERENCES ad_decisions(id);
  -- 如果是 programmatic 播出，對應的競標決定

ALTER TABLE proof_of_play_logs ADD COLUMN
  winning_bid_cpm NUMERIC(8, 2);
  -- 得標 CPM（denormalized，避免 join）

ALTER TABLE proof_of_play_logs ADD COLUMN
  loop_slot_position INT;
  -- 在這一輪 Loop 的第幾個 Slot（1-based）

ALTER TABLE proof_of_play_logs ADD COLUMN
  fallback_reason TEXT;
  -- 如果是 fallback：'no_bid' | 'timeout' | 'invalid_creative'
  --                 | 'unapproved_creative' | 'pacing_limit'
```

---

### 表 L1-11：`audit_logs` _(無變動)_

與 v0.1 相同，略。

---

## 3. Layer 2：Programmatic 播放 Schema

---

### 表 L2-1：`loop_templates`

**用途：** 定義一個螢幕的播放循環結構（幾分鐘一個 loop、幾個 slot、每個 slot 幾秒）。

**對應模組：** Admin CMS 螢幕管理 / Player Engine / SSP 配置

```sql
CREATE TABLE loop_templates (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  -- 如 '5-min Standard Loop'
  description               TEXT,
  loop_duration_sec         INT NOT NULL,
  -- 整個 loop 的秒數，如 300（5分鐘）
  total_slots               INT NOT NULL,
  -- loop 內的 slot 總數，如 30
  default_slot_duration_sec INT NOT NULL DEFAULT 10,
  -- 每個 slot 預設秒數
  applicable_screen_types   TEXT[] NOT NULL DEFAULT '{}',
  -- 適用的螢幕類型，空陣列 = 全部適用
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id        UUID REFERENCES users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `is_active`  
**備注：** 一個媒體主可能針對不同螢幕類型設計不同的 loop 結構（機場螢幕可能 10 分鐘一個 loop；電梯螢幕可能 2 分鐘一個 loop）。

---

### 表 L2-2：`loop_slots`

**用途：** Loop Template 內的每一個插槽定義，記錄每個 slot 的類型、時長、底價。

**對應模組：** Admin CMS / SSP 配置 / Player Engine

```sql
CREATE TABLE loop_slots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_template_id UUID NOT NULL REFERENCES loop_templates(id) ON DELETE CASCADE,
  position         INT NOT NULL,
  -- 播放順序，從 1 開始
  label            TEXT,
  -- 人類可讀標籤，如 'Slot 3 - Prime Position'
  duration_sec     INT NOT NULL DEFAULT 10,
  slot_type        TEXT NOT NULL DEFAULT 'programmatic',
  -- 'direct_sold'   → 預售給特定廣告主
  -- 'house_content' → 媒體主自家內容
  -- 'programmatic'  → 即時競標
  is_premium       BOOLEAN NOT NULL DEFAULT false,
  -- Premium slot 可設較高底價
  floor_price_cpm  NUMERIC(8, 2),
  -- Programmatic slot 的最低得標 CPM（底價）
  -- 出價低於此不得標，改播 fallback
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(loop_template_id, position)
);
```

**索引：** `loop_template_id`、`slot_type`  
**備注：** 底價（`floor_price_cpm`）是 Programmatic DOOH 的重要商業設定。媒體主設定底價保護版位價值；低於底價的出價直接拒絕，不回傳給 DSP。

---

### 表 L2-3：`programmatic_slots`

**用途：** 記錄特定螢幕上，某個 Programmatic Loop Slot 的即時競標配置和目前狀態。這是 Loop Slot 的「執行層」。

**對應模組：** Player Engine / SSP 整合 / 競標引擎

```sql
CREATE TABLE programmatic_slots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id        UUID NOT NULL REFERENCES screens(id),
  loop_slot_id     UUID NOT NULL REFERENCES loop_slots(id),
  status           TEXT NOT NULL DEFAULT 'available',
  -- 見下方狀態機說明
  floor_price_cpm  NUMERIC(8, 2),
  -- 如果設定，覆蓋 loop_slot 的底價（螢幕層級覆寫）
  timeout_ms       INT NOT NULL DEFAULT 300,
  -- 競標超時時間（毫秒），超過就播 fallback
  -- 業界標準約 100-300ms
  targeting_params JSONB,
  -- 傳給 SSP 的定向參數，如 { "geo": "Taipei", "venue": "mall" }
  fallback_asset_id UUID REFERENCES media_assets(id),
  -- 此 slot 專屬的 fallback 素材（覆蓋螢幕預設 fallback）
  ssp_tag          TEXT,
  -- SSP 提供的廣告標籤或 Deal ID
  last_updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(screen_id, loop_slot_id)
);
```

**索引：** `screen_id`、`status`、`(screen_id, loop_slot_id)`  
**備注：** `targeting_params` 用 JSONB 存彈性定向參數，讓不同螢幕可以傳不同受眾資訊給 SSP（如地區、場域、時段、天氣等情境資訊）。

---

### 表 L2-4：`ad_opportunities`

**用途：** 每次 Programmatic Slot 即將播出時，Player 向 SSP 發出的競標請求記錄。是整個 Programmatic 流程的起點。

**對應模組：** Player Engine / SSP 整合 / Reporting

```sql
CREATE TABLE ad_opportunities (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_slot_id UUID NOT NULL REFERENCES programmatic_slots(id),
  screen_id            UUID NOT NULL REFERENCES screens(id),
  screen_code          TEXT NOT NULL,
  -- Denormalized，保有歷史快照
  loop_slot_position   INT NOT NULL,
  -- 這次是 Loop 的第幾個 Slot
  opportunity_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 競標請求的發出時間
  floor_price_cpm      NUMERIC(8, 2),
  -- 當時的底價快照
  request_payload      JSONB,
  -- 傳給 SSP 的完整請求內容（OpenRTB Bid Request）
  status               TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'    → 已送出，等待回應
  -- 'won'        → 有得標廣告
  -- 'no_bid'     → 無人出價
  -- 'timeout'    → 超時
  -- 'error'      → 技術錯誤
  -- 'fallback'   → 最終播 fallback
  resolved_at          TIMESTAMPTZ,
  -- 競標完成的時間
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
  -- 此表不需 updated_at（log 型資料）
);

CREATE INDEX idx_ad_opp_screen_id ON ad_opportunities(screen_id);
CREATE INDEX idx_ad_opp_status ON ad_opportunities(status);
CREATE INDEX idx_ad_opp_opportunity_at ON ad_opportunities(opportunity_at);
-- 分頁查詢時常用 opportunity_at 排序
```

**備注：** `request_payload` 儲存完整的 OpenRTB Bid Request JSON，供除錯和帳務核對使用。生產環境建議只存必要欄位，避免資料量過大。

---

### 表 L2-5：`ad_decisions`

**用途：** SSP 回傳的競標結果記錄。每個 `ad_opportunity` 最多有一筆 `ad_decision`（沒有出價就沒有這筆記錄）。

**對應模組：** Player Engine / SSP 整合 / Billing / Reporting

```sql
CREATE TABLE ad_decisions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id    UUID NOT NULL UNIQUE REFERENCES ad_opportunities(id),
  -- 1:1 對應，一個 opportunity 只有一個最終決定
  campaign_id       UUID REFERENCES campaigns(id),
  -- Programmatic campaign（可能是外部 DSP 的 campaign，此時為 null）
  creative_asset_id UUID REFERENCES creative_assets(id),
  -- 得標要播的廣告素材（如為外部廣告，可能為 null，改用 external_creative_url）
  external_creative_url TEXT,
  -- 外部 DSP 的廣告素材 URL（VAST / VPAID / 圖片 URL）
  winning_dsp_id    TEXT,
  -- 得標的 DSP 識別碼（對外部 DSP 有意義）
  winning_bid_cpm   NUMERIC(8, 2) NOT NULL,
  -- 得標出價（CPM）
  clearing_price_cpm NUMERIC(8, 2),
  -- 實際成交價（Second-price auction 下可能低於出價）
  currency          TEXT NOT NULL DEFAULT 'USD',
  -- 程式化交易通常以 USD 計
  response_time_ms  INT,
  -- 從請求到回應的時間（毫秒），用於效能監控
  response_payload  JSONB,
  -- SSP 回傳的完整 Bid Response
  is_playable       BOOLEAN NOT NULL DEFAULT false,
  -- 是否已通過 eligibility check，可以播出
  playability_reason TEXT,
  -- 如果 is_playable = false，原因為何
  decided_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_decisions_campaign_id ON ad_decisions(campaign_id);
CREATE INDEX idx_ad_decisions_decided_at ON ad_decisions(decided_at);
```

**備注：** `clearing_price_cpm` vs `winning_bid_cpm` 的差異：
- 一次競標（First-price auction）：成交價 = 出價
- 二次競標（Second-price auction）：成交價 = 第二高出價 + $0.01

目前業界 Programmatic DOOH 主流逐漸走向 First-price，但 schema 兩個欄位都保留。

---

### 表 L2-6：`pacing_rules`

**用途：** 控制 Programmatic Campaign 的預算消耗速度和頻率限制，避免預算在一開始就燒光，或同一位使用者看到太多次同一支廣告。

**對應模組：** 競標引擎 / Campaign 管理

```sql
CREATE TABLE pacing_rules (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id            UUID NOT NULL UNIQUE REFERENCES campaigns(id),
  -- 一個 campaign 只有一份 pacing rule
  pacing_type            TEXT NOT NULL DEFAULT 'even',
  -- 'even'         → 平均分配預算到每個時段
  -- 'front_loaded' → 前期加速消耗，確保曝光
  -- 'asap'         → 盡快消耗（不推薦，容易爆預算）
  daily_budget_limit     NUMERIC(10, 2),
  -- 每日最高消耗（null = 不限制）
  hourly_budget_limit    NUMERIC(10, 2),
  -- 每小時最高消耗
  total_budget_limit     NUMERIC(12, 2),
  -- 整個 campaign 的總預算上限
  frequency_cap_per_screen_per_hour INT,
  -- 同一台螢幕每小時最多播幾次
  frequency_cap_per_screen_per_day  INT,
  -- 同一台螢幕每天最多播幾次
  min_interval_sec       INT,
  -- 同一台螢幕兩次播放的最短間隔秒數
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `campaign_id`（unique）、`is_active`  
**備注：** Pacing 是程式化廣告的核心挑戰之一。如果沒有頻率控制，同一個地點可能連續播 10 次同一支廣告，體驗極差且不符合廣告主預期。MVP 可先實作 `daily_budget_limit` 和 `frequency_cap_per_screen_per_day`，其他規則後期加入。

---

### 表 L2-7：`ssp_connections`

**用途：** 儲存媒體主與各個 SSP 平台的對接配置。一個平台可能同時接入多個 SSP（Hivestack、Vistar、Place Exchange 等）。

**對應模組：** Admin CMS / SSP 整合 / Player Engine

```sql
CREATE TABLE ssp_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  -- 如 'Hivestack SSP' | 'Vistar Media'
  endpoint_url     TEXT NOT NULL,
  -- 競標請求的 API URL（OpenRTB endpoint）
  api_key_secret   TEXT,
  -- 加密存放的 API Key（生產環境應存在 Vault，不存明文）
  protocol         TEXT NOT NULL DEFAULT 'openrtb_2_5',
  -- 'openrtb_2_5' | 'openrtb_3_0' | 'custom'
  timeout_ms       INT NOT NULL DEFAULT 300,
  -- 此 SSP 的全域競標超時設定
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_test_mode     BOOLEAN NOT NULL DEFAULT false,
  -- Test mode = 只跑模擬競標，不真正計費
  supported_formats TEXT[] NOT NULL DEFAULT '{}',
  -- SSP 支援的素材格式，如 ARRAY['image/jpeg','video/mp4']
  revenue_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  -- 平台抽成百分比（Revenue Share），0~100
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `is_active`  
**備注：** `api_key_secret` 在生產環境**不應明文存入資料庫**，應使用 Supabase Vault、AWS Secrets Manager 或 HashiCorp Vault 管理。此欄位只是 schema 預留位置。`revenue_share_pct` 是平台從 SSP 收益中抽取的分潤比例。

---

## 4. Layer 3：素材審核與播出資格 Schema

---

### 表 L3-1：`creative_approval_rules`

**用途：** 定義素材要通過自動審核或上架 Programmatic 槽位必須滿足的條件，讓審核流程可配置、可擴展。

**對應模組：** Admin CMS / 素材審核系統 / 自動審核 Bot

```sql
CREATE TABLE creative_approval_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  rule_type       TEXT NOT NULL,
  -- 'file_format'     → 檔案格式限制
  -- 'file_size'       → 檔案大小限制
  -- 'duration'        → 影片時長限制
  -- 'resolution'      → 解析度限制
  -- 'content_rating'  → 內容分級限制
  -- 'aspect_ratio'    → 畫面比例限制
  -- 'keyword_block'   → 禁用關鍵字（廣告文案）
  rule_params     JSONB NOT NULL,
  -- 彈性規則參數，例如：
  -- { "max_file_size_mb": 100 }
  -- { "allowed_formats": ["image/jpeg", "image/png", "video/mp4"] }
  -- { "max_duration_sec": 30 }
  -- { "min_width": 1280, "min_height": 720 }
  -- { "blocked_keywords": ["gambling", "alcohol"] }
  applies_to      TEXT NOT NULL DEFAULT 'all',
  -- 'all'           → 全部素材都要檢查
  -- 'programmatic'  → 只有 Programmatic 素材才檢查
  -- 'direct'        → 只有直買素材才檢查
  severity        TEXT NOT NULL DEFAULT 'blocking',
  -- 'blocking' → 不通過就不能播
  -- 'warning'  → 警示但不擋播
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**索引：** `rule_type`、`is_active`、`applies_to`  
**備注：** `rule_params` 用 JSONB 讓每種規則的參數結構可以不同，新增規則類型不需要 schema migration。

---

### 表 L3-2：`creative_approval_logs`

**用途：** 記錄每筆素材的審核歷史（人工審核或自動審核都記錄），提供完整稽核軌跡。

**對應模組：** Admin CMS 素材審查 / 自動審核 Bot

```sql
CREATE TABLE creative_approval_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_asset_id UUID NOT NULL REFERENCES creative_assets(id),
  reviewer_type     TEXT NOT NULL,
  -- 'human'  → 人工審核（Admin 操作）
  -- 'auto'   → 自動規則審核
  -- 'system' → 系統觸發（如 SSP 回報不合規）
  reviewer_user_id  UUID REFERENCES users(id),
  -- 人工審核時才有值
  previous_status   TEXT NOT NULL,
  -- 審核前的狀態
  new_status        TEXT NOT NULL,
  -- 審核後的狀態
  decision          TEXT NOT NULL,
  -- 'approved' | 'rejected' | 'flagged' | 'needs_revision'
  notes             TEXT,
  -- 審核備注或拒絕原因
  rules_checked     JSONB,
  -- 自動審核時，哪些規則被檢查了、結果如何
  -- [{ "rule_id": "...", "rule_name": "...", "passed": true/false }]
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  -- 只能新增，不能修改
);

CREATE INDEX idx_approval_logs_creative ON creative_approval_logs(creative_asset_id);
CREATE INDEX idx_approval_logs_decision ON creative_approval_logs(decision);
CREATE INDEX idx_approval_logs_created_at ON creative_approval_logs(created_at);
```

**備注：** `rules_checked` 保存自動審核的完整規則檢查結果，讓廣告主和管理員都能清楚看到哪條規則不通過。

---

### 表 L3-3：`creative_eligibility_checks`

**用途：** 記錄特定素材在特定螢幕上的播出資格檢查結果。同一支素材在不同螢幕可能有不同資格（例如螢幕 A 是室內一般受眾、螢幕 B 是兒童遊樂場，後者不適合某些廣告）。

**對應模組：** Player Engine / Programmatic 競標引擎 / Admin CMS

```sql
CREATE TABLE creative_eligibility_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_asset_id UUID NOT NULL REFERENCES creative_assets(id),
  screen_id         UUID NOT NULL REFERENCES screens(id),
  is_eligible       BOOLEAN NOT NULL,
  -- 是否可以在此螢幕播出
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 上次檢查時間（需定期重新檢查）
  eligibility_rules JSONB NOT NULL,
  -- 每條規則的通過情況
  -- [{ "rule_id": "...", "rule_name": "file_format", "passed": true },
  --  { "rule_id": "...", "rule_name": "content_rating", "passed": false }]
  failure_reasons   TEXT[],
  -- 不合格的原因列表
  expires_at        TIMESTAMPTZ,
  -- 資格的有效期限（如有些規則會隨時間改變）
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(creative_asset_id, screen_id)
  -- 每個素材對每個螢幕只有一筆最新的資格記錄
);

CREATE INDEX idx_eligibility_creative ON creative_eligibility_checks(creative_asset_id);
CREATE INDEX idx_eligibility_screen ON creative_eligibility_checks(screen_id);
CREATE INDEX idx_eligibility_eligible ON creative_eligibility_checks(is_eligible);
```

**備注：** 競標引擎在得標後（`ad_decision` 建立後）必須立即查此表，確認素材在該螢幕有播出資格，才能設定 `ad_decisions.is_playable = true`。資格檢查可以異步執行，避免影響競標速度。

---

## 5. 播放器執行流程（更新後）

### 傳統 CMS 播放流程

```
1. Player 啟動
   → 向後端請求此螢幕的 active playlist
   → 下載 playlist_items（按 position 排序）
   → 依序播放 direct_sold 和 house_content 槽位

2. Player 循環播放
   → 播完所有 items → 從頭開始
   → 每 N 分鐘向後端更新 heartbeat
   → 播完一個 item → 寫入 proof_of_play_log（playback_type = 'direct'）
```

### Programmatic 播放流程（新增）

```
1. Player 執行到 slot_type = 'programmatic' 的 PlaylistItem
   ↓
2. 查詢此 programmatic_slot 的配置
   （floor_price, timeout_ms, targeting_params）
   ↓
3. 建立 ad_opportunity 記錄（status = 'pending'）
   ↓
4. 向 SSP 發出 Bid Request（含螢幕資訊、定向參數、底價）
   ↓
5a. [SSP 在 timeout 內回應]
   → 建立 ad_decision（winning_bid, creative_url）
   → 執行 creative_eligibility_check
     → is_eligible = true  → 播出廣告，PoP log（playback_type = 'programmatic'）
     → is_eligible = false → 播 Fallback，PoP log（playback_type = 'fallback', reason = 'unapproved_creative'）

5b. [SSP 超時 / 無人出價 / 回傳錯誤]
   → 更新 ad_opportunity.status（'timeout' / 'no_bid' / 'error'）
   → 播 Fallback，PoP log（playback_type = 'fallback', reason = 原因）
   ↓
6. 繼續播放下一個 Slot
```

---

## 6. Programmatic Slot 狀態機

```
         [Slot 即將播出]
               ↓
          'available'
               ↓ Player 建立競標請求
          'requesting'
               ↓
       ┌───────┴───────┐
       ↓               ↓
   有人出價          超時/無出價/錯誤
       ↓               ↓
   'decided'       'fallback'
       ↓
   is_eligible?
   ↓         ↓
  Yes        No
   ↓         ↓
'playing'  'fallback'
   ↓
 'logged'
```

| 狀態 | 說明 |
|------|------|
| `available` | 此 slot 已開放競標，尚未觸發 |
| `requesting` | 已向 SSP 發出競標請求，等待回應 |
| `decided` | 已有得標結果，正在執行 eligibility check |
| `playing` | 得標廣告通過審核，正在播出 |
| `fallback` | 沒有合格廣告，播 fallback 內容 |
| `logged` | 播出完成，PoP log 已寫入 |

---

## 7. 素材審核狀態機

```
[廣告主上傳素材]
       ↓
  'pending_review'
       ↓
  ┌────┴────────────────┐
  ↓                     ↓
人工審核              自動規則審核
  ↓                     ↓
Admin 決定         所有規則通過？
  ↓                ↓         ↓
  ↓              Yes         No
  ↓               ↓          ↓
  ↓           'approved'  'rejected'
  ↓ approved       ↓
  └───────────────→'approved'
                     ↓
            eligibility_check（逐螢幕）
                     ↓
          is_programmatic_eligible = true/false
```

| 狀態 | 說明 |
|------|------|
| `pending_review` | 剛上傳，等待審核 |
| `approved` | 通過審核（平台層級） |
| `rejected` | 未通過審核，不可播出 |

**注意：** `creative_assets.status = 'approved'` 只代表平台審核通過。  
能否在特定螢幕的 Programmatic 槽位播出，還需要查 `creative_eligibility_checks.is_eligible`。

---

## 8. Fallback 策略

Fallback 的目的：**確保螢幕永遠有東西播，不出現黑屏。**

### Fallback 優先順序（由低到高覆蓋）

```
Level 1（最底層）：screens.default_fallback_asset_id
  → 整台螢幕的全域預設，如媒體主品牌形象影片

Level 2：loop_slots.slot_type = 'house_content' 的相鄰 slot
  → 如果 programmatic 失敗，插入最近的 house_content slot

Level 3：programmatic_slots.fallback_asset_id
  → 此 programmatic slot 的專屬 fallback（如特定廣告主的保底廣告）
```

### Fallback 觸發條件

| 條件 | `fallback_reason` |
|------|------------------|
| SSP 無回應超過 timeout | `timeout` |
| SSP 回傳但無人出價 | `no_bid` |
| 得標素材格式有誤 | `invalid_creative` |
| 得標素材未通過 eligibility | `unapproved_creative` |
| 觸發 pacing 上限 | `pacing_limit` |
| SSP 連線錯誤 | `ssp_error` |

---

## 9. Proof-of-Play 報表影響

加入 Programmatic 後，PoP logs 需要支援更豐富的分析維度：

### 新增的查詢需求

| 報表類型 | 需要的 PoP 欄位 |
|---------|--------------|
| 直買 vs 程式化播出比例 | `playback_type` |
| Programmatic fill rate | `playback_type` IN ('programmatic', 'fallback') |
| Fallback 原因分析 | `fallback_reason` |
| 平均得標 CPM | `winning_bid_cpm` |
| SSP 收益計算 | `winning_bid_cpm` × 播出次數 |
| Loop 熱門 Slot 分析 | `loop_slot_position` |

### `campaign_reports` 新增欄位

```sql
ALTER TABLE campaign_reports ADD COLUMN
  programmatic_plays INT NOT NULL DEFAULT 0;

ALTER TABLE campaign_reports ADD COLUMN
  direct_plays INT NOT NULL DEFAULT 0;

ALTER TABLE campaign_reports ADD COLUMN
  fallback_plays INT NOT NULL DEFAULT 0;

ALTER TABLE campaign_reports ADD COLUMN
  fill_rate NUMERIC(5, 4);
  -- programmatic_plays / (programmatic_plays + fallback_plays)
  -- 0.0 ~ 1.0

ALTER TABLE campaign_reports ADD COLUMN
  avg_winning_cpm NUMERIC(8, 2);

ALTER TABLE campaign_reports ADD COLUMN
  revenue_gross NUMERIC(12, 2);
  -- 稅前總收益

ALTER TABLE campaign_reports ADD COLUMN
  revenue_net NUMERIC(12, 2);
  -- 扣除 SSP revenue share 後的淨收益
```

---

## 10. 各模組資料所有權（更新）

| 產品模組 | 主要資料表 |
|---------|-----------|
| Campaign Planner | `campaigns`, `campaign_inventory_items`, `creative_assets` |
| Admin CMS | 所有表 |
| Loop 管理 | `loop_templates`, `loop_slots` |
| Programmatic 配置 | `programmatic_slots`, `pacing_rules`, `ssp_connections` |
| 競標引擎 | `ad_opportunities`, `ad_decisions` |
| 素材審核 | `creative_approval_rules`, `creative_approval_logs`, `creative_eligibility_checks` |
| Web Player | `screens`, `playlists`, `playlist_items`, `programmatic_slots` |
| PoP 系統 | `proof_of_play_logs` |
| Reporting | `campaign_reports` |

---

## 11. MVP 表 vs 生產表

### Phase 1 MVP（不含 Programmatic）

```
必要：users, advertisers, campaigns, campaign_inventory_items,
     inventory_locations, screens, media_assets, creative_assets,
     playlists, playlist_items, proof_of_play_logs, audit_logs
```

### Phase 2（加入 Programmatic 框架）

```
新增：loop_templates, loop_slots, programmatic_slots,
     pacing_rules, ssp_connections（Test Mode）,
     creative_approval_rules, creative_approval_logs,
     creative_eligibility_checks
```

### Phase 3（Live Programmatic）

```
新增：ad_opportunities, ad_decisions
更新：proof_of_play_logs（加 programmatic 欄位）
更新：campaign_reports（加 fill rate / revenue 欄位）
啟用：ssp_connections（正式模式）
```

---

## 12. Migration 順序（更新版）

```
Step 1：基礎實體
  → users, advertisers, inventory_locations

Step 2：播放結構
  → loop_templates, loop_slots

Step 3：螢幕與連接
  → screens（含 loop_template_id 外鍵）
  → ssp_connections

Step 4：Campaign 層
  → campaigns（含 buying_type）
  → campaign_inventory_items
  → media_assets, creative_assets

Step 5：審核規則
  → creative_approval_rules
  → creative_approval_logs
  → creative_eligibility_checks

Step 6：播放排程
  → playlists, playlist_items
  → programmatic_slots, pacing_rules

Step 7：競標記錄
  → ad_opportunities
  → ad_decisions

Step 8：日誌與報表
  → proof_of_play_logs（含新欄位）
  → campaign_reports（含新欄位）
  → audit_logs, notifications
```

---

## 13. 風險與取捨

### 風險 1：競標速度 vs 資料完整性
每個 programmatic slot 都要在 100-300ms 內完成請求→回應→決策→eligibility check。  
**取捨：** Eligibility check 必須是快取查詢（Redis 或 DB index），不能每次都重新計算。`creative_eligibility_checks` 需要定期批次更新，而不是即時計算。

### 風險 2：`ad_opportunities` 寫入量
每台螢幕每天可能產生幾百到幾千筆 opportunity，10 台螢幕一年可達百萬筆。  
**取捨：** 初期可接受，需要按月分區（Table Partitioning），或只保留近 90 天的 opportunity 記錄，舊資料歸檔。

### 風險 3：外部素材（external_creative_url）的安全風險
外部 DSP 提供的素材 URL 可能包含惡意內容或 tracking 腳本。  
**取捨：** 生產環境需要加入素材掃描機制（病毒掃描、URL 白名單）。MVP 可先限制只接受平台審核過的素材。

### 風險 4：Pacing 準確性
Pacing 需要即時知道「到目前為止花了多少預算」，才能決定是否繼續出價。  
**取捨：** 初期用 DB 計算（查 `proof_of_play_logs` 的 `winning_bid_cpm` 加總），量大後需換成 Redis 計數器（每次播出後 incr 一次）。

### 風險 5：Loop 設計複雜度
Loop Template + Loop Slots + Programmatic Slots 三層結構對 Admin 操作複雜。  
**取捨：** UI 需要良好的視覺化設計，讓 Admin 可以直觀看到「這個螢幕的 5 分鐘 loop 長什麼樣子」。初期可以提供預設 template，Admin 不需要從零開始設計。

---

## 14. Open Questions

1. **競標協定：** 要直接實作 OpenRTB，還是先接現有 DOOH SSP 的 proprietary API？
2. **素材外部存放：** Programmatic 廣告的素材通常由 DSP 存放在自己的 CDN，Player 直接打外部 URL。這對素材審核和 eligibility check 流程有什麼影響？
3. **Second-price vs First-price：** 平台採哪種競標模型？目前業界逐漸走向 First-price。
4. **Deal ID 支援：** 是否支援 Private Marketplace（PMP）Deal，讓特定廣告主以固定 CPM 預訂 programmatic 槽位？
5. **跨螢幕頻率控制：** 目前 `pacing_rules.frequency_cap_per_screen_per_hour` 是單台螢幕維度。未來是否需要跨螢幕（同一個廣告在同一個商場的所有螢幕合計不超過 N 次）？
6. **Context Signal：** 定向參數（時段、天氣、人流密度）要由誰提供？如果是第三方 API，如何整合？
7. **Viewability 認定：** DOOH 的「一次曝光」如何定義？目前以播出完成（completed）為準，未來是否需要結合 camera 或感測器確認真實觀看人數？
8. **Revenue Share 結算：** SSP 的 revenue share 是平台自動計算，還是月結對帳？
9. **Creative 預快取：** Player 是否需要在競標成功後提前快取素材，避免播出時才下載造成延遲？
10. **Fallback 素材版權：** House content 和 fallback 素材的版權歸屬和使用授權如何管理？

---

*文件結束。此 schema 為 Programmatic DOOH 的產品設計草稿，正式實作前需工程師技術 review 及 SSP 合作夥伴對接討論。*
