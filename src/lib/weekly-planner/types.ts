/**
 * TypeScript types for the Weekly Planner UI.
 * Mirrors database schemas + Python optimizer output types.
 */

// ============================================================
// Enum types (matching database enums)
// ============================================================

export type TripStatus =
    | "draft"
    | "recommended"
    | "confirmed"
    | "in_transit"
    | "on_site"
    | "returning"
    | "completed"
    | "cancelled";

export type OptimizerRunStatus =
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "partial";

export type StopAction = "deliver" | "pickup" | "both";

export type AssetType =
    | "heated_bench"
    | "cooling_bench"
    | "hybrid_bench"
    | "dragon_shader"
    | "heated_foot_deck";

export type PersonnelRole =
    | "driver"
    | "service_tech"
    | "lead_tech"
    | "sales";

// ============================================================
// Database row types (matching Supabase table shapes)
// ============================================================

export interface OptimizerRunRow {
    id: string;
    week_number: number;
    season_year: number;
    triggered_by: string | null;
    status: OptimizerRunStatus;
    started_at: string | null;
    completed_at: string | null;
    duration_ms: number | null;
    trips_generated: number | null;
    warnings: string[] | null;
    errors: string[] | null;
    unassigned_demands: UnassignedDemand[] | null;
    constraint_relaxations: ConstraintRelaxation[] | null;
    created_at: string;
}

export interface TripRow {
    id: string;
    week_number: number;
    season_year: number;
    optimizer_run_id: string | null;
    status: TripStatus;
    vehicle_id: string | null;
    origin_type: string | null;
    origin_id: string | null;
    depart_time: string | null;
    return_time: string | null;
    total_miles: number | null;
    total_drive_hrs: number | null;
    notes: string | null;
    is_recommended: boolean;
    is_manual: boolean;
    optimizer_score: number | null;
    created_at: string;
    updated_at: string;
}

export interface TripStopRow {
    id: string;
    trip_id: string;
    venue_id: string;
    stop_order: number;
    arrival_time: string | null;
    depart_time: string | null;
    action: string | null;
    requires_hub_return: boolean;
    hub_return_reason: string | null;
    notes: string | null;
}

export interface TripAssetRow {
    id: string;
    trip_id: string;
    asset_id: string;
    stop_id: string | null;
}

export interface TripPersonnelRow {
    id: string;
    trip_id: string;
    person_id: string;
    role_on_trip: string | null;
}

// ============================================================
// Joined / denormalized types (used by UI components)
// ============================================================

export interface VenueInfo {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
}

export interface VehicleInfo {
    id: string;
    name: string;
    type: string | null;
    home_hub_id: string | null;
}

export interface HubInfo {
    id: string;
    name: string;
    code: string;
    city: string;
    state: string;
}

export interface AssetInfo {
    id: string;
    serial_number: string;
    asset_type: AssetType;
    model_version: string | null;
    weight_lbs: number | null;
}

export interface PersonnelInfo {
    id: string;
    name: string;
    role: PersonnelRole;
}

export interface TripStopWithVenue extends TripStopRow {
    venue: VenueInfo;
    assets: AssetInfo[];
}

export interface TripPersonnelWithInfo extends TripPersonnelRow {
    person: PersonnelInfo;
}

export interface TripWithDetails extends TripRow {
    vehicle: VehicleInfo | null;
    origin_hub: HubInfo | null;
    stops: TripStopWithVenue[];
    personnel: TripPersonnelWithInfo[];
    asset_summary: AssetSummary;
}

export interface AssetSummary {
    total: number;
    by_type: Partial<Record<AssetType, number>>;
}

// ============================================================
// Optimizer result types (mirroring Python dataclasses)
// ============================================================

export interface UnassignedDemand {
    customer_name: string;
    venue_name: string;
    asset_type: string;
    quantity: number;
    reason: string;
}

export interface ConstraintRelaxation {
    constraint: string;
    original_value: string | number;
    relaxed_value: string | number;
    reason: string;
}

export interface OptimizeApiResponse {
    run_id: string | null;
    status: OptimizerRunStatus;
    trips_generated: number;
    score: number;
    duration_ms: number;
    warnings: string[];
    errors: string[];
    unassigned_demands?: UnassignedDemand[];
    constraint_relaxations?: ConstraintRelaxation[];
}

// ============================================================
// Page-level data shape (passed from server to client)
// ============================================================

export interface WeeklyPlannerData {
    trips: TripWithDetails[];
    currentRun: OptimizerRunRow | null;
    allRuns: OptimizerRunRow[];
    games: GameInfo[];
    weekNumber: number;
    seasonYear: number;
}

export interface GameInfo {
    id: string;
    customer_name: string;
    venue_name: string;
    game_date: string;
    game_time: string | null;
    opponent: string | null;
    week_number: number;
}

export interface FormData {
    vehicles: VehicleInfo[];
    hubs: HubInfo[];
    venues: VenueInfo[];
    personnel: PersonnelInfo[];
    assets: AssetInfo[];
}

// ============================================================
// Component prop types
// ============================================================

export type StatusFilter = TripStatus | "all";

export interface TripTransitionResult {
    success: boolean;
    error?: string;
    newStatus?: TripStatus;
    assetsUpdated?: number;
}
