/**
 * Server-side Supabase queries for the Fleet page.
 */

import { createClient } from "@/lib/supabase/server";
import { WEEKS_IN_SEASON } from "@/lib/constants";
import type {
    FleetPageData, FleetStats, VehicleAvailabilityRow,
    VehicleListItem, WeekAvailability, WeekStatus,
} from "./types";

export async function fetchFleetData(
    seasonYear: number,
): Promise<FleetPageData> {
    const supabase = await createClient();

    const [vehiclesResult, availabilityResult, tripsResult] =
        await Promise.all([
            supabase
                .from("vehicles")
                .select("*, home_hub:hubs!home_hub_id(name)")
                .order("name"),
            supabase
                .from("vehicle_availability")
                .select("*")
                .eq("season_year", seasonYear),
            supabase
                .from("trips")
                .select("id, week_number, vehicle_id, status")
                .eq("season_year", seasonYear)
                .not("vehicle_id", "is", null),
        ]);

    const rawVehicles = vehiclesResult.data ?? [];
    const rawAvailability = availabilityResult.data ?? [];
    const rawTrips = tripsResult.data ?? [];

    const vehicles: VehicleListItem[] = rawVehicles.map((v) => {
        const hub = v.home_hub as unknown as { name: string } | null;
        return {
            id: v.id, name: v.name, type: v.type,
            home_hub_id: v.home_hub_id,
            home_hub_name: hub?.name ?? "Unknown",
            capacity_lbs: v.capacity_lbs, capacity_cuft: v.capacity_cuft,
            status: v.status, notes: v.notes,
        };
    });
    /* Build lookup: vehicle_id -> Set of week numbers with trips */
    const tripWeeksByVehicle = new Map<string, Set<number>>();
    for (const trip of rawTrips) {
        if (!trip.vehicle_id) continue;
        const existing = tripWeeksByVehicle.get(trip.vehicle_id) ?? new Set();
        existing.add(trip.week_number);
        tripWeeksByVehicle.set(trip.vehicle_id, existing);
    }

    /* Build lookup: vehicleId-weekNumber -> false for explicitly unavailable */
    const unavailableSet = new Set<string>();
    for (const row of rawAvailability) {
        if (!row.is_available) {
            unavailableSet.add(row.vehicle_id + "-" + row.week_number);
        }
    }

    /* Build availability grid */
    const availability: VehicleAvailabilityRow[] = vehicles.map((vehicle) => {
        const tripWeeks = tripWeeksByVehicle.get(vehicle.id);
        const weeks: WeekAvailability[] = Array.from(
            { length: WEEKS_IN_SEASON },
            (_, i) => {
                const weekNum = i + 1;
                const key = vehicle.id + "-" + weekNum;
                let status: WeekStatus = "available";
                if (tripWeeks?.has(weekNum)) {
                    status = "on_trip";
                } else if (unavailableSet.has(key)) {
                    status = "unavailable";
                }
                return { week_number: weekNum, status };
            },
        );
        return { vehicle, weeks };
    });

    const stats = computeFleetStats(vehicles);

    /* Deduplicate hubs for filter dropdown */
    const hubMap = new Map<string, string>();
    for (const v of vehicles) {
        if (!hubMap.has(v.home_hub_id)) {
            hubMap.set(v.home_hub_id, v.home_hub_name);
        }
    }
    const hubs = Array.from(hubMap, ([id, name]) => ({ id, name }));

    return { vehicles, availability, stats, hubs };
}

function computeFleetStats(vehicles: VehicleListItem[]): FleetStats {
    const total = vehicles.length;
    const active = vehicles.filter((v) => v.status === "active").length;
    const maintenance = vehicles.filter((v) => v.status === "maintenance").length;

    const hubCounts = new Map<string, number>();
    for (const v of vehicles) {
        hubCounts.set(v.home_hub_name, (hubCounts.get(v.home_hub_name) ?? 0) + 1);
    }
    const byHub = Array.from(hubCounts, ([hub_name, count]) => ({
        hub_name, count,
    }));

    return { total, active, maintenance, byHub };
}
