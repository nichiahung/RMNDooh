-- ============================================================
-- Campaign Flight Snapshots
-- ============================================================
-- Keep Campaign, Media Plan item, and confirmed Booking date ranges aligned.

ALTER TABLE campaign_inventory_items
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

UPDATE campaign_inventory_items AS item
SET
  start_date = COALESCE(item.start_date, campaign.start_date),
  end_date = COALESCE(item.end_date, campaign.end_date)
FROM campaigns AS campaign
WHERE item.campaign_id = campaign.id
  AND (item.start_date IS NULL OR item.end_date IS NULL);

COMMENT ON COLUMN campaign_inventory_items.start_date IS
  'Optional per-InventoryLocation flight start date. Defaults to campaign.start_date in the self-service planner.';
COMMENT ON COLUMN campaign_inventory_items.end_date IS
  'Optional per-InventoryLocation flight end date. Defaults to campaign.end_date in the self-service planner.';

ALTER TABLE campaign_bookings
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

UPDATE campaign_bookings AS booking
SET
  start_date = COALESCE(booking.start_date, campaign.start_date),
  end_date = COALESCE(booking.end_date, campaign.end_date)
FROM campaigns AS campaign
WHERE booking.campaign_id = campaign.id
  AND (booking.start_date IS NULL OR booking.end_date IS NULL);

COMMENT ON COLUMN campaign_bookings.start_date IS
  'Snapshot of campaigns.start_date at booking confirmation time.';
COMMENT ON COLUMN campaign_bookings.end_date IS
  'Snapshot of campaigns.end_date at booking confirmation time.';
