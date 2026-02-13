import { createClient } from "@/lib/supabase/server";
import { APPROVABLE_STATUSES, LOCKED_STATUS } from "./constants";
import type { GameplanReadiness } from "./types";

/**
 * Check whether a week's gameplan is ready for approval.
 *
 * Readiness requires every active (non-cancelled) trip to be confirmed,
 * but the caller may still choose to approve with warnings.
 */
export async function checkGameplanReadiness(
    weekNumber: number,
    seasonYear: number,
): Promise<GameplanReadiness> {
    const supabase = await createClient();

    const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("id, status, vehicle_id")
        .eq("week_number", weekNumber)
        .eq("season_year", seasonYear)
        .neq("status", "cancelled");

    if (tripsError) {
        return {
            isReady: false,
            totalTrips: 0,
            confirmedTrips: 0,
            unconfirmedTrips: 0,
            tripsWithoutPersonnel: 0,
            tripsWithoutVehicle: 0,
            reasons: ["Failed to fetch trips: " + tripsError.message],
        };
    }

    const activeTrips = trips ?? [];
    const tripIds = activeTrips.map((t) => t.id);

    let personnelTripIds: string[] = [];
    if (tripIds.length > 0) {
        const { data: personnel, error: personnelError } = await supabase
            .from("trip_personnel")
            .select("trip_id")
            .in("trip_id", tripIds);

        if (!personnelError && personnel) {
            personnelTripIds = [
                ...new Set(personnel.map((p) => p.trip_id)),
            ];
        }
    }

    const confirmedTrips = activeTrips.filter(
        (t) => t.status === "confirmed",
    ).length;

    const unconfirmedTrips = activeTrips.filter((t) =>
        (APPROVABLE_STATUSES as readonly string[]).includes(t.status),
    ).length;

    const tripsWithoutPersonnel = tripIds.filter(
        (id) => !personnelTripIds.includes(id),
    ).length;

    const tripsWithoutVehicle = activeTrips.filter(
        (t) => !t.vehicle_id,
    ).length;

    const isReady = activeTrips.length > 0 && unconfirmedTrips === 0;

    const reasons: string[] = [];
    if (activeTrips.length === 0) {
        reasons.push("No trips for this week");
    }
    if (unconfirmedTrips > 0) {
        reasons.push(unconfirmedTrips + " trip(s) not yet confirmed");
    }
    if (tripsWithoutPersonnel > 0) {
        reasons.push(tripsWithoutPersonnel + " trip(s) without personnel");
    }
    if (tripsWithoutVehicle > 0) {
        reasons.push(tripsWithoutVehicle + " trip(s) without a vehicle");
    }

    return {
        isReady,
        totalTrips: activeTrips.length,
        confirmedTrips,
        unconfirmedTrips,
        tripsWithoutPersonnel,
        tripsWithoutVehicle,
        reasons,
    };
}

/**
 * Lock all draft / recommended trips for the given week by setting
 * their status to "confirmed".
 *
 * Returns the number of rows updated, or an error message on failure.
 */
export async function lockTripsForGameplan(
    weekNumber: number,
    seasonYear: number,
): Promise<{ locked: number; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("trips")
        .update({
            status: LOCKED_STATUS,
            updated_at: new Date().toISOString(),
        })
        .eq("week_number", weekNumber)
        .eq("season_year", seasonYear)
        .in("status", [...APPROVABLE_STATUSES])
        .select("id");

    if (error) {
        return { locked: 0, error: error.message };
    }

    return { locked: data?.length ?? 0 };
}
