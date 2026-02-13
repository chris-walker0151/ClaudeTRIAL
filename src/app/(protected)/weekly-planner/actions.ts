"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TripStatus, TripTransitionResult } from "@/lib/weekly-planner/types";
import { isValidTripTransition } from "@/lib/weekly-planner/trip-state-machine";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Update a trip's status (e.g., confirm, cancel).
 */
export async function updateTripStatus(
    tripId: string,
    newStatus: TripStatus,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("trips")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", tripId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/weekly-planner");
    return { success: true };
}

/**
 * Update a trip's notes.
 */
export async function updateTripNotes(
    tripId: string,
    notes: string,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("trips")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", tripId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/weekly-planner");
    return { success: true };
}

/**
 * Accept all recommended trips for a given week,
 * changing their status from "recommended" to "confirmed".
 */
export async function acceptAllRecommendations(
    weekNumber: number,
    seasonYear: number,
): Promise<{ success: boolean; count: number; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("trips")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("week_number", weekNumber)
        .eq("season_year", seasonYear)
        .eq("status", "recommended")
        .select("id");

    if (error) {
        return { success: false, count: 0, error: error.message };
    }

    revalidatePath("/weekly-planner");
    return { success: true, count: data?.length ?? 0 };
}

/**
 * Create a manual trip with stops, assets, and personnel.
 */
export async function createManualTrip(input: {
    weekNumber: number;
    seasonYear: number;
    vehicleId: string;
    originHubId: string;
    departTime?: string;
    notes?: string;
    stops: {
        venueId: string;
        stopOrder: number;
        action: string;
        arrivalTime?: string;
        departTime?: string;
    }[];
    assetIds: string[];
    personnelIds: { personId: string; roleOnTrip: string }[];
}): Promise<{ success: boolean; tripId?: string; error?: string }> {
    const supabase = await createClient();

    // Insert trip
    const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
            week_number: input.weekNumber,
            season_year: input.seasonYear,
            vehicle_id: input.vehicleId,
            origin_type: "hub",
            origin_id: input.originHubId,
            depart_time: input.departTime ?? null,
            status: "draft",
            is_recommended: false,
            is_manual: true,
            notes: input.notes ?? null,
        })
        .select("id")
        .single();

    if (tripError || !trip) {
        return {
            success: false,
            error: tripError?.message ?? "Failed to create trip",
        };
    }

    const tripId = trip.id;

    // Insert stops
    if (input.stops.length > 0) {
        const stopInserts = input.stops.map((s) => ({
            trip_id: tripId,
            venue_id: s.venueId,
            stop_order: s.stopOrder,
            action: s.action,
            arrival_time: s.arrivalTime ?? null,
            depart_time: s.departTime ?? null,
        }));

        const { error: stopsError } = await supabase
            .from("trip_stops")
            .insert(stopInserts);

        if (stopsError) {
            return {
                success: false,
                tripId,
                error: `Trip created but stops failed: ${stopsError.message}`,
            };
        }
    }

    // Insert assets
    if (input.assetIds.length > 0) {
        const assetInserts = input.assetIds.map((assetId) => ({
            trip_id: tripId,
            asset_id: assetId,
        }));

        const { error: assetsError } = await supabase
            .from("trip_assets")
            .insert(assetInserts);

        if (assetsError) {
            return {
                success: false,
                tripId,
                error: `Trip created but assets failed: ${assetsError.message}`,
            };
        }
    }

    // Insert personnel
    if (input.personnelIds.length > 0) {
        const personnelInserts = input.personnelIds.map((p) => ({
            trip_id: tripId,
            person_id: p.personId,
            role_on_trip: p.roleOnTrip,
        }));

        const { error: personnelError } = await supabase
            .from("trip_personnel")
            .insert(personnelInserts);

        if (personnelError) {
            return {
                success: false,
                tripId,
                error: `Trip created but personnel failed: ${personnelError.message}`,
            };
        }
    }

    revalidatePath("/weekly-planner");
    return { success: true, tripId };
}

/**
 * Delete a trip. Only allowed for draft or manual trips.
 */
