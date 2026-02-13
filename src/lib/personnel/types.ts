export type PersonnelRole = "driver" | "service_tech" | "lead_tech" | "sales";

export type WeekStatus = "available" | "on_trip" | "unavailable";

export interface PersonnelListItem {
    id: string;
    name: string;
    role: PersonnelRole;
    home_hub_id: string;
    home_hub_name: string;
    phone: string | null;
    email: string | null;
    max_drive_hrs: number;
    notes: string | null;
}

export interface WeekAvailability {
    week_number: number;
    status: WeekStatus;
    trip_id?: string;
}

export interface PersonnelAvailabilityRow {
    person: PersonnelListItem;
    weeks: WeekAvailability[];
}

export interface PersonnelTripInfo {
    id: string;
    week_number: number;
    status: string;
    depart_time: string | null;
    return_time: string | null;
    total_miles: number | null;
    role_on_trip: string | null;
}

export interface PersonnelDetail {
    id: string;
    name: string;
    role: PersonnelRole;
    home_hub_name: string;
    phone: string | null;
    email: string | null;
    skills: string[] | null;
    max_drive_hrs: number;
    notes: string | null;
    upcoming_trips: PersonnelTripInfo[];
}

export interface PersonnelPageData {
    personnel: PersonnelListItem[];
    availability: PersonnelAvailabilityRow[];
    hubs: { id: string; name: string }[];
}

export type RoleFilter = PersonnelRole | "all";
