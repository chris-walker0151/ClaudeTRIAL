/**
 * TypeScript types for the Customers page.
 */

export type SportType = "nfl" | "ncaa_football" | "mlb" | "pga" | "tennis" | "other";
export type ContractType = "lease_1yr" | "lease_3yr" | "lease_5yr" | "one_off_rental" | "conference_deal";

export interface CustomerListItem {
    id: string;
    name: string;
    sport_type: SportType;
    primary_contact: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    venue_count: number;
    contract_count: number;
}

export interface VenueRow {
    id: string;
    customer_id: string | null;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    lat: number | null;
    lng: number | null;
    is_primary: boolean;
    notes: string | null;
}

export interface ContractItemRow {
    id: string;
    contract_id: string;
    asset_type: string;
    model_version: string | null;
    quantity: number;
    branding_spec: string | null;
    notes: string | null;
}

export interface ContractRow {
    id: string;
    customer_id: string;
    contract_type: ContractType;
    start_date: string;
    end_date: string;
    status: string;
    notes: string | null;
}

export interface ContractWithItems extends ContractRow {
    items: ContractItemRow[];
}

export interface GameRow {
    id: string;
    customer_id: string;
    venue_id: string | null;
    season_year: number;
    week_number: number;
    game_date: string;
    game_time: string | null;
    opponent: string | null;
    is_home_game: boolean;
    venue_name: string | null;
}

export interface CustomerDetail {
    id: string;
    name: string;
    sport_type: SportType;
    primary_contact: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    timezone: string | null;
    notes: string | null;
    venues: VenueRow[];
    contracts: ContractWithItems[];
    upcoming_games: GameRow[];
    asset_count: number;
}

export type SportFilter = SportType | "all";