import os

BASE = os.getcwd()

def w(rel_path, content):
    full = os.path.join(BASE, rel_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8', newline='
') as fh:
        fh.write(content)
    print(f'Created: {rel_path}')

# ============================================================
# File 1: src/lib/personnel/types.ts
# ============================================================
w('src/lib/personnel/types.ts', r"""export type PersonnelRole = "driver" | "service_tech" | "lead_tech" | "sales";

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
""")

print('File 1 written to build script')

# ============================================================
# File 2: src/lib/personnel/constants.ts
# ============================================================
w('src/lib/personnel/constants.ts', r"""import type { PersonnelRole, WeekStatus } from "./types";

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
""")

print('File 2 written to build script')

# File 3: queries.ts
w('src/lib/personnel/queries.ts', '''