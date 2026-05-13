# DOOH Platform — Booking & Creative Approval Product Model

**版本：** v1.0
**日期：** 2026-05-13
**範疇：** 僅更新 Booking、Creative Approval、Launch Readiness 模型，不重新設計其他模組。

---

## 0. 為什麼需要分開這三個概念？

**過去的問題：** 整個 Campaign 只有一個 `status`（draft → pending_review → approved → live），把「訂單確認」、「素材審核」、「是否可以上線」混在一起。這在三種業務模式下都會出問題：

```
自助訂購：素材還沒審核完，Campaign 就能排程上線 → 播出違規內容
直銷訂單：媒體主想先鎖定版位，但素材還沒送來 → 無法處理
Programmatic：DSP 帶入全新素材，來不及審核就播出 → 播出風險
```

**新的設計原則：三個狀態獨立管理，用規則控制什麼情況才能上線。**

```
booking_status     → 版位有沒有被確認訂購
creative_status    → 素材有沒有通過審核
launch_readiness   → 這個 Campaign 是否可以上線播出
```

---

## 1. 三個核心狀態

### 1.1 `booking_status`（訂單 / Insertion Order 狀態）

> 問：「版位有沒有確認預訂？」

| 狀態 | 說明 |
|------|------|
| `draft` | 廣告主還在規劃，尚未確認購買 |
| `pending_confirmation` | 已送出，等待媒體主確認 |
| `confirmed` | 媒體主已確認，版位已預留 |
| `cancelled` | 訂單取消，版位釋出 |
| `expired` | 超時未確認，訂單自動失效 |

**自助訂購：** 廣告主送出後 → `pending_confirmation` → Admin 核准後 → `confirmed`
**直銷訂單：** 業務直接設定為 `confirmed`（跳過 pending 階段）
**Programmatic：** 無固定訂單，每次競標得標後視為單次確認

---

### 1.2 `creative_status`（素材整體審核狀態）

> 問：「這個 Campaign 的素材有沒有可以播出的？」

注意：這是 Campaign 層級的彙總狀態，實際每一支素材有自己的 `approval_status`（已在 `creative_assets` 表中）。

| 狀態 | 說明 |
|------|------|
| `not_submitted` | 尚未上傳任何素材 |
| `pending_review` | 有素材等待審核 |
| `approved` | 至少一支素材通過審核 |
| `rejected` | 所有素材都被退回 |
| `expired` | 素材過期，需要重新送審 |

**計算規則：**
```
若沒有任何 creative_asset → not_submitted
若有任何 creative_asset.approval_status = pending_review → pending_review
若有任何 creative_asset.approval_status = approved（且未過期）→ approved
若所有 creative_asset 都是 rejected → rejected
```

---

### 1.3 `launch_readiness`（上線準備狀態）

> 問：「這個 Campaign 現在可以排程播出嗎？」

這是由系統根據前兩個狀態**自動計算**的結果，不由人工手動設定。

| 狀態 | 說明 |
|------|------|
| `not_ready` | 還沒達到上線條件 |
| `ready` | 所有條件都滿足，可以排程 |
| `blocked` | 曾經 ready，但因為某個條件失效而被擋住 |

**計算公式：**
```
launch_readiness = 'ready' 當且僅當：
  booking_status = 'confirmed'
  AND creative_status = 'approved'
  AND campaign 的 start_date 未到期
```

---

## 2. 三種業務流程

### 2.1 自助訂購（Self-Service Booking）

**典型情境：** 廣告主透過 Campaign Planner 自行操作。

```
步驟 1：廣告主選版位 + 上傳素材
  booking_status  → draft
  creative_status → not_submitted（尚未上傳）

步驟 2：廣告主送出審核
  booking_status  → pending_confirmation
  creative_status → pending_review

步驟 3：Admin 審核素材
  → 素材通過 → creative_status = approved
  → 素材退回 → creative_status = rejected
             → 廣告主必須上傳新素材，重新進入審核

步驟 4：Admin 確認訂單
  booking_status → confirmed

步驟 5：系統自動計算
  booking = confirmed + creative = approved
  → launch_readiness = ready
  → Campaign 進入排程佇列

步驟 6：上線播出
  campaign.status → live
```

