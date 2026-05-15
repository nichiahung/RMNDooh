-- ============================================================
-- Campaign Draft: add new status values + new tables
-- ============================================================

-- 1. Add new campaign statuses to the campaigns table
-- The existing status column is TEXT with no CHECK constraint,
-- so new values can be inserted immediately.
-- Document the new allowed values:
COMMENT ON COLUMN campaigns.status IS
  'draft | pending_creative_review | blocked_by_creative | ready_to_book | cancelled | pending_review | approved | rejected | scheduled | live | completed';

-- 2. campaign_creative_requirements
-- Snapshot of required canonical formats, created at submit-for-review time.
CREATE TABLE IF NOT EXISTS campaign_creative_requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  canonical_format  TEXT NOT NULL,
  -- 'landscape_16_9' | 'portrait_9_16' | 'square_1_1' | 'ultra_wide'
  status            TEXT NOT NULL DEFAULT 'pending_upload',
  -- 'pending_upload' | 'uploaded' | 'approved' | 'rejected'
  media_asset_id    UUID REFERENCES media_assets(id),
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, canonical_format)
);

CREATE INDEX IF NOT EXISTS idx_ccr_campaign_id
  ON campaign_creative_requirements(campaign_id);

CREATE INDEX IF NOT EXISTS idx_ccr_status
  ON campaign_creative_requirements(status);

-- 3. campaign_bookings
-- Created once at confirm-booking. 1:1 with campaign.
CREATE TABLE IF NOT EXISTS campaign_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  confirmed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount    NUMERIC(12, 2) NOT NULL,
  booking_status  TEXT NOT NULL DEFAULT 'confirmed',
  -- 'confirmed' | 'cancelled'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cb_campaign_id
  ON campaign_bookings(campaign_id);
