import type { CellStatus, SportType } from "./types";

export const CELL_STATUS_COLORS: Record<CellStatus, string> = {
    confirmed: "bg-green-500",
    recommended: "bg-blue-500",
    draft: "bg-amber-500",
    no_game: "bg-gray-200 dark:bg-gray-700",
    unassigned: "bg-red-500",
};

export const CELL_STATUS_LABELS: Record<CellStatus, string> = {
    confirmed: "Confirmed",
    recommended: "Recommended",
    draft: "Draft",
    no_game: "No Game",
    unassigned: "Unassigned",
};

export const SPORT_TYPE_LABELS: Record<SportType, string> = {
    nfl: "NFL",
    ncaa_football: "NCAA Football",
    mlb: "MLB",
    pga: "PGA",
    tennis: "Tennis",
    other: "Other",
};

export const ALL_SPORT_TYPES: SportType[] = [
    "nfl", "ncaa_football", "mlb", "pga", "tennis", "other"
];
