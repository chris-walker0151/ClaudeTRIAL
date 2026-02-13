/**
 * Server-side Supabase queries for the Weekly Planner.
 * These run in server components and server actions only.
 */

import { createClient } from "@/lib/supabase/server";
import { ASSET_TYPE_LABELS } from "./constants";
import type {
    AssetInfo,
    AssetSummary,
    AssetType,
    FormData,
    GameInfo,
    HubInfo,
    OptimizerRunRow,
    PersonnelInfo,
    TripPersonnelWithInfo,
    TripStopWithVenue,
    TripWithDetails,
    VehicleInfo,
    VenueInfo,
    WeeklyPlannerData,
} from "./types";

/**
 * Fetch all data needed for the Weekly Planner page.
 * Runs 4 parallel Supabase queries with nested JOINs.
 */
export async function fetchWeekData(
    seasonYear: number,
    weekNumber: number,
): Promise<WeeklyPlannerData> {
    const supabase = await createClient();

    const [tripsResult, runsResult, gamesResult, hubsResult] =
        await Promise.all([
            // Query 1: Trips with all nested relations
            supabase
                .from("trips")
                .select(
                    `
                    *,
                    vehicle:vehicles(id, name, type, home_hub_id),
                    trip_stops(
                        *,
                        venue:venues(id, name, city, state)
                    ),
                    trip_assets(
                        *,
                        asset:assets(id, serial_number, asset_type, model_version, weight_lbs)
                    ),
                    trip_personnel(
                        *,
                        person:personnel(id, name, role)
                    )
                `,
                )
                .eq("season_year", seasonYear)
                .eq("week_number", weekNumber)
                .order("created_at", { ascending: false }),

            // Query 2: Optimizer runs for this week
            supabase
                .from("optimizer_runs")
                .select("*")
                .eq("season_year", seasonYear)
                .eq("week_number", weekNumber)
                .order("created_at", { ascending: false }),

            // Query 3: Games for this week
            supabase
                .from("game_schedule")
                .select(
                    `
                    id, week_number, game_date, game_time, opponent,
                    customer:customers(name),
                    venue:venues(name)
                `,
                )
                .eq("season_year", seasonYear)
                .eq("week_number", weekNumber)
                .order("game_date", { ascending: true }),

            // Query 4: All hubs (for origin resolution)
            supabase.from("hubs").select("id, name, code, city, state"),
        ]);

    const rawTrips = tripsResult.data ?? [];
    const runs = (runsResult.data ?? []) as OptimizerRunRow[];
    const rawGames = gamesResult.data ?? [];
    const hubs = (hubsResult.data ?? []) as HubInfo[];

    // Transform trips with proper nesting
    const trips: TripWithDetails[] = rawTrips.map((trip) =>
        transformTrip(trip, hubs),
    );

    // Transform games
    const games: GameInfo[] = rawGames.map((g) => {
        const customer = g.customer as unknown as { name: string } | null;
        const venue = g.venue as unknown as { name: string } | null;
        return {
            id: g.id,
            customer_name: customer?.name ?? "Unknown",
            venue_name: venue?.name ?? "Unknown",
            game_date: g.game_date,
            game_time: g.game_time,
            opponent: g.opponent,
            week_number: g.week_number,
        };
    });

    // Current run is the most recent completed/partial run, or latest run
    const currentRun =
        runs.find(
            (r) => r.status === "completed" || r.status === "partial",
        ) ?? runs[0] ?? null;

    return {
        trips,
        currentRun,
        allRuns: runs,
        games,
        weekNumber,
        seasonYear,
    };
}

/**
 * Fetch form data needed for manual trip creation.
 */
export async function fetchFormData(): Promise<FormData> {
    const supabase = await createClient();

    const [vehiclesResult, hubsResult, venuesResult, personnelResult, assetsResult] =
        await Promise.all([
            supabase
                .from("vehicles")
                .select("id, name, type, home_hub_id")
                .eq("status", "active")
                .order("name"),
            supabase
                .from("hubs")
                .select("id, name, code, city, state")
                .order("name"),
            supabase
                .from("venues")
                .select("id, name, city, state")
                .order("name"),
            supabase
                .from("personnel")
                .select("id, name, role")
                .order("name"),
            supabase
                .from("assets")
                .select("id, serial_number, asset_type, model_version, weight_lbs")
                .eq("status", "at_hub")
                .order("serial_number"),
        ]);

    return {
        vehicles: (vehiclesResult.data ?? []) as VehicleInfo[],
        hubs: (hubsResult.data ?? []) as HubInfo[],
        venues: (venuesResult.data ?? []) as VenueInfo[],
        personnel: (personnelResult.data ?? []) as PersonnelInfo[],
        assets: (assetsResult.data ?? []) as AssetInfo[],
    };
}

