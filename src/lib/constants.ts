/**
 * Application-wide constants
 */

export const APP_NAME = "Dragon Seats";
export const APP_DESCRIPTION = "Logistics operations cockpit for Dragon Seats";

export const SEASON_YEAR = 2025;
export const WEEKS_IN_SEASON = 18;
export const MIN_WEEK = 0;

export const HUBS = [
    { code: "CLE", name: "Cleveland", state: "OH" },
    { code: "KC", name: "Kansas City", state: "KS" },
    { code: "JAX", name: "Jacksonville", state: "FL" },
] as const;

export const NAV_ITEMS = [
    { label: "Weekly Planner", href: "/weekly-planner", icon: "CalendarDays", phase: 4 },
    { label: "Assets", href: "/assets", icon: "Package", phase: 5 },
    { label: "Customers", href: "/customers", icon: "Users", phase: 5 },
    { label: "Personnel", href: "/personnel", icon: "UserCog", phase: 5 },
    { label: "Fleet", href: "/fleet", icon: "Truck", phase: 5 },
    { label: "Travel", href: "/travel", icon: "Plane", phase: 6 },
    { label: "Season Overview", href: "/season-overview", icon: "BarChart3", phase: 5 },
    { label: "Import", href: "/import", icon: "Upload", phase: 2 },
    { label: "Settings", href: "/settings", icon: "Settings", phase: 6 },
] as const;
