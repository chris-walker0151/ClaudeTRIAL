import type { AssetCondition, AssetStatus } from "./types";

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    needs_repair: "Needs Repair",
    out_of_service: "Out of Service",
};

export const ASSET_CONDITION_COLORS: Record<AssetCondition, string> = {
    excellent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    good: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    fair: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    needs_repair: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    out_of_service: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
    at_hub: "At Hub",
    loaded: "Loaded",
    in_transit: "In Transit",
    on_site: "On Site",
    returning: "Returning",
    rebranding: "Rebranding",
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
    at_hub: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    loaded: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    in_transit: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    on_site: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    returning: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    rebranding: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

export const ALL_ASSET_CONDITIONS: AssetCondition[] = [
    "excellent",
    "good",
    "fair",
    "needs_repair",
    "out_of_service",
];

export const ALL_ASSET_STATUSES: AssetStatus[] = [
    "at_hub",
    "loaded",
    "in_transit",
    "on_site",
    "returning",
    "rebranding",
];

export const ITEMS_PER_PAGE = 50;

export const ASSET_TRANSITION_DESCRIPTIONS: Record<string, string> = {
    "at_hub->loaded": "Loading onto vehicle",
    "loaded->in_transit": "Departing hub",
    "in_transit->on_site": "Arrived at venue",
    "on_site->returning": "Leaving venue",
    "on_site->in_transit": "Transferring to next venue",
    "returning->at_hub": "Returned to hub",
    "at_hub->rebranding": "Sent for rebranding",
    "rebranding->at_hub": "Rebranding complete",
};
