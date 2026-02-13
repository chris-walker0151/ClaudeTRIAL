-- 00001_create_enums.sql
-- Create all 9 custom enum types for the Dragon Seats Control Tower Platform.
-- post_game_disposition is intentionally omitted (replaced by requires_hub_return boolean on trip_stops).

CREATE TYPE asset_type AS ENUM (
    'heated_bench',
    'cooling_bench',
    'hybrid_bench',
    'dragon_shader',
    'heated_foot_deck'
);

CREATE TYPE asset_condition AS ENUM (
    'excellent',
    'good',
    'fair',
    'needs_repair',
    'out_of_service'
);

CREATE TYPE asset_status AS ENUM (
    'at_hub',
    'loaded',
    'in_transit',
    'on_site',
    'returning',
    'rebranding'
);

CREATE TYPE trip_status AS ENUM (
    'draft',
    'recommended',
    'confirmed',
    'in_transit',
    'on_site',
    'returning',
    'completed',
    'cancelled'
);

CREATE TYPE personnel_role AS ENUM (
    'driver',
    'service_tech',
    'lead_tech',
    'sales'
);

CREATE TYPE contract_type AS ENUM (
    'lease_1yr',
    'lease_3yr',
    'lease_5yr',
    'one_off_rental',
    'conference_deal'
);

CREATE TYPE sport_type AS ENUM (
    'nfl',
    'ncaa_football',
    'mlb',
    'pga',
    'tennis',
    'other'
);

CREATE TYPE season_phase AS ENUM (
    'preseason',
    'regular',
    'postseason',
    'bowl_season',
    'offseason'
);

CREATE TYPE optimizer_run_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'partial'
);
