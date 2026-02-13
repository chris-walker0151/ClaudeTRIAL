/**
 * Constants for the Travel UI.
 */

import type {
    TravelRecommendationStatus,
    TravelRecommendationType,
} from "./types";

export const TRAVEL_STATUS_CONFIG: Record<
    TravelRecommendationStatus,
    {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
        className?: string;
    }
> = {
    suggested: {
        label: "Suggested",
        variant: "secondary",
        className:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    booked: {
        label: "Booked",
        variant: "default",
        className:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    declined: {
        label: "Declined",
        variant: "destructive",
        className:
            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
};

export const TRAVEL_TYPE_CONFIG: Record<
    TravelRecommendationType,
    {
        label: string;
        variant: "default" | "secondary" | "outline";
        className?: string;
    }
> = {
    hotel: {
        label: "Hotel",
        variant: "outline",
        className:
            "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700",
    },
    flight: {
        label: "Flight",
        variant: "outline",
        className:
            "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-900 dark:text-sky-200 dark:border-sky-700",
    },
};

export const ALL_TRAVEL_STATUSES: TravelRecommendationStatus[] = [
    "suggested",
    "booked",
    "declined",
];

export const ALL_TRAVEL_TYPES: TravelRecommendationType[] = [
    "hotel",
    "flight",
];