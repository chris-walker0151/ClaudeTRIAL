export type SportType = "nfl" | "ncaa_football" | "mlb" | "pga" | "tennis" | "other";

export type CellStatus = "confirmed" | "recommended" | "draft" | "no_game" | "unassigned";

export interface GameCellData {
    game_id: string | null;
    has_game: boolean;
    opponent: string | null;
    is_home_game: boolean;
    trip_status: CellStatus;
    trip_id: string | null;
}

export interface SeasonCustomerRow {
    customer_id: string;
    customer_name: string;
    sport_type: SportType;
    weeks: GameCellData[]; // length 18, index 0 = week 1
}

export interface WeekSummary {
    week_number: number;
    total_games: number;
    total_trips: number;
    confirmed: number;
    unassigned: number;
}

export interface SeasonOverviewData {
    customers: SeasonCustomerRow[];
    summaries: WeekSummary[];
}

export type SportFilter = SportType | "all";