**關鍵守則：**
- 素材未通過 → 訂單不得確認（或訂單可確認但 launch_readiness 不會 ready）
- 素材必須先通過審核，Campaign 才能上線

---

### 2.2 直銷訂單（Direct Sold Booking）

**典型情境：** 業務直接與廣告主簽 Insertion Order，版位需要先鎖定。

```
步驟 1：業務在後台建立 Campaign
  booking_status  → confirmed（業務直接確認，跳過 pending）
  creative_status → not_submitted

步驟 2：通知廣告主上傳素材
  creative_status → pending_review（廣告主上傳後）

步驟 3：媒體主審核素材
  → 通過 → creative_status = approved
            launch_readiness = ready（因為 booking 已 confirmed）
  → 退回 → creative_status = rejected
            launch_readiness = blocked（訂單已確認但素材不合格）

步驟 4：廣告主送新素材 → 再次審核通過
  launch_readiness = ready → 上線
```

**關鍵守則：**
- 版位可以在素材審核前就「預留」（booking = confirmed）
- 但沒有 approved 的素材，Campaign 就不能上線播出
- 若素材被退回，Campaign 進入 `blocked` 狀態，需要新素材才能解除

---

### 2.3 Programmatic DOOH

**典型情境：** DSP 透過 SSP 即時競標，帶入新的廣告素材。

```
情境 A：已知廣告主的已核准素材
  競標得標 → 查 creative_eligibility_checks
  → is_eligible = true → 直接播出
  → is_eligible = false → 播 Fallback

情境 B：DSP 帶入全新素材（external_creative_url）
  得標 → 素材進入審核佇列（creative_status = pending_review）
  → 尚未審核 → 播 Fallback（不能播未審核素材）
  → 審核通過後，下次競標得標才能播出
  → 審核退回 → 永久播 Fallback（直到該 DSP 換素材）

情境 C：素材已審核但超時
  → creative_asset.expires_at 到期 → 自動變為 expired
  → 播 Fallback，等待廣告主重新送審
```

**關鍵守則：**
- 任何全新素材（之前沒審核過的）都必須先進審核佇列
- 審核中的素材不得播出，一律改播 Fallback
- 超時未審核（如超過 48 小時）可設定自動退回，避免佇列積壓

---

## 3. 狀態轉換圖

### 3.1 Booking Status

```
             廣告主送出
[draft] ─────────────────► [pending_confirmation]
                                    │
                         Admin 確認 │ Admin 拒絕
                                    │
                  ┌─────────────────┤
                  ▼                 ▼
           [confirmed]         [cancelled]
               │
       超時或手動
               │
               ▼
           [expired]
```

### 3.2 Creative Status（Campaign 層級彙總）

```
[not_submitted]
     │ 廣告主上傳素材
     ▼
[pending_review]
     │
  ┌──┴────────────┐
  ▼               ▼
[approved]    [rejected]──► 廣告主重新上傳 ──► [pending_review]
  │
  │ expires_at 到期
  ▼
[expired]──► 廣告主重新送審 ──► [pending_review]
```

### 3.3 Launch Readiness（系統自動計算）

```
[not_ready]
    │ booking=confirmed AND creative=approved
    ▼
[ready] ──► 系統排程 ──► Campaign 上線（status=live）
    │
    │ creative 變 rejected 或 expired
    │ 或 booking 被取消
    ▼
[blocked] ──► 問題解決後自動回 [ready]
```

---

## 4. 封鎖規則（Guardrails）

以下操作在條件不滿足時，系統應該拒絕並顯示明確錯誤訊息。

