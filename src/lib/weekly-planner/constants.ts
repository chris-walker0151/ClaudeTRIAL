/**
 * Constants for the Weekly Planner UI.
 */

import type { TripStatus, AssetType } from "./types";

export const TRIP_STATUS_CONFIG: Record<
    TripStatus,
    {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
        className?: string;
    }
> = {
    draft: { label: "Draft", variant: "outline" },
    recommended: {
        label: "Recommended",
        variant: "secondary",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    confirmed: { label: "Confirmed", variant: "default" },
    in_transit: {
        label: "In Transit",
        variant: "secondary",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    },
    on_site: {
        label: "On Site",
        variant: "secondary",
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    returning: {
        label: "Returning",
        variant: "secondary",
        className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
    completed: {
        label: "Completed",
        variant: "secondary",
        className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    },
    cancelled: { label: "Cancelled", variant: "destructive" },
};

export const SCORE_THRESHOLDS = {
    good: 80,
    fair: 60,
    poor: 0,
} as const;

export const SCORE_COLORS = {
    good: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    fair: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    poor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
} as const;

export function getScoreColor(score: number | null): string {
    if (score === null) return SCORE_COLORS.fair;
    if (score >= SCORE_THRESHOLDS.good) return SCORE_COLORS.good;
    if (score >= SCORE_THRESHOLDS.fair) return SCORE_COLORS.fair;
    return SCORE_COLORS.poor;
}

export function getScoreLabel(score: number | null): string {
    if (score === null) return "N/A";
    return Math.round(score).toString();
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
    heated_bench: "Heated Bench",
    cooling_bench: "Cooling Bench",
    hybrid_bench: "Hybrid Bench",
    dragon_shader: "Dragon Shader",
    heated_foot_deck: "Heated Foot Deck",
};

export const PERSONNEL_ROLE_LABELS: Record<string, string> = {
    driver: "Driver",
    service_tech: "Service Tech",
    lead_tech: "Lead Tech",
    sales: "Sales",
};

export const ALL_TRIP_STATUSES: TripStatus[] = [
    "draft",
    "recommended",
    "confirmed",
    "in_transit",
    "on_site",
    "returning",
    "completed",
    "cancelled",
];
