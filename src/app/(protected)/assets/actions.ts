"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
    AssetCondition,
    AssetDetail,
    AssetMovementInfo,
    AssetAssignmentInfo,
    AssetStatus,
    AssetTransitionResult,
    BrandingTaskInfo,
} from "@/lib/assets/types";
import {
    isValidAssetTransition,
    getAssetUpdatePayload,
    getMovementRecord,
} from "@/lib/assets/state-machine";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Update a single asset's condition.
 */
export async function updateAssetCondition(
    assetId: string,
    condition: AssetCondition,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("assets")
        .update({ condition, updated_at: new Date().toISOString() })
        .eq("id", assetId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/assets");
    return { success: true };
}

/**
 * Bulk update condition for multiple assets.
 */
export async function bulkUpdateCondition(
    assetIds: string[],
    condition: AssetCondition,
): Promise<{ success: boolean; count: number; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("assets")
        .update({ condition, updated_at: new Date().toISOString() })
        .in("id", assetIds)
        .select("id");

    if (error) {
        return { success: false, count: 0, error: error.message };
    }

    revalidatePath("/assets");
    return { success: true, count: data?.length ?? 0 };
}

/**
 * Update an asset's notes.
 */
export async function updateAssetNotes(
    assetId: string,
    notes: string,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("assets")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", assetId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/assets");
    return { success: true };
}

/**
 * Fetch full asset detail including movements, assignments, and branding tasks.
 * This is a server action so it can be called from client components.
 */
export async function fetchAssetDetailAction(
    assetId: string,
): Promise<{ success: boolean; data?: AssetDetail; error?: string }> {
    const supabase = await createClient();

    const { data: raw, error: assetError } = await supabase
        .from("assets")
        .select(`
            id, serial_number, asset_type, model_version,
            condition, status, current_branding, weight_lbs, notes,
            home_hub:hubs!home_hub_id(name),
            current_hub_rel:hubs!current_hub(name),
            current_venue:venues!current_venue_id(name)
        `)
        .eq("id", assetId)
        .single();

    if (assetError || !raw) {
        return {
            success: false,
            error: assetError?.message ?? "Asset not found",
        };
    }

    const { data: movementsRaw } = await supabase
        .from("asset_movements")
        .select(`
            id, from_location_type, from_location_name,
            to_location_type, to_location_name, moved_at, notes
        `)
        .eq("asset_id", assetId)
        .order("moved_at", { ascending: false })
        .limit(20);

    const { data: assignmentsRaw } = await supabase
        .from("asset_assignments")
        .select(`
            id, season_year, is_permanent, assigned_at, unassigned_at,
            customer:customers!customer_id(name)
        `)
        .eq("asset_id", assetId)
        .order("assigned_at", { ascending: false });

    const { data: brandingRaw } = await supabase
        .from("branding_tasks")
        .select(`
            id, from_branding, to_branding, needed_by_date, status,
            hub:hubs!hub_id(name)
        `)
        .eq("asset_id", assetId)
        .order("needed_by_date", { ascending: false });

    const homeHub = (raw as any).home_hub as unknown as { name: string } | null;
    const currentHub = (raw as any).current_hub_rel as unknown as { name: string } | null;
    const currentVenue = (raw as any).current_venue as unknown as { name: string } | null;

    const movements: AssetMovementInfo[] = (movementsRaw ?? []).map((m: any) => ({
        id: m.id,
        from_location_type: m.from_location_type,
        from_location_name: m.from_location_name,
        to_location_type: m.to_location_type,
        to_location_name: m.to_location_name,
        moved_at: m.moved_at,
        notes: m.notes,
    }));

    const assignments: AssetAssignmentInfo[] = (assignmentsRaw ?? []).map((a: any) => {
        const customer = a.customer as unknown as { name: string } | null;
        return {
            id: a.id,
            customer_name: customer?.name ?? "Unknown",
            season_year: a.season_year,
            is_permanent: a.is_permanent,
            assigned_at: a.assigned_at,
            unassigned_at: a.unassigned_at,
        };
    });

    const brandingTasks: BrandingTaskInfo[] = (brandingRaw ?? []).map((b: any) => {
        const hub = b.hub as unknown as { name: string } | null;
        return {
            id: b.id,
            from_branding: b.from_branding,
            to_branding: b.to_branding,
            hub_name: hub?.name ?? "Unknown",
            needed_by_date: b.needed_by_date,
            status: b.status,
        };
    });

    const detail: AssetDetail = {
        id: raw.id,
        serial_number: raw.serial_number,
        asset_type: (raw as any).asset_type,
        model_version: (raw as any).model_version,
        condition: (raw as any).condition,
        status: (raw as any).status,
        home_hub_name: homeHub?.name ?? null,
        current_hub_name: currentHub?.name ?? null,
        current_venue_name: currentVenue?.name ?? null,
        current_branding: (raw as any).current_branding,
        weight_lbs: (raw as any).weight_lbs,
        notes: (raw as any).notes,
        assignments,
        movements,
        branding_tasks: brandingTasks,
    };

    return { success: true, data: detail };
}

