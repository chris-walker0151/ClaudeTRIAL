import type { TripStatus } from "./types";

/** Valid trip status transitions (adjacency list). */
export const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
    draft: ["confirmed", "cancelled"],
    recommended: ["confirmed", "cancelled"],
    confirmed: ["in_transit", "cancelled"],
    in_transit: ["on_site"],
    on_site: ["returning"],
    returning: ["completed"],
    completed: [],
    cancelled: [],
};

export const isValidTripTransition = (from: TripStatus, to: TripStatus): boolean => {
    return TRIP_TRANSITIONS[from]?.includes(to) ?? false;
};

export interface TripTransitionButton {
    toStatus: TripStatus;
    label: string;
    iconName: string;
    description: string;
}

/** Returns the set of operational transition buttons to render for a given status. */
export const getNextTripTransitions = (currentStatus: TripStatus): TripTransitionButton[] => {
    const transitions = TRIP_TRANSITIONS[currentStatus] ?? [];
    return transitions
        .map((toStatus) => {
            const key = `${currentStatus}->${toStatus}`;
            return TRIP_TRANSITION_MAP[key] ?? null;
        })
        .filter((t): t is TripTransitionButton => t !== null);
};

const TRIP_TRANSITION_MAP: Record<string, TripTransitionButton> = {
    "draft->confirmed": {
        toStatus: "confirmed",
        label: "Confirm Trip",
        iconName: "CheckCircle",
        description: "Confirm this trip for execution",
    },
    "draft->cancelled": {
        toStatus: "cancelled",
        label: "Cancel Trip",
        iconName: "XCircle",
        description: "Cancel this trip",
    },
    "recommended->confirmed": {
        toStatus: "confirmed",
        label: "Confirm Trip",
        iconName: "CheckCircle",
        description: "Accept this recommendation",
    },
    "recommended->cancelled": {
        toStatus: "cancelled",
        label: "Cancel Trip",
        iconName: "XCircle",
        description: "Decline this recommendation",
    },
    "confirmed->in_transit": {
        toStatus: "in_transit",
        label: "Mark Departed",
        iconName: "Truck",
        description: "Vehicle has departed from hub",
    },
    "confirmed->cancelled": {
        toStatus: "cancelled",
        label: "Cancel Trip",
        iconName: "XCircle",
        description: "Cancel this confirmed trip",
    },
    "in_transit->on_site": {
        toStatus: "on_site",
        label: "Mark Arrived",
        iconName: "MapPinCheck",
        description: "Vehicle has arrived at venue",
    },
    "on_site->returning": {
        toStatus: "returning",
        label: "Mark Returning",
        iconName: "CornerDownLeft",
        description: "Vehicle is returning to hub",
    },
    "returning->completed": {
        toStatus: "completed",
        label: "Mark Completed",
        iconName: "CheckCircle2",
        description: "Trip is complete, vehicle back at hub",
    },
};
