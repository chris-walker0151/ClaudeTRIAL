-- Add denormalized location name columns to asset_movements.
-- The existing fetchAssetDetailAction() already queries these columns.
ALTER TABLE asset_movements ADD COLUMN IF NOT EXISTS from_location_name text;
ALTER TABLE asset_movements ADD COLUMN IF NOT EXISTS to_location_name text;

-- Index for fast movement history lookups by asset
CREATE INDEX IF NOT EXISTS idx_asset_movements_asset ON asset_movements(asset_id, moved_at DESC);
