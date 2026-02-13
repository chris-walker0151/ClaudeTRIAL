-- 00002_create_tables.sql
-- Create all 22 tables for the Dragon Seats Control Tower Platform.
-- Tables are ordered to respect foreign key dependencies.

-- Enable uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. hubs
-- =============================================================================
CREATE TABLE hubs (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        text NOT NULL,
    city        text NOT NULL,
    state       text NOT NULL,
    address     text NOT NULL,
    lat         numeric NOT NULL,
    lng         numeric NOT NULL,
    capacity_notes text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. customers
-- =============================================================================
CREATE TABLE customers (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            text NOT NULL,
    sport_type      sport_type NOT NULL,
    primary_contact text,
    contact_email   text,
    contact_phone   text,
    timezone        text,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. venues
-- =============================================================================
CREATE TABLE venues (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    name        text NOT NULL,
    address     text,
    city        text,
    state       text,
    lat         numeric,
    lng         numeric,
    is_primary  boolean NOT NULL DEFAULT false,
    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. contracts
-- =============================================================================
CREATE TABLE contracts (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contract_type contract_type NOT NULL,
    start_date    date NOT NULL,
    end_date      date NOT NULL,
    status        text NOT NULL DEFAULT 'active',
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5. contract_items
-- =============================================================================
CREATE TABLE contract_items (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id   uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    asset_type    asset_type NOT NULL,
    model_version text,
    quantity      int NOT NULL,
    branding_spec text,
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 6. assets
-- Note: current_trip_id FK to trips is added via ALTER TABLE at the end
--       because trips has not been created yet.
-- =============================================================================
CREATE TABLE assets (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number    text NOT NULL UNIQUE,
    asset_type       asset_type NOT NULL,
    model_version    text,
    condition        asset_condition NOT NULL DEFAULT 'good',
    status           asset_status NOT NULL DEFAULT 'at_hub',
    home_hub_id      uuid NOT NULL REFERENCES hubs(id) ON DELETE RESTRICT,
    current_hub      uuid REFERENCES hubs(id) ON DELETE SET NULL,
    current_venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
    current_trip_id  uuid,  -- FK added after trips table is created
    weight_lbs       numeric,
    current_branding text,
    notes            text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 7. asset_movements
-- =============================================================================
CREATE TABLE asset_movements (
    id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id           uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    from_location_type text,
    from_location_id   uuid,
    to_location_type   text,
    to_location_id     uuid,
    trip_id            uuid,  -- FK added after trips table is created
    moved_at           timestamptz,
    notes              text,
    created_at         timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 8. branding_tasks
-- =============================================================================
CREATE TABLE branding_tasks (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id       uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    from_branding  text,
    to_branding    text,
    hub_id         uuid NOT NULL REFERENCES hubs(id) ON DELETE RESTRICT,
    needed_by_date date,
    status         text NOT NULL DEFAULT 'pending',
    notes          text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 9. asset_assignments
-- =============================================================================
CREATE TABLE asset_assignments (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id      uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    season_year   int NOT NULL,
    is_permanent  boolean NOT NULL DEFAULT false,
    assigned_at   date,
    unassigned_at date,
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 10. personnel
-- =============================================================================
CREATE TABLE personnel (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         text NOT NULL,
    role         personnel_role NOT NULL,
    home_hub_id  uuid NOT NULL REFERENCES hubs(id) ON DELETE RESTRICT,
    phone        text,
    email        text,
    skills       jsonb,
    max_drive_hrs int NOT NULL DEFAULT 11,
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 11. vehicles
-- =============================================================================
CREATE TABLE vehicles (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         text NOT NULL,
    type         text,
    home_hub_id  uuid NOT NULL REFERENCES hubs(id) ON DELETE RESTRICT,
    capacity_lbs int,
    capacity_cuft int,
    status       text NOT NULL DEFAULT 'active',
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 12. personnel_availability
-- =============================================================================
CREATE TABLE personnel_availability (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id    uuid NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    week_number  int NOT NULL,
    season_year  int NOT NULL,
    is_available boolean NOT NULL DEFAULT true,
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 13. vehicle_availability
-- =============================================================================
CREATE TABLE vehicle_availability (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id   uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    week_number  int NOT NULL,
    season_year  int NOT NULL,
    is_available boolean NOT NULL DEFAULT true,
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 14. game_schedule
-- =============================================================================
CREATE TABLE game_schedule (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id      uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    venue_id         uuid REFERENCES venues(id) ON DELETE SET NULL,
    season_year      int NOT NULL,
    week_number      int NOT NULL,
    game_date        date NOT NULL,
    game_time        time,
    opponent         text,
    is_home_game     boolean NOT NULL DEFAULT true,
    sidelines_served text NOT NULL DEFAULT 'both',
    season_phase     season_phase NOT NULL,
    notes            text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 15. optimizer_runs
-- =============================================================================
CREATE TABLE optimizer_runs (
    id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_number            int NOT NULL,
    season_year            int NOT NULL,
    triggered_by           text,
    status                 optimizer_run_status NOT NULL DEFAULT 'pending',
    started_at             timestamptz,
    completed_at           timestamptz,
    duration_ms            int,
    input_hash             text,
    trips_generated        int,
    warnings               jsonb,
    errors                 jsonb,
    unassigned_demands     jsonb,
    constraint_relaxations jsonb,
    created_at             timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 16. trips
-- =============================================================================
CREATE TABLE trips (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_number      int NOT NULL,
    season_year      int NOT NULL,
    optimizer_run_id uuid REFERENCES optimizer_runs(id) ON DELETE SET NULL,
    status           trip_status NOT NULL DEFAULT 'draft',
    vehicle_id       uuid REFERENCES vehicles(id) ON DELETE SET NULL,
    origin_type      text,
    origin_id        uuid,
    depart_time      timestamptz,
    return_time      timestamptz,
    total_miles      numeric,
    total_drive_hrs  numeric,
    notes            text,
    is_recommended   boolean NOT NULL DEFAULT true,
    is_manual        boolean NOT NULL DEFAULT false,
    optimizer_score  numeric,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 17. trip_stops
-- =============================================================================
CREATE TABLE trip_stops (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id             uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    venue_id            uuid NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
    stop_order          int NOT NULL,
    arrival_time        timestamptz,
    depart_time         timestamptz,
    action              text,
    requires_hub_return boolean NOT NULL DEFAULT false,
    hub_return_reason   text,
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 18. trip_assets
-- =============================================================================
CREATE TABLE trip_assets (
    id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    asset_id   uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    stop_id    uuid REFERENCES trip_stops(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 19. trip_personnel
-- =============================================================================
CREATE TABLE trip_personnel (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    person_id   uuid NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    role_on_trip text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 20. travel_recommendations
-- =============================================================================
CREATE TABLE travel_recommendations (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id             uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    stop_id             uuid REFERENCES trip_stops(id) ON DELETE SET NULL,
    person_id           uuid REFERENCES personnel(id) ON DELETE SET NULL,
    type                text,
    provider_name       text,
    price_estimate      numeric,
    rating              numeric,
    departure_time      timestamptz,
    arrival_time        timestamptz,
    origin              text,
    destination         text,
    distance_to_venue_mi numeric,
    booking_url         text,
    status              text NOT NULL DEFAULT 'suggested',
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 21. preferred_routes
-- =============================================================================
CREATE TABLE preferred_routes (
    id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_airport       text,
    destination_airport  text,
    preferred_airline    text,
    typical_price        numeric,
    typical_duration_min int,
    google_flights_url   text,
    notes                text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 22. distance_cache
-- =============================================================================
CREATE TABLE distance_cache (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_lat       numeric NOT NULL,
    origin_lng       numeric NOT NULL,
    dest_lat         numeric NOT NULL,
    dest_lng         numeric NOT NULL,
    distance_miles   numeric,
    duration_minutes numeric,
    fetched_at       timestamptz NOT NULL DEFAULT now(),
    created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Add deferred FK: assets.current_trip_id -> trips.id
-- =============================================================================
ALTER TABLE assets
    ADD CONSTRAINT fk_assets_current_trip
    FOREIGN KEY (current_trip_id) REFERENCES trips(id) ON DELETE SET NULL;

-- Add deferred FK: asset_movements.trip_id -> trips.id
ALTER TABLE asset_movements
    ADD CONSTRAINT fk_asset_movements_trip
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL;
