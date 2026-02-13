-- 00003_create_indexes.sql
-- Create all indexes for high-frequency optimizer queries and data integrity.

-- High-frequency optimizer queries
CREATE INDEX idx_game_schedule_week ON game_schedule(season_year, week_number);
CREATE INDEX idx_assets_status ON assets(status, asset_type);
CREATE INDEX idx_assets_hub ON assets(current_hub);
CREATE INDEX idx_trips_week ON trips(season_year, week_number, status);
CREATE INDEX idx_distance_cache_coords ON distance_cache(origin_lat, origin_lng, dest_lat, dest_lng);

-- Unique constraints on availability (one record per person/vehicle per week)
CREATE UNIQUE INDEX idx_personnel_avail ON personnel_availability(person_id, season_year, week_number);
CREATE UNIQUE INDEX idx_vehicle_avail ON vehicle_availability(vehicle_id, season_year, week_number);

-- Asset assignments and venue location indexes
CREATE INDEX idx_assets_venue ON assets(current_venue_id) WHERE current_venue_id IS NOT NULL;
CREATE INDEX idx_asset_assignments_season ON asset_assignments(season_year, customer_id);
CREATE INDEX idx_asset_assignments_asset ON asset_assignments(asset_id, season_year);