/**
 * Transition an asset's status through the state machine.
 * Validates the transition, updates the asset, and logs the movement.
 */
export async function transitionAssetStatus(
    assetId: string,
    newStatus: AssetStatus,
    context?: {
        tripId?: string;
        hubId?: string;
        venueId?: string;
        notes?: string;
    },
): Promise<AssetTransitionResult> {
    const supabase = await createClient();

    // Fetch current asset with joined names
    const { data: asset, error: fetchError } = await supabase
        .from("assets")
        .select(`
            id, status, current_hub, current_venue_id, current_trip_id,
            home_hub:hubs!home_hub_id(id, name),
            current_hub_rel:hubs!current_hub(id, name),
            current_venue:venues!current_venue_id(id, name)
        `)
        .eq("id", assetId)
        .single();

    if (fetchError || !asset) {
        return { success: false, error: fetchError?.message ?? "Asset not found" };
    }

    const currentStatus = (asset as any).status as AssetStatus;

    if (!isValidAssetTransition(currentStatus, newStatus)) {
        return {
            success: false,
            error: `Invalid transition: ${currentStatus} → ${newStatus}`,
        };
    }

    const currentHubRel = (asset as any).current_hub_rel as unknown as { id: string; name: string } | null;
    const currentVenue = (asset as any).current_venue as unknown as { id: string; name: string } | null;
    const homeHub = (asset as any).home_hub as unknown as { id: string; name: string } | null;

    // Determine from/to location names
    let fromLocationName: string | null = null;
    let toLocationName: string | null = null;

    if (currentStatus === "at_hub" || currentStatus === "rebranding") {
        fromLocationName = currentHubRel?.name ?? homeHub?.name ?? null;
    } else if (currentStatus === "on_site") {
        fromLocationName = currentVenue?.name ?? null;
    } else {
        fromLocationName = "In Transit";
    }

    if (newStatus === "at_hub" || newStatus === "rebranding") {
        toLocationName = currentHubRel?.name ?? homeHub?.name ?? null;
    } else if (newStatus === "on_site") {
        // Will be set by the caller via context
        toLocationName = null;
    } else {
        toLocationName = "In Transit";
    }

    const ctx = {
        assetId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        tripId: context?.tripId ?? (asset as any).current_trip_id,
        hubId: context?.hubId ?? (asset as any).current_hub ?? homeHub?.id,
        hubName: currentHubRel?.name ?? homeHub?.name,
        venueId: context?.venueId ?? (asset as any).current_venue_id,
        venueName: currentVenue?.name,
        fromLocationName,
        toLocationName,
        notes: context?.notes,
    };

    const updatePayload = getAssetUpdatePayload(ctx);
    const movementRecord = getMovementRecord(ctx);

    // Update asset
    const { error: updateError } = await supabase
        .from("assets")
        .update(updatePayload)
        .eq("id", assetId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    // Insert movement record
    const { error: movementError } = await supabase
        .from("asset_movements")
        .insert(movementRecord);

    if (movementError) {
        console.error("Failed to log asset movement:", movementError.message);
        // Don't fail the transition if movement logging fails
    }

    revalidatePath("/assets");
    revalidatePath("/weekly-planner");
    return { success: true, newStatus };
}

/* eslint-enable @typescript-eslint/no-explicit-any */
