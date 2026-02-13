-- 00004_create_triggers.sql
-- Create a shared trigger function that auto-updates the updated_at column,
-- then apply it to every table that has an updated_at column.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at

CREATE TRIGGER trg_hubs_updated_at
    BEFORE UPDATE ON hubs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contract_items_updated_at
    BEFORE UPDATE ON contract_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_branding_tasks_updated_at
    BEFORE UPDATE ON branding_tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_asset_assignments_updated_at
    BEFORE UPDATE ON asset_assignments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_personnel_updated_at
    BEFORE UPDATE ON personnel
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_personnel_availability_updated_at
    BEFORE UPDATE ON personnel_availability
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vehicle_availability_updated_at
    BEFORE UPDATE ON vehicle_availability
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_game_schedule_updated_at
    BEFORE UPDATE ON game_schedule
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_trip_stops_updated_at
    BEFORE UPDATE ON trip_stops
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_trip_assets_updated_at
    BEFORE UPDATE ON trip_assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_trip_personnel_updated_at
    BEFORE UPDATE ON trip_personnel
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_travel_recommendations_updated_at
    BEFORE UPDATE ON travel_recommendations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_preferred_routes_updated_at
    BEFORE UPDATE ON preferred_routes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