export async function deleteTrip(
    tripId: string,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Only allow deletion of draft or manual trips
    const { data: trip } = await supabase
        .from("trips")
        .select("id, status, is_manual")
        .eq("id", tripId)
        .single();

    if (!trip) {
        return { success: false, error: "Trip not found" };
    }

    if (trip.status !== "draft" && !trip.is_manual) {
        return {
            success: false,
            error: "Only draft or manual trips can be deleted",
        };
    }

    const { error } = await supabase.from("trips").delete().eq("id", tripId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/weekly-planner");
    return { success: true };
}

/**
 * Transition a trip's status through the state machine.
 * Also cascades status changes to all associated assets.
 */
export async function transitionTripStatus(
    tripId: string,
    newStatus: TripStatus,
): Promise<TripTransitionResult> {
    const supabase = await createClient();

    // Fetch trip with assets and stops
    const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select(`
            id, status, origin_id, origin_type,
            origin_hub:hubs!origin_id(id, name),
            trip_assets(asset_id),
            trip_stops(id, venue_id, stop_order, venue:venues!venue_id(id, name))
        `)
        .eq("id", tripId)
        .single();

    if (tripError || !trip) {
        return { success: false, error: tripError?.message ?? "Trip not found" };
    }

    const currentStatus = (trip as any).status as TripStatus;

    if (!isValidTripTransition(currentStatus, newStatus)) {
        return {
            success: false,
            error: `Invalid transition: ${currentStatus} → ${newStatus}`,
        };
    }

    // Update trip status
    const { error: updateError } = await supabase
        .from("trips")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", tripId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    // Cascade to assets
    const tripAssets = ((trip as any).trip_assets ?? []) as { asset_id: string }[];
    const assetIds = tripAssets.map((ta) => ta.asset_id);
    let assetsUpdated = 0;

    if (assetIds.length > 0) {
        const originHub = (trip as any).origin_hub as unknown as { id: string; name: string } | null;
        const stops = ((trip as any).trip_stops ?? []) as Array<{
            id: string;
            venue_id: string;
            stop_order: number;
            venue: { id: string; name: string } | null;
        }>;
        const firstStop = stops.sort((a, b) => a.stop_order - b.stop_order)[0] ?? null;

        let assetUpdate: Record<string, unknown> = {};
        let assetNewStatus: string | null = null;
        let fromLocType = "unknown";
        let fromLocName: string | null = null;
        let toLocType = "unknown";
        let toLocName: string | null = null;

        switch (newStatus) {
            case "in_transit":
                assetNewStatus = "in_transit";
                assetUpdate = {
                    status: "in_transit",
                    current_trip_id: tripId,
                    current_venue_id: null,
                    updated_at: new Date().toISOString(),
                };
                fromLocType = "hub";
                fromLocName = originHub?.name ?? null;
                toLocType = "in_transit";
                toLocName = "In Transit";
                break;

            case "on_site":
                assetNewStatus = "on_site";
                assetUpdate = {
                    status: "on_site",
                    current_venue_id: firstStop?.venue_id ?? null,
                    updated_at: new Date().toISOString(),
                };
                fromLocType = "in_transit";
                fromLocName = "In Transit";
                toLocType = "venue";
                toLocName = (firstStop?.venue as any)?.name ?? null;
                break;

            case "returning":
                assetNewStatus = "returning";
                assetUpdate = {
                    status: "returning",
                    current_venue_id: null,
                    updated_at: new Date().toISOString(),
                };
                fromLocType = "venue";
                fromLocName = (firstStop?.venue as any)?.name ?? null;
                toLocType = "in_transit";
                toLocName = "In Transit";
                break;

            case "completed":
                assetNewStatus = "at_hub";
                assetUpdate = {
                    status: "at_hub",
                    current_trip_id: null,
                    current_venue_id: null,
                    current_hub: originHub?.id ?? null,
                    updated_at: new Date().toISOString(),
                };
                fromLocType = "in_transit";
                fromLocName = "In Transit";
                toLocType = "hub";
                toLocName = originHub?.name ?? null;
                break;
        }

        if (assetNewStatus) {
            // Bulk update assets
            const { data: updated } = await supabase
                .from("assets")
                .update(assetUpdate)
                .in("id", assetIds)
                .select("id");

            assetsUpdated = updated?.length ?? 0;

            // Insert movement records for each asset
            const movementRecords = assetIds.map((assetId) => ({
                asset_id: assetId,
                from_location_type: fromLocType,
                from_location_name: fromLocName,
                to_location_type: toLocType,
                to_location_name: toLocName,
                trip_id: tripId,
                moved_at: new Date().toISOString(),
                notes: `Trip ${currentStatus} → ${newStatus}`,
            }));

            const { error: movementError } = await supabase
                .from("asset_movements")
                .insert(movementRecords);

            if (movementError) {
                console.error("Failed to log asset movements:", movementError.message);
            }
        }
    }

    revalidatePath("/weekly-planner");
    revalidatePath("/assets");
    return { success: true, newStatus, assetsUpdated };
}
