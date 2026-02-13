/**
 * TypeScript types for the Assets page.
 * Mirrors database schemas for assets, movements, assignments, and branding tasks.
 */

export type AssetCondition =
    | "excellent"
    | "good"
    | "fair"
    | "needs_repair"
    | "out_of_service";

export type AssetStatus =
    | "at_hub"
    | "loaded"
    | "in_transit"
    | "on_site"
    | "returning"
    | "rebranding";

export type AssetType =
    | "heated_bench"
    | "cooling_bench"
    | "hybrid_bench"
    | "dragon_shader"
    | "heated_foot_deck";

export interface AssetListItem {
    id: string;
    serial_number: string;
    asset_type: AssetType;
    model_version: string | null;
    condition: AssetCondition;
    status: AssetStatus;
    home_hub_name: string | null;
    current_hub_name: string | null;
    current_venue_name: string | null;
    current_branding: string | null;
    weight_lbs: number | null;
    notes: string | null;
}

export interface AssetMovementInfo {
    id: string;
    from_location_type: string | null;
    from_location_name: string | null;
    to_location_type: string | null;
    to_location_name: string | null;
    moved_at: string | null;
    notes: string | null;
}

export interface AssetAssignmentInfo {
    id: string;
    customer_name: string;
    season_year: number;
    is_permanent: boolean;
    assigned_at: string | null;
    unassigned_at: string | null;
}

export interface BrandingTaskInfo {
    id: string;
    from_branding: string | null;
    to_branding: string | null;
    hub_name: string;
    needed_by_date: string | null;
    status: string;
}

export interface AssetDetail {
    id: string;
    serial_number: string;
    asset_type: AssetType;
    model_version: string | null;
    condition: AssetCondition;
    status: AssetStatus;
    home_hub_name: string | null;
    current_hub_name: string | null;
    current_venue_name: string | null;
    current_branding: string | null;
    weight_lbs: number | null;
    notes: string | null;
    assignments: AssetAssignmentInfo[];
    movements: AssetMovementInfo[];
    branding_tasks: BrandingTaskInfo[];
}

export interface AssetsPageData {
    assets: AssetListItem[];
    hubs: { id: string; name: string }[];
}

export type AssetTypeFilter = AssetType | "all";
export type ConditionFilter = AssetCondition | "all";
export type StatusFilter = AssetStatus | "all";

export interface AssetTransitionResult {
    success: boolean;
    error?: string;
    newStatus?: AssetStatus;
}
