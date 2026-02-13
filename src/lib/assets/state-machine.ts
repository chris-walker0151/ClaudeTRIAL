import type { AssetStatus } from "./types";

/** Valid asset status transitions (adjacency list). */
export const ASSET_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
    at_hub: ["loaded", "rebranding"],
    loaded: ["in_transit"],
    in_transit: ["on_site"],
    on_site: ["returning", "in_transit"],  // in_transit for venue-to-venue
    returning: ["at_hub"],
    rebranding: ["at_hub"],
};

export const isValidAssetTransition = (from: AssetStatus, to: AssetStatus): boolean => {
    return ASSET_TRANSITIONS[from]?.includes(to) ?? false;
};

export interface AssetTransitionContext {
    assetId: string;
    fromStatus: AssetStatus;
    toStatus: AssetStatus;
    tripId?: string | null;
    hubId?: string | null;
    hubName?: string | null;
    venueId?: string | null;
    venueName?: string | null;
    fromLocationName?: string | null;
    toLocationName?: string | null;
    notes?: string | null;
}

/** Returns the fields to write to the `assets` table based on the transition. */
export const getAssetUpdatePayload = (ctx: AssetTransitionContext): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
        status: ctx.toStatus,
        updated_at: new Date().toISOString(),
    };

    switch (ctx.toStatus) {
        case "loaded":
            payload.current_trip_id = ctx.tripId ?? null;
            break;
        case "in_transit":
            payload.current_trip_id = ctx.tripId ?? null;
            payload.current_venue_id = null;
            break;
        case "on_site":
            payload.current_venue_id = ctx.venueId ?? null;
            break;
        case "returning":
            payload.current_venue_id = null;
            break;
        case "at_hub":
            payload.current_trip_id = null;
            payload.current_venue_id = null;
            payload.current_hub = ctx.hubId ?? null;
            break;
        case "rebranding":
            payload.current_hub = ctx.hubId ?? null;
            break;
    }

    return payload;
};

/** Returns the `asset_movements` insert payload. */
export const getMovementRecord = (ctx: AssetTransitionContext): Record<string, unknown> => {
    // Determine location types
    let fromLocationType = "unknown";
    let toLocationType = "unknown";
    let fromLocationId: string | null = null;
    let toLocationId: string | null = null;

    if (ctx.fromStatus === "at_hub" || ctx.fromStatus === "rebranding") {
        fromLocationType = "hub";
        fromLocationId = ctx.hubId ?? null;
    } else if (ctx.fromStatus === "on_site") {
        fromLocationType = "venue";
        fromLocationId = ctx.venueId ?? null;
    } else {
        fromLocationType = "in_transit";
    }

    if (ctx.toStatus === "at_hub" || ctx.toStatus === "rebranding") {
        toLocationType = "hub";
        toLocationId = ctx.hubId ?? null;
    } else if (ctx.toStatus === "on_site") {
        toLocationType = "venue";
        toLocationId = ctx.venueId ?? null;
    } else {
        toLocationType = "in_transit";
    }

    return {
        asset_id: ctx.assetId,
        from_location_type: fromLocationType,
        from_location_id: fromLocationId,
        from_location_name: ctx.fromLocationName ?? null,
        to_location_type: toLocationType,
        to_location_id: toLocationId,
        to_location_name: ctx.toLocationName ?? null,
        trip_id: ctx.tripId ?? null,
        moved_at: new Date().toISOString(),
        notes: ctx.notes ?? null,
    };
};
