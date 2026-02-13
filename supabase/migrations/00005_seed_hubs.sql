-- 00005_seed_hubs.sql
-- Seed the 3 Dragon Seats hub locations.
-- Uses ON CONFLICT on name to make this migration idempotent.

-- First, add a unique constraint on hub name so ON CONFLICT works
ALTER TABLE hubs ADD CONSTRAINT uq_hubs_name UNIQUE (name);

INSERT INTO hubs (name, city, state, address, lat, lng)
VALUES
    (
        'Cleveland',
        'Cleveland',
        'OH',
        '6200 Riverside Dr, Cleveland, OH 44135',
        41.4124,
        -81.8497
    ),
    (
        'Kansas City',
        'Kansas City',
        'KS',
        '1701 S 55th St, Kansas City, KS 66106',
        39.0842,
        -94.6275
    ),
    (
        'Jacksonville',
        'Jacksonville',
        'FL',
        '1 Stadium Pl, Jacksonville, FL 32202',
        30.3240,
        -81.6373
    )
ON CONFLICT (name) DO UPDATE SET
    city    = EXCLUDED.city,
    state   = EXCLUDED.state,
    address = EXCLUDED.address,
    lat     = EXCLUDED.lat,
    lng     = EXCLUDED.lng;