| 操作 | 前提條件 | 如果不滿足 |
|------|---------|-----------|
| 送出 Campaign 審核 | 至少 1 個版位 + 至少 1 支素材 | 顯示錯誤，不允許送出 |
| 確認訂單（booking = confirmed） | Campaign 已送出（booking ≠ draft）| 顯示錯誤 |
| 排程上線 | launch_readiness = ready | 系統阻擋，不寫入播放清單 |
| 播出素材 | creative_asset.approval_status = approved | Player 改播 Fallback |
| Programmatic 素材播出 | is_eligible = true | Player 改播 Fallback |
| 重新使用退回的素材 | 廣告主上傳替代素材並通過審核 | 舊的退回素材不得復原 |

---

## 5. Admin 操作清單

| 操作 | 影響的狀態 | 使用時機 |
|------|-----------|---------|
| 核准訂單 | booking_status → confirmed | 自助訂購：廣告主送出後 |
| 拒絕訂單 | booking_status → cancelled | 訂單有問題（如版位衝突） |
| 核准素材 | creative_asset.approval_status → approved | 素材符合規範 |
| 退回素材 | creative_asset.approval_status → rejected | 素材不合規，需附上原因 |
| 強制封鎖 Campaign | launch_readiness → blocked | 緊急情況（如廣告主違規） |
| 手動解除封鎖 | launch_readiness 重新計算 | 問題解決後 |
| 延長素材有效期 | creative_asset.expires_at 延後 | 長期合約的廣告主 |

---

## 6. 使用者看到的訊息

### 廣告主端

| 狀態組合 | 廣告主看到的訊息 |
|---------|--------------|
| booking=pending, creative=pending | 「您的廣告活動正在審查中，請靜候通知。」 |
| booking=confirmed, creative=pending | 「版位已確認。素材審核中，通過後即可排程播出。」 |
| booking=confirmed, creative=approved | 「廣告活動已準備就緒，即將排程上線。」 |
| booking=confirmed, creative=rejected | 「⚠️ 您的廣告素材未通過審核：{原因}。請上傳符合規範的替代素材。」 |
| booking=cancelled | 「您的廣告活動訂單已取消。如有疑問請聯繫業務。」 |
| launch_readiness=blocked | 「⚠️ 您的廣告活動目前因素材問題被暫停，請更新素材後重新送審。」 |

### Admin 端

| 狀態組合 | Admin 看到的 Badge |
|---------|-----------------|
| booking=pending, creative=pending | 🟡 待審核 |
| booking=confirmed, creative=pending | 🔵 等待素材 |
| booking=confirmed, creative=approved | 🟢 準備就緒 |
| booking=confirmed, creative=rejected | 🔴 素材被退回 |
| launch_readiness=blocked | 🔴 已封鎖 |
| status=live | 🟢 播出中 |

---

## 7. Edge Cases

### 7.1 訂單確認後素材被退回

```
情境：Campaign 已經是 confirmed + approved → live 播出中
      Admin 因為投訴退回素材

結果：
  creative_status → rejected
  launch_readiness → blocked（自動）
  campaign.status → 從 live 變為 paused（系統自動）
  Player 立刻切換到 Fallback creative
  廣告主收到通知，需要上傳替代素材
```

### 7.2 多支素材，部分通過部分退回

```
情境：Campaign 上傳 3 支素材：A（approved）、B（pending）、C（rejected）

結果：
  creative_status → approved（因為至少一支通過）
  launch_readiness → ready（可以上線）
  播放時只播 A（approved），B 和 C 不參與播放
  Admin 仍需處理 B 的審核
```

### 7.3 素材有效期到期

```
情境：Campaign 正在播出，creative_asset.expires_at 到了

結果：
  該 creative_asset.approval_status → expired（系統自動更新）
  重新計算 creative_status：
    → 若還有其他 approved 素材 → creative_status 不變，換播其他素材
    → 若只有這一支 → creative_status → expired
                    → launch_readiness → blocked
                    → 廣告主需要重新送審
```

