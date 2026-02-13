export type VehicleStatus = "active" | "maintenance" | "retired";

export type WeekStatus = "available" | "on_trip" | "unavailable";

export interface VehicleListItem {
    id: string;
    name: string;
    type: string | null;
    home_hub_id: string;
    home_hub_name: string;
    capacity_lbs: number | null;
    capacity_cuft: number | null;
    status: string;
    notes: string | null;
}

export interface WeekAvailability {
    week_number: number;
    status: WeekStatus;
    trip_id?: string;
}

export interface VehicleAvailabilityRow {
    vehicle: VehicleListItem;
    weeks: WeekAvailability[];
}

export interface VehicleTripInfo {
    id: string;
    week_number: number;
    status: string;
    depart_time: string | null;
    return_time: string | null;
    total_miles: number | null;
    stop_count: number;
}

export interface VehicleDetail {
    id: string;
    name: string;
    type: string | null;
    home_hub_name: string;
    capacity_lbs: number | null;
    capacity_cuft: number | null;
    status: string;
    notes: string | null;
    upcoming_trips: VehicleTripInfo[];
}

export interface FleetStats {
    total: number;
    active: number;
    maintenance: number;
    byHub: { hub_name: string; count: number }[];
}

export interface FleetPageData {
    vehicles: VehicleListItem[];
    availability: VehicleAvailabilityRow[];
    stats: FleetStats;
    hubs: { id: string; name: string }[];
}