// ============================================================
// Transform helpers
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

function transformTrip(raw: any, hubs: HubInfo[]): TripWithDetails {
    const vehicle: VehicleInfo | null = raw.vehicle ?? null;

    // Resolve origin hub from origin_id
    const originHub =
        hubs.find((h) => h.id === raw.origin_id) ??
        (vehicle
            ? hubs.find((h) => h.id === vehicle.home_hub_id)
            : null) ??
        null;

    // Transform and sort stops
    const rawStops = (raw.trip_stops ?? []) as any[];
    const rawAssets = (raw.trip_assets ?? []) as any[];

    // Group assets by stop_id
    const assetsByStop = new Map<string, AssetInfo[]>();
    const allAssets: AssetInfo[] = [];

    for (const ta of rawAssets) {
        const asset: AssetInfo = ta.asset ?? {
            id: ta.asset_id,
            serial_number: "Unknown",
            asset_type: "heated_bench" as AssetType,
            model_version: null,
            weight_lbs: null,
        };
        allAssets.push(asset);

        const stopId = ta.stop_id ?? "__unassigned__";
        const existing = assetsByStop.get(stopId) ?? [];
        existing.push(asset);
        assetsByStop.set(stopId, existing);
    }

    const stops: TripStopWithVenue[] = rawStops
        .sort((a: any, b: any) => (a.stop_order ?? 0) - (b.stop_order ?? 0))
        .map((s: any) => ({
            id: s.id,
            trip_id: s.trip_id,
            venue_id: s.venue_id,
            stop_order: s.stop_order,
            arrival_time: s.arrival_time,
            depart_time: s.depart_time,
            action: s.action,
            requires_hub_return: s.requires_hub_return ?? false,
            hub_return_reason: s.hub_return_reason,
            notes: s.notes,
            venue: s.venue ?? {
                id: s.venue_id,
                name: "Unknown Venue",
                city: null,
                state: null,
            },
            assets: assetsByStop.get(s.id) ?? [],
        }));

    // Transform personnel
    const personnel: TripPersonnelWithInfo[] = (
        raw.trip_personnel ?? []
    ).map((tp: any) => ({
        id: tp.id,
        trip_id: tp.trip_id,
        person_id: tp.person_id,
        role_on_trip: tp.role_on_trip,
        person: tp.person ?? {
            id: tp.person_id,
            name: "Unknown",
            role: "service_tech",
        },
    }));

    // Compute asset summary
    const assetSummary = computeAssetSummary(allAssets);

    return {
        id: raw.id,
        week_number: raw.week_number,
        season_year: raw.season_year,
        optimizer_run_id: raw.optimizer_run_id,
        status: raw.status,
        vehicle_id: raw.vehicle_id,
        origin_type: raw.origin_type,
        origin_id: raw.origin_id,
        depart_time: raw.depart_time,
        return_time: raw.return_time,
        total_miles: raw.total_miles,
        total_drive_hrs: raw.total_drive_hrs,
        notes: raw.notes,
        is_recommended: raw.is_recommended,
        is_manual: raw.is_manual,
        optimizer_score: raw.optimizer_score,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        vehicle,
        origin_hub: originHub,
        stops,
        personnel,
        asset_summary: assetSummary,
    };
}

function computeAssetSummary(assets: AssetInfo[]): AssetSummary {
    const byType: Partial<Record<AssetType, number>> = {};

    for (const asset of assets) {
        const t = asset.asset_type;
        if (t in ASSET_TYPE_LABELS) {
            byType[t] = (byType[t] ?? 0) + 1;
        }
    }

    return {
        total: assets.length,
        by_type: byType,
    };
}

/* eslint-enable @typescript-eslint/no-explicit-any */