### 7.4 Programmatic 素材在競標後才進審核

```
情境：DSP 帶入新素材，在此次競標得標

問題：審核需要時間（可能幾分鐘到幾小時），但播出是秒級的

解法：
  得標後立刻查 creative_eligibility_checks
  → 尚未有記錄（新素材）→ 播 Fallback，同時觸發異步審核
  → 審核通過後，下次競標該素材才能真正參與播出
  
  重要：絕不播出未審核或未經資格確認的素材
```

### 7.5 直銷訂單鎖定版位但素材遲交

```
情境：訂單確認了，但廣告主遲遲沒有上傳素材，Campaign 開始日期到了

結果：
  booking_status → confirmed（版位已預留）
  creative_status → not_submitted
  launch_readiness → not_ready（不能上線）
  Campaign 開始日期到了但無法播出 → 系統播 Fallback
  若超過合約允許的延誤天數 → booking_status → expired（自動釋出版位）
  通知廣告主和業務
```

---

## 8. 需要新增或更新的資料欄位

以下欄位需要加入 `campaigns` 表（Schema 更新）：

```sql
-- 新增欄位
booking_status    TEXT DEFAULT 'draft'
  CHECK (booking_status IN ('draft','pending_confirmation','confirmed','cancelled','expired'))

creative_status   TEXT DEFAULT 'not_submitted'
  CHECK (creative_status IN ('not_submitted','pending_review','approved','rejected','expired'))

launch_readiness  TEXT DEFAULT 'not_ready'
  CHECK (launch_readiness IN ('not_ready','ready','blocked'))

booking_confirmed_at   TIMESTAMPTZ  -- 訂單確認時間
booking_confirmed_by   UUID REFERENCES users(id)  -- 誰確認的
launch_blocked_reason  TEXT  -- 封鎖原因（如：素材被退回）
```

**launch_readiness 的維護方式：**
- 用 PostgreSQL `TRIGGER` 在 `creative_assets.approval_status` 或 `campaigns.booking_status` 變更時自動重新計算
- 或由 API layer 在每次狀態更新時同步計算

---

## 9. 三種業務模式比較

| 維度 | 自助訂購 | 直銷訂單 | Programmatic |
|------|---------|---------|-------------|
| 誰確認版位？ | Admin 審核後確認 | 業務直接確認 | 競標即時確認（單次） |
| 素材誰提供？ | 廣告主上傳 | 廣告主上傳 | DSP 即時帶入 |
| 素材需要審核？ | ✅ 必須 | ✅ 必須 | ✅ 必須（新素材） |
| 版位可以先鎖定嗎？ | ❌ 需素材審核後才確認 | ✅ 可先鎖定版位 | N/A（競標制） |
| Fallback 機制 | 播出前阻擋 | 播出前阻擋 | 即時切換 Fallback |
| 審核時限 | 無硬性限制（業務彈性） | 同上 | 建議 48 小時自動退回 |

---

## 10. 實作順序建議

```
Phase 1：Schema 更新
  → campaigns 表加入 booking_status, creative_status, launch_readiness
  → 建立 launch_readiness 計算邏輯（Trigger 或 API layer）

Phase 2：Admin API 更新
  → PATCH /admin/campaigns/:id/booking-status（確認 / 取消訂單）
  → 核准素材後自動重新計算 launch_readiness

Phase 3：前端更新
  → Campaign Planner：顯示 booking_status、creative_status
  → Admin Dashboard：顯示三種狀態的 Badge
  → 送出後顯示正確的等待訊息

Phase 4：播放守護
  → Player 播出前查 launch_readiness
  → Programmatic Engine 播出前查 creative eligibility
  → Fallback 觸發條件加入 creative_status = rejected/expired
```

---

*文件結束。此模型更新僅涵蓋 Booking、Creative Approval、Launch Readiness 三個狀態維度，其他模組（Web Player、Reporting、Programmatic 競標邏輯）不受影響。*
