"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SEASON_YEAR } from "@/lib/constants";
import type { VehicleDetail, VehicleTripInfo } from "@/lib/fleet/types";

export async function toggleVehicleAvailability(
    vehicleId: string, weekNumber: number, seasonYear: number, isAvailable: boolean,
) {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("vehicle_availability").select("id")
        .eq("vehicle_id", vehicleId).eq("week_number", weekNumber)
        .eq("season_year", seasonYear).maybeSingle();

    if (existing) {
        await supabase.from("vehicle_availability")
            .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
    } else {
        await supabase.from("vehicle_availability").insert({
            vehicle_id: vehicleId, week_number: weekNumber,
            season_year: seasonYear, is_available: isAvailable,
        });
    }
    revalidatePath("/fleet");
}

export async function updateVehicleStatus(vehicleId: string, status: string) {
    const supabase = await createClient();
    await supabase.from("vehicles").update({ status, updated_at: new Date().toISOString() }).eq("id", vehicleId);
    revalidatePath("/fleet");
}

export async function updateVehicleNotes(vehicleId: string, notes: string) {
    const supabase = await createClient();
    await supabase.from("vehicles").update({ notes, updated_at: new Date().toISOString() }).eq("id", vehicleId);
    revalidatePath("/fleet");
}

export async function fetchVehicleDetailAction(vehicleId: string): Promise<VehicleDetail | null> {
    const supabase = await createClient();
    const { data: vehicle } = await supabase.from("vehicles")
        .select("*, home_hub:hubs!home_hub_id(name)").eq("id", vehicleId).single();
    if (!vehicle) return null;
    const hub = vehicle.home_hub as unknown as { name: string } | null;
    const { data: trips } = await supabase.from("trips")
        .select("id, week_number, status, depart_time, return_time, total_miles, trip_stops(id)")
        .eq("vehicle_id", vehicleId).eq("season_year", SEASON_YEAR).order("week_number");

    const upcoming_trips: VehicleTripInfo[] = (trips ?? []).map((t) => {
        const stops = t.trip_stops as unknown as { id: string }[] | null;
        return {
            id: t.id, week_number: t.week_number, status: t.status,
            depart_time: t.depart_time, return_time: t.return_time,
            total_miles: t.total_miles, stop_count: stops?.length ?? 0,
        };
    });

    return {
        id: vehicle.id, name: vehicle.name, type: vehicle.type,
        home_hub_name: hub?.name ?? "Unknown",
        capacity_lbs: vehicle.capacity_lbs, capacity_cuft: vehicle.capacity_cuft,
        status: vehicle.status, notes: vehicle.notes, upcoming_trips,
    };
}
