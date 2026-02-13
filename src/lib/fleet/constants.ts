import type { WeekStatus } from "./types";

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
    active: "Active",
    maintenance: "Maintenance",
    retired: "Retired",
};

export const VEHICLE_STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    maintenance: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    retired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export const WEEK_STATUS_COLORS: Record<WeekStatus, string> = {
    available: "bg-green-500",
    on_trip: "bg-blue-500",
    unavailable: "bg-red-500",
};

export const WEEK_STATUS_LABELS: Record<WeekStatus, string> = {
    available: "Available",
    on_trip: "On Trip",
    unavailable: "Unavailable",
};
