/**
 * Dragon Seats — Seed Demo Data Script
 *
 * Loads CSV seed data from data-templates/seed/ into Supabase.
 * Generates availability records, branding tasks, and optionally
 * a Week 5 mid-season snapshot.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts [--snapshot week5]
 *
 * Prerequisites:
 *   - Supabase project with schema deployed (all 22 tables)
 *   - .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Google Maps API key in GOOGLE_MAPS_API_KEY (for geocoding)
 *
 * Dependencies:
 *   npm install @supabase/supabase-js csv-parse dotenv
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

const SEED_DIR = resolve(__dirname, "../data-templates/seed");
const SEASON_YEAR = 2025;
const TOTAL_WEEKS = 19; // Week 0 (preseason) through Week 18

// Hub definitions
const HUBS = [
    {
        name: "Cleveland",
        city: "Cleveland",
        state: "OH",
        address: "6200 Riverside Dr, Cleveland, OH 44135",
        lat: 41.4124,
        lng: -81.8497,
    },
    {
        name: "Kansas City",
        city: "Kansas City",
        state: "KS",
        address: "1701 S 55th St, Kansas City, KS 66106",
        lat: 39.0842,
        lng: -94.6275,
    },
    {
        name: "Jacksonville",
        city: "Jacksonville",
        state: "FL",
        address: "1 Stadium Pl, Jacksonville, FL 32202",
        lat: 30.324,
        lng: -81.6373,
    },
];

// Hub code to full name mapping
const HUB_CODE_MAP: Record<string, string> = {
    CLE: "Cleveland",
    KC: "Kansas City",
    JAX: "Jacksonville",
    Cleveland: "Cleveland",
    "Kansas City": "Kansas City",
    Jacksonville: "Jacksonville",
};

// Personnel planned absences (from seed data plan)
const PERSONNEL_ABSENCES: Record<string, number[]> = {
    "Dave Nowak": [7, 8],
    "Sarah Mitchell": [5, 6],
    "Jason Briggs": [12],
    "Tom Reeves": [3, 4],
    "Luis Vega": [10, 11],
    "Eric Tran": [14],
    "Jake Morris": [9],
    "Amy Schultz": [6, 7],
    "Brian Oates": [15],
};

// Vehicle maintenance windows
const VEHICLE_MAINTENANCE: Record<string, number[]> = {
    "Truck-CLE-02": [6, 7],
    "Trailer-CLE-01": [11],
    "Truck-KC-02": [8, 9],
    "Van-KC-01": [14],
    "Truck-JAX-01": [5, 6],
    "Trailer-JAX-01": [12],
};

// 10 NCAA rebranding scenarios
const REBRANDING_TASKS = [
    { week: 3, serial: "HB-2025-CLE051", from: "Ohio State Buckeyes", to: "Penn State Nittany Lions", hub: "Cleveland" },
    { week: 3, serial: "HB-2025-CLE052", from: "Ohio State Buckeyes", to: "Penn State Nittany Lions", hub: "Cleveland" },
    { week: 5, serial: "HB-2025-KC076", from: "Texas Longhorns", to: "Oklahoma Sooners", hub: "Kansas City" },
    { week: 5, serial: "HB-2025-KC077", from: "Texas Longhorns", to: "Oklahoma Sooners", hub: "Kansas City" },
    { week: 7, serial: "HB-2025-JAX056", from: "Florida Gators", to: "Georgia Bulldogs", hub: "Jacksonville" },
    { week: 8, serial: "HB-2025-CLE053", from: "Michigan Wolverines", to: "Indiana Hoosiers", hub: "Cleveland" },
    { week: 9, serial: "HB-2025-KC078", from: "Missouri Tigers", to: "Arkansas Razorbacks", hub: "Kansas City" },
    { week: 10, serial: "HB-2025-JAX057", from: "Alabama Crimson Tide", to: "Auburn Tigers", hub: "Jacksonville" },
    { week: 11, serial: "HB-2025-CLE054", from: "Notre Dame Fighting Irish", to: "Northwestern Wildcats", hub: "Cleveland" },
    { week: 13, serial: "HB-2025-JAX058", from: "Clemson Tigers", to: "South Carolina Gamecocks", hub: "Jacksonville" },
];

interface CsvRow {
    [key: string]: string;
}

function readCsv(filename: string): CsvRow[] {
    const filepath = resolve(SEED_DIR, filename);
    const content = readFileSync(filepath, "utf-8");
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });
}

function log(msg: string) {
    console.log(`[seed] ${msg}`);
}

function logCount(table: string, count: number) {
    console.log(`  ✓ ${table}: ${count} rows`);
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!GOOGLE_MAPS_KEY) return null;
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results?.[0]?.geometry?.location) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng };
        }
    } catch {
        // Geocoding failed — will be null
    }
    return null;
}

async function truncateTables(supabase: SupabaseClient) {
    log("Truncating data tables (preserving hubs)...");
    const tables = [
        "branding_tasks",
        "asset_movements",
        "trip_assets",
        "trip_personnel",
        "travel_recommendations",
        "trip_stops",
        "trips",
        "optimizer_runs",
        "asset_assignments",
        "vehicle_availability",
        "personnel_availability",
        "game_schedule",
        "assets",
        "contract_items",
        "contracts",
        "vehicles",
        "personnel",
        "venues",
        "customers",
    ];

    for (const table of tables) {
        const { error } = await supabase.rpc("truncate_table", { table_name: table });
        if (error) {
            // Fallback: delete all rows
            await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        }
    }
}

async function upsertHubs(supabase: SupabaseClient): Promise<Map<string, string>> {
    log("Upserting hubs...");
    const hubMap = new Map<string, string>();

    for (const hub of HUBS) {
        const { data, error } = await supabase
            .from("hubs")
            .upsert(hub, { onConflict: "name" })
            .select("id, name")
            .single();

        if (error) {
            console.error(`  Error upserting hub ${hub.name}:`, error.message);
            continue;
        }
        hubMap.set(data.name, data.id);
    }

    logCount("hubs", hubMap.size);
    return hubMap;
}

async function insertCustomers(supabase: SupabaseClient): Promise<Map<string, string>> {
    log("Inserting customers...");
    const rows = readCsv("customers.csv");
    const customerMap = new Map<string, string>();

    const records = rows.map((r) => ({
        name: r.customer_name,
        sport_type: r.sport,
        primary_contact: r.primary_contact_name,
        contact_email: r.contact_email,
        contact_phone: r.contact_phone || null,
        timezone: r.timezone,
        notes: r.notes || null,
    }));

    const { data, error } = await supabase.from("customers").insert(records).select("id, name");
    if (error) {
        console.error("  Error inserting customers:", error.message);
        return customerMap;
    }

    for (const row of data) {
        customerMap.set(row.name, row.id);
    }

    logCount("customers", data.length);
    return customerMap;
}

async function insertVenues(
    supabase: SupabaseClient,
    customerMap: Map<string, string>
): Promise<Map<string, string>> {
    log("Inserting venues (with geocoding)...");
    const rows = readCsv("venues.csv");
    const venueMap = new Map<string, string>();

    const records = [];
    for (const r of rows) {
        const customerId = r.customer_name ? customerMap.get(r.customer_name) : null;

        let lat = null;
        let lng = null;
        const geo = await geocodeAddress(r.venue_address);
        if (geo) {
            lat = geo.lat;
            lng = geo.lng;
        }

        // Parse city and state from address
        const addressParts = r.venue_address.split(",").map((s: string) => s.trim());
        const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : null;
        const stateZip = addressParts.length >= 1 ? addressParts[addressParts.length - 1] : "";
        const state = stateZip.split(" ")[0] || null;

        records.push({
            customer_id: customerId,
            name: r.venue_name,
            address: r.venue_address,
            city,
            state,
            lat,
            lng,
            is_primary: r.is_primary === "true",
            notes: r.notes || null,
        });
    }

    const { data, error } = await supabase.from("venues").insert(records).select("id, name");
    if (error) {
        console.error("  Error inserting venues:", error.message);
        return venueMap;
    }

    for (const row of data) {
        venueMap.set(row.name, row.id);
    }

    logCount("venues", data.length);
    return venueMap;
}

async function insertContracts(
    supabase: SupabaseClient,
    customerMap: Map<string, string>
): Promise<void> {
    log("Inserting contracts and contract items...");
    const rows = readCsv("contracts.csv");

    // Group rows by customer + contract_type + start_date + end_date to form contracts
    const contractGroups = new Map<string, CsvRow[]>();
    for (const r of rows) {
        const key = `${r.customer_name}|${r.contract_type}|${r.start_date}|${r.end_date}`;
        if (!contractGroups.has(key)) {
            contractGroups.set(key, []);
        }
        contractGroups.get(key)!.push(r);
    }

    let contractCount = 0;
    let itemCount = 0;

    for (const [key, items] of contractGroups) {
        const first = items[0];
        const customerId = customerMap.get(first.customer_name);
        if (!customerId) {
            console.error(`  Customer not found: ${first.customer_name}`);
            continue;
        }

        // Insert contract
        const { data: contract, error: contractError } = await supabase
            .from("contracts")
            .insert({
                customer_id: customerId,
                contract_type: first.contract_type,
                start_date: first.start_date,
                end_date: first.end_date,
                status: "active",
                notes: first.notes || null,
            })
            .select("id")
            .single();

        if (contractError) {
            console.error(`  Error inserting contract for ${first.customer_name}:`, contractError.message);
            continue;
        }

        contractCount++;

        // Insert contract items
        const contractItems = items.map((item) => ({
            contract_id: contract.id,
            asset_type: item.asset_type,
            model_version: item.model_version || item.generation,
            quantity: parseInt(item.quantity, 10),
            branding_spec: item.branding_spec || null,
            notes: item.notes || null,
        }));

        const { data: insertedItems, error: itemError } = await supabase
            .from("contract_items")
            .insert(contractItems)
            .select("id");

        if (itemError) {
            console.error(`  Error inserting items for ${first.customer_name}:`, itemError.message);
            continue;
        }

        itemCount += insertedItems.length;
    }

    logCount("contracts", contractCount);
    logCount("contract_items", itemCount);
}

async function insertAssets(
    supabase: SupabaseClient,
    hubMap: Map<string, string>
): Promise<Map<string, string>> {
    log("Inserting assets...");
    const rows = readCsv("assets.csv");
    const assetMap = new Map<string, string>();

    // Insert in batches of 100
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const records = batch.map((r) => {
            const hubName = HUB_CODE_MAP[r.home_hub] || r.home_hub;
            const hubId = hubMap.get(hubName);
            return {
                serial_number: r.serial_number,
                asset_type: r.asset_type,
                model_version: r.generation || r.model_version,
                condition: r.condition || "good",
                status: "at_hub",
                home_hub_id: hubId,
                current_hub: hubId, // All start at hub pre-season
                current_venue_id: null,
                weight_lbs: parseInt(r.weight_lbs, 10),
                current_branding: null,
                notes: r.notes || null,
            };
        });

        const { data, error } = await supabase.from("assets").insert(records).select("id, serial_number");
        if (error) {
            console.error(`  Error inserting assets batch ${i}:`, error.message);
            continue;
        }

        for (const row of data) {
            assetMap.set(row.serial_number, row.id);
        }
        totalInserted += data.length;
    }

    logCount("assets", totalInserted);
    return assetMap;
}

async function insertAssetAssignments(
    supabase: SupabaseClient,
    assetMap: Map<string, string>,
    customerMap: Map<string, string>
): Promise<void> {
    log("Inserting asset assignments...");
    const rows = readCsv("asset-assignments.csv");

    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const records = batch.map((r) => ({
            asset_id: assetMap.get(r.serial_number),
            customer_id: customerMap.get(r.customer_name),
            season_year: parseInt(r.season_year, 10),
            is_permanent: r.is_permanent === "true",
            assigned_at: r.assigned_at || "2025-07-01",
            unassigned_at: r.unassigned_at || null,
            notes: r.notes || null,
        }));

        const { data, error } = await supabase.from("asset_assignments").insert(records).select("id");
        if (error) {
            console.error(`  Error inserting assignments batch ${i}:`, error.message);
            continue;
        }
        totalInserted += data.length;
    }

    logCount("asset_assignments", totalInserted);
}

async function insertPersonnel(
    supabase: SupabaseClient,
    hubMap: Map<string, string>
): Promise<Map<string, string>> {
    log("Inserting personnel...");
    const rows = readCsv("personnel.csv");
    const personnelMap = new Map<string, string>();

    const records = rows.map((r) => {
        const hubName = HUB_CODE_MAP[r.home_hub] || r.home_hub;
        return {
            name: r.name,
            role: r.role,
            home_hub_id: hubMap.get(hubName),
            phone: r.phone,
            email: r.email || null,
            skills: r.skills ? r.skills.split(",").map((s: string) => s.trim()) : [],
            max_drive_hrs: parseInt(r.max_drive_hours || "11", 10),
            notes: r.notes || null,
        };
    });

    const { data, error } = await supabase.from("personnel").insert(records).select("id, name");
    if (error) {
        console.error("  Error inserting personnel:", error.message);
        return personnelMap;
    }

    for (const row of data) {
        personnelMap.set(row.name, row.id);
    }

    logCount("personnel", data.length);
    return personnelMap;
}

async function insertVehicles(
    supabase: SupabaseClient,
    hubMap: Map<string, string>
): Promise<Map<string, string>> {
    log("Inserting vehicles...");
    const rows = readCsv("vehicles.csv");
    const vehicleMap = new Map<string, string>();

    const records = rows.map((r) => {
        const hubName = HUB_CODE_MAP[r.home_hub] || r.home_hub;
        return {
            name: r.vehicle_name,
            type: r.vehicle_type,
            home_hub_id: hubMap.get(hubName),
            capacity_lbs: parseInt(r.capacity_lbs, 10),
            capacity_cuft: r.capacity_cuft ? parseInt(r.capacity_cuft, 10) : null,
            status: r.status || "active",
            notes: r.notes || null,
        };
    });

    const { data, error } = await supabase.from("vehicles").insert(records).select("id, name");
    if (error) {
        console.error("  Error inserting vehicles:", error.message);
        return vehicleMap;
    }

    for (const row of data) {
        vehicleMap.set(row.name, row.id);
    }

    logCount("vehicles", data.length);
    return vehicleMap;
}

async function insertGameSchedule(
    supabase: SupabaseClient,
    customerMap: Map<string, string>,
    venueMap: Map<string, string>
): Promise<void> {
    log("Inserting game schedule...");
    const rows = readCsv("game-schedule.csv");

    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const records = batch.map((r) => {
            const customerId = customerMap.get(r.customer_name);
            // venue_name may be empty — use customer's primary venue
            const venueId = r.venue_name ? venueMap.get(r.venue_name) : null;

            return {
                customer_id: customerId,
                venue_id: venueId,
                season_year: parseInt(r.season_year, 10),
                week_number: parseInt(r.week_number, 10),
                game_date: r.game_date,
                game_time: r.game_time,
                opponent: r.opponent || null,
                is_home_game: r.is_home_game === "true",
                sidelines_served: r.sidelines_served || "both",
                season_phase: r.season_phase,
                notes: r.notes || null,
            };
        });

        const { data, error } = await supabase.from("game_schedule").insert(records).select("id");
        if (error) {
            console.error(`  Error inserting schedule batch ${i}:`, error.message);
            continue;
        }
        totalInserted += data.length;
    }

    logCount("game_schedule", totalInserted);
}

async function generatePersonnelAvailability(
    supabase: SupabaseClient,
    personnelMap: Map<string, string>
): Promise<void> {
    log("Generating personnel availability...");
    const records = [];

    for (const [name, personId] of personnelMap) {
        const absences = PERSONNEL_ABSENCES[name] || [];
        for (let week = 0; week < TOTAL_WEEKS; week++) {
            const isAvailable = !absences.includes(week);
            records.push({
                person_id: personId,
                week_number: week,
                season_year: SEASON_YEAR,
                is_available: isAvailable,
                notes: isAvailable ? null : "Planned absence",
            });
        }
    }

    const batchSize = 100;
    let totalInserted = 0;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase.from("personnel_availability").insert(batch).select("id");
        if (error) {
            console.error(`  Error inserting personnel availability batch ${i}:`, error.message);
            continue;
        }
        totalInserted += data.length;
    }

    logCount("personnel_availability", totalInserted);
}

async function generateVehicleAvailability(
    supabase: SupabaseClient,
    vehicleMap: Map<string, string>
): Promise<void> {
    log("Generating vehicle availability...");
    const records = [];

    for (const [name, vehicleId] of vehicleMap) {
        const maintenance = VEHICLE_MAINTENANCE[name] || [];
        for (let week = 0; week < TOTAL_WEEKS; week++) {
            const isAvailable = !maintenance.includes(week);
            records.push({
                vehicle_id: vehicleId,
                week_number: week,
                season_year: SEASON_YEAR,
                is_available: isAvailable,
                notes: isAvailable ? null : "Scheduled maintenance",
            });
        }
    }

    const batchSize = 100;
    let totalInserted = 0;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase.from("vehicle_availability").insert(batch).select("id");
        if (error) {
            console.error(`  Error inserting vehicle availability batch ${i}:`, error.message);
            continue;
        }
        totalInserted += data.length;
    }

    logCount("vehicle_availability", totalInserted);
}

async function insertBrandingTasks(
    supabase: SupabaseClient,
    assetMap: Map<string, string>,
    hubMap: Map<string, string>
): Promise<void> {
    log("Inserting branding tasks...");

    const records = REBRANDING_TASKS.map((task) => {
        // Calculate needed_by_date: game day of the target week (approximate as Saturday)
        const baseDate = new Date("2025-09-06"); // Week 1 Saturday
        const neededBy = new Date(baseDate);
        neededBy.setDate(baseDate.getDate() + (task.week - 1) * 7);

        return {
            asset_id: assetMap.get(task.serial),
            from_branding: task.from,
            to_branding: task.to,
            hub_id: hubMap.get(task.hub),
            needed_by_date: neededBy.toISOString().split("T")[0],
            status: "pending",
            notes: `Week ${task.week} rebranding: ${task.from} → ${task.to}`,
        };
    });

    const { data, error } = await supabase.from("branding_tasks").insert(records).select("id");
    if (error) {
        console.error("  Error inserting branding tasks:", error.message);
        return;
    }

    logCount("branding_tasks", data.length);
}

async function simulateWeek5Snapshot(
    supabase: SupabaseClient,
    assetMap: Map<string, string>,
    customerMap: Map<string, string>,
    venueMap: Map<string, string>
): Promise<void> {
    log("Simulating Week 5 snapshot...");
    log("  Reading game schedule for Weeks 0-4...");

    // Get all games for weeks 0-4
    const { data: games, error } = await supabase
        .from("game_schedule")
        .select("customer_id, venue_id, week_number")
        .lte("week_number", 4)
        .eq("season_year", SEASON_YEAR)
        .eq("is_home_game", true)
        .order("week_number", { ascending: false });

    if (error || !games) {
        console.error("  Error reading games for snapshot:", error?.message);
        return;
    }

    // For each customer, find the most recent home game venue (latest week <= 4)
    const customerLastVenue = new Map<string, string>();
    for (const game of games) {
        if (game.venue_id && !customerLastVenue.has(game.customer_id)) {
            customerLastVenue.set(game.customer_id, game.venue_id);
        }
    }

    // Get asset assignments to know which customer owns which asset
    const { data: assignments, error: assignError } = await supabase
        .from("asset_assignments")
        .select("asset_id, customer_id")
        .eq("season_year", SEASON_YEAR);

    if (assignError || !assignments) {
        console.error("  Error reading assignments for snapshot:", assignError?.message);
        return;
    }

    // Update each assigned asset's current_venue_id based on customer's last home game
    let updatedCount = 0;
    for (const assignment of assignments) {
        const venueId = customerLastVenue.get(assignment.customer_id);
        if (venueId) {
            const { error: updateError } = await supabase
                .from("assets")
                .update({
                    current_venue_id: venueId,
                    current_hub: null,
                    status: "on_site",
                })
                .eq("id", assignment.asset_id);

            if (!updateError) updatedCount++;
        }
    }

    // Mark Week 3 rebrandings as completed
    const week3Serials = ["HB-2025-CLE051", "HB-2025-CLE052"];
    for (const serial of week3Serials) {
        const assetId = assetMap.get(serial);
        if (assetId) {
            await supabase
                .from("branding_tasks")
                .update({ status: "completed" })
                .eq("asset_id", assetId);
        }
    }

    log(`  ✓ Updated ${updatedCount} assets to on-site locations`);
    log("  ✓ Marked Week 3 rebrandings as completed");
}

async function main() {
    const args = process.argv.slice(2);
    const doSnapshot = args.includes("--snapshot") && args.includes("week5");

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
        console.error("Set these environment variables before running the seed script.");
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
    });

    log("=== Dragon Seats Seed Data ===");
    log(`Season: ${SEASON_YEAR}`);
    log(`Snapshot: ${doSnapshot ? "Week 5" : "None (pre-season)"}`);
    log("");

    // Step 0: Truncate existing data
    await truncateTables(supabase);

    // Step 1: Hubs (upsert)
    const hubMap = await upsertHubs(supabase);

    // Step 2: Customers
    const customerMap = await insertCustomers(supabase);

    // Step 3: Venues (with geocoding)
    const venueMap = await insertVenues(supabase, customerMap);

    // Step 4: Contracts + Contract Items
    await insertContracts(supabase, customerMap);

    // Step 5: Assets
    const assetMap = await insertAssets(supabase, hubMap);

    // Step 6: Asset Assignments (NFL permanent)
    await insertAssetAssignments(supabase, assetMap, customerMap);

    // Step 7: Personnel
    const personnelMap = await insertPersonnel(supabase, hubMap);

    // Step 8: Vehicles
    const vehicleMap = await insertVehicles(supabase, hubMap);

    // Step 9: Game Schedule
    await insertGameSchedule(supabase, customerMap, venueMap);

    // Step 10: Personnel Availability
    await generatePersonnelAvailability(supabase, personnelMap);

    // Step 11: Vehicle Availability
    await generateVehicleAvailability(supabase, vehicleMap);

    // Step 12: Branding Tasks
    await insertBrandingTasks(supabase, assetMap, hubMap);

    // Step 13: Optional Week 5 snapshot
    if (doSnapshot) {
        await simulateWeek5Snapshot(supabase, assetMap, customerMap, venueMap);
    }

    log("");
    log("=== Seed complete ===");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
