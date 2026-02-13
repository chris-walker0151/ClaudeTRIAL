/**
 * Constants for the Customers page.
 */
import type { SportType, ContractType } from "./types";

export const SPORT_TYPE_LABELS: Record<SportType, string> = {
    nfl: "NFL",
    ncaa_football: "NCAA Football",
    mlb: "MLB",
    pga: "PGA",
    tennis: "Tennis",
    other: "Other",
};

export const SPORT_TYPE_COLORS: Record<SportType, string> = {
    nfl: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    ncaa_football: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    mlb: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    pga: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    tennis: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
    lease_1yr: "1-Year Lease",
    lease_3yr: "3-Year Lease",
    lease_5yr: "5-Year Lease",
    one_off_rental: "One-Off Rental",
    conference_deal: "Conference Deal",
};

export const ALL_SPORT_TYPES: SportType[] = [
    "nfl",
    "ncaa_football",
    "mlb",
    "pga",
    "tennis",
    "other",
];