/**
 * Server-side Supabase queries for the Season Overview page.
 * Runs in server components only.
 */

import { createClient } from "@/lib/supabase/server";
import { WEEKS_IN_SEASON } from "@/lib/constants";
import type {
    CellStatus,
    GameCellData,
    SeasonCustomerRow,
    SeasonOverviewData,
    SportType,
    WeekSummary,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface RawGame {
    id: string;
    customer_id: string;
    venue_id: string | null;
    week_number: number;
    opponent: string | null;
    is_home_game: boolean;
}

interface RawTrip {
    id: string;
    week_number: number;
    status: string;
    trip_stops: { venue_id: string }[];
}

interface RawVenue {
    id: string;
    customer_id: string | null;
}

interface RawCustomer {
    id: string;
    name: string;
    sport_type: SportType;
}

/**
 * Fetch all data needed for the Season Overview page.
 * Runs 4 parallel Supabase queries and transforms into grid data.
 */
export async function fetchSeasonOverview(
    seasonYear: number,
): Promise<SeasonOverviewData> {
    const supabase = await createClient();

    const [customersResult, gamesResult, tripsResult, venuesResult] =
        await Promise.all([
            // Query 1: All customers
            supabase
                .from("customers")
                .select("id, name, sport_type")
                .order("name"),

            // Query 2: Games for this season
            supabase
                .from("game_schedule")
                .select("id, customer_id, venue_id, week_number, opponent, is_home_game")
                .eq("season_year", seasonYear),

            // Query 3: Trips with stops for this season
            supabase
                .from("trips")
                .select("id, week_number, status, trip_stops(venue_id)")
                .eq("season_year", seasonYear)
                .neq("status", "cancelled"),

            // Query 4: All venues (to map venue -> customer)
            supabase.from("venues").select("id, customer_id"),
        ]);

    const customers = (customersResult.data ?? []) as RawCustomer[];
    const games = (gamesResult.data ?? []) as RawGame[];
    const rawTrips = (tripsResult.data ?? []) as unknown as RawTrip[];
    const venues = (venuesResult.data ?? []) as RawVenue[];

    // Index venues by id for quick lookup
    const venueMap = new Map<string, string | null>();
    for (const v of venues) {
        venueMap.set(v.id, v.customer_id);
    }

    // Index games by (customer_id, week_number)
    const gameIndex = new Map<string, RawGame>();
    for (const g of games) {
        const key = g.customer_id + ":" + g.week_number;
        gameIndex.set(key, g);
    }

    // Index trips by (customer_id, week_number) via venue mapping
    const tripIndex = new Map<string, { trip_id: string; status: string }>();
    for (const trip of rawTrips) {
        const stops = (trip.trip_stops ?? []) as unknown as { venue_id: string }[];
        for (const stop of stops) {
            const customerId = venueMap.get(stop.venue_id);
            if (customerId) {
                const key = customerId + ":" + trip.week_number;
                const existing = tripIndex.get(key);
                if (!existing || statusPriority(trip.status) > statusPriority(existing.status)) {
                    tripIndex.set(key, { trip_id: trip.id, status: trip.status });
                }
            }
        }
    }

    // Build customer rows
    const customerRows: SeasonCustomerRow[] = customers.map((c) => {
        const weeks: GameCellData[] = [];
        for (let w = 0; w <= WEEKS_IN_SEASON; w++) {
            const key = c.id + ":" + w;
            const game = gameIndex.get(key);
            if (!game) {
                weeks.push({
                    game_id: null,
                    has_game: false,
                    opponent: null,
                    is_home_game: false,
                    trip_status: "no_game",
                    trip_id: null,
                });
            } else {
                const tripInfo = tripIndex.get(key);
                let tripStatus: CellStatus = "unassigned";
                let tripId: string | null = null;
                if (tripInfo) {
                    tripId = tripInfo.trip_id;
                    if (tripInfo.status === "confirmed") {
                        tripStatus = "confirmed";
                    } else if (tripInfo.status === "recommended") {
                        tripStatus = "recommended";
                    } else {
                        tripStatus = "draft";
                    }
                }
                weeks.push({
                    game_id: game.id,
                    has_game: true,
                    opponent: game.opponent,
                    is_home_game: game.is_home_game,
                    trip_status: tripStatus,
                    trip_id: tripId,
                });
            }
        }
        return {
            customer_id: c.id,
            customer_name: c.name,
            sport_type: c.sport_type,
            weeks,
        };
    });

    // Compute week summaries
    const summaries: WeekSummary[] = [];
    for (let w = 0; w <= WEEKS_IN_SEASON; w++) {
        let totalGames = 0;
        let totalTrips = 0;
        let confirmed = 0;
        let unassigned = 0;

        for (const row of customerRows) {
            const cell = row.weeks[w];
            if (cell.has_game) {
                totalGames++;
                if (cell.trip_id) {
                    totalTrips++;
                }
                if (cell.trip_status === "confirmed") {
                    confirmed++;
                }
                if (cell.trip_status === "unassigned") {
                    unassigned++;
                }
            }
        }

        summaries.push({
            week_number: w,
            total_games: totalGames,
            total_trips: totalTrips,
            confirmed,
            unassigned,
        });
    }

    return {
        customers: customerRows,
        summaries,
    };
}

/**
 * Return a numeric priority for trip status for comparison.
 * Higher = more important.
 */
function statusPriority(status: string): number {
    switch (status) {
        case "confirmed":
            return 3;
        case "recommended":
            return 2;
        case "draft":
            return 1;
        default:
            return 0;
    }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
