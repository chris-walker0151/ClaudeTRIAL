export interface PreferredRouteRow {
    id: string;
    origin_airport: string | null;
    destination_airport: string | null;
    preferred_airline: string | null;
    typical_price: number | null;
    typical_duration_min: number | null;
    google_flights_url: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface PreferredRouteFormData {
    origin_airport: string;
    destination_airport: string;
    preferred_airline?: string;
    typical_price?: number;
    typical_duration_min?: number;
    google_flights_url?: string;
    notes?: string;
}

export interface HubDetail {
    id: string;
    name: string;
    city: string;
    state: string;
    address: string;
    lat: number;
    lng: number;
    capacity_notes: string | null;
}

export interface OptimizerSetting {
    key: string;
    value: string | number;
    label: string;
    description: string;
}

export interface SettingsPageData {
    preferredRoutes: PreferredRouteRow[];
    hubs: HubDetail[];
    optimizerSettings: OptimizerSetting[];
}

export type SettingsTab = "routes" | "optimizer" | "hubs";
