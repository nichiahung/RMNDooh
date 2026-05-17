-- ============================================================
-- Clients and Sales-Client Bindings
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  contact_email     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending_confirmation'
                    CHECK (status IN ('pending_confirmation', 'active', 'suspended')),
  created_by_email  TEXT,                          -- sales user email who created, null = self-registered
  owner_email       TEXT,                          -- client's own email once confirmed
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN clients.status IS
  'pending_confirmation | active | suspended';

CREATE TABLE IF NOT EXISTS sales_client_bindings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_email       TEXT NOT NULL,                 -- sales user email
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'rejected')),
  confirm_token     UUID NOT NULL DEFAULT gen_random_uuid(),
  token_expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  invited_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at      TIMESTAMPTZ,
  UNIQUE(sales_email, client_id)
);

COMMENT ON COLUMN sales_client_bindings.status IS
  'pending | active | rejected';

CREATE INDEX IF NOT EXISTS idx_scb_sales_email
  ON sales_client_bindings(sales_email);

CREATE INDEX IF NOT EXISTS idx_scb_client_id
  ON sales_client_bindings(client_id);

CREATE INDEX IF NOT EXISTS idx_scb_confirm_token
  ON sales_client_bindings(confirm_token);
