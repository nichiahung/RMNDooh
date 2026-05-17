-- Add updated_at to sales_client_bindings
ALTER TABLE sales_client_bindings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
