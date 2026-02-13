import type { PersonnelRole, WeekStatus } from "./types";

export const ROLE_COLORS: Record<PersonnelRole, string> = {
    driver: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    service_tech: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    lead_tech: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    sales: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
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
