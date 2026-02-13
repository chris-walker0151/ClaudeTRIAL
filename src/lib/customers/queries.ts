/**
 * Server-side Supabase queries for the Customers page.
 * These run in server components and server actions only.
 */

import { createClient } from "@/lib/supabase/server";
import { SEASON_YEAR } from "@/lib/constants";
import type {
    CustomerListItem,
    CustomerDetail,
    ContractWithItems,
    ContractItemRow,
    VenueRow,
    GameRow,
    SportType,
} from "./types";

/**
 * Fetch all customers with venue and contract counts.
 */
export async function fetchCustomersList(): Promise<CustomerListItem[]> {
    const supabase = await createClient();

    const { data: customers, error } = await supabase
        .from("customers")
        .select("id, name, sport_type, primary_contact, contact_email, contact_phone")
        .order("name", { ascending: true });

    if (error || !customers) {
        console.error("Error fetching customers:", error);
        return [];
    }

    const { data: venueCounts } = await supabase
        .from("venues")
        .select("customer_id");

    const { data: contractCounts } = await supabase
        .from("contracts")
        .select("customer_id");

    const venueCountMap = new Map<string, number>();
    for (const v of venueCounts ?? []) {
        if (v.customer_id) {
            venueCountMap.set(v.customer_id, (venueCountMap.get(v.customer_id) ?? 0) + 1);
        }
    }

    const contractCountMap = new Map<string, number>();
    for (const c of contractCounts ?? []) {
        if (c.customer_id) {
            contractCountMap.set(c.customer_id, (contractCountMap.get(c.customer_id) ?? 0) + 1);
        }
    }

    return customers.map((c) => ({
        id: c.id,
        name: c.name,
        sport_type: c.sport_type as SportType,
        primary_contact: c.primary_contact,
        contact_email: c.contact_email,
        contact_phone: c.contact_phone,
        venue_count: venueCountMap.get(c.id) ?? 0,
        contract_count: contractCountMap.get(c.id) ?? 0,
    }));
}

/**
 * Fetch full detail for a single customer.
 */
export async function fetchCustomerDetail(
    customerId: string,
): Promise<CustomerDetail | null> {
    const supabase = await createClient();

    const [customerResult, venuesResult, contractsResult, gamesResult, assetsResult] =
        await Promise.all([
            supabase
                .from("customers")
                .select("*")
                .eq("id", customerId)
                .single(),

            supabase
                .from("venues")
                .select("*")
                .eq("customer_id", customerId)
                .order("is_primary", { ascending: false })
                .order("name", { ascending: true }),

            supabase
                .from("contracts")
                .select(`
                    *,
                    contract_items(*)
                `)
                .eq("customer_id", customerId)
                .order("start_date", { ascending: false }),

            supabase
                .from("game_schedule")
                .select(`
                    id, customer_id, venue_id, season_year, week_number,
                    game_date, game_time, opponent, is_home_game,
                    venue:venues(name)
                `)
                .eq("customer_id", customerId)
                .eq("season_year", SEASON_YEAR)
                .gte("game_date", new Date().toISOString().split("T")[0])
                .order("game_date", { ascending: true })
                .limit(10),

            supabase
                .from("asset_assignments")
                .select("id")
                .eq("customer_id", customerId)
                .eq("season_year", SEASON_YEAR),
        ]);

    if (customerResult.error || !customerResult.data) {
        console.error("Error fetching customer detail:", customerResult.error);
        return null;
    }

    const customer = customerResult.data;
    const venues = (venuesResult.data ?? []) as VenueRow[];

    const rawContracts = contractsResult.data ?? [];
    const contracts: ContractWithItems[] = rawContracts.map((c) => {
        const items = (c.contract_items as unknown as ContractItemRow[]) ?? [];
        return {
            id: c.id,
            customer_id: c.customer_id,
            contract_type: c.contract_type,
            start_date: c.start_date,
            end_date: c.end_date,
            status: c.status,
            notes: c.notes,
            items,
        };
    });

    const rawGames = gamesResult.data ?? [];
    const upcoming_games: GameRow[] = rawGames.map((g) => {
        const venue = g.venue as unknown as { name: string } | null;
        return {
            id: g.id,
            customer_id: g.customer_id,
            venue_id: g.venue_id,
            season_year: g.season_year,
            week_number: g.week_number,
            game_date: g.game_date,
            game_time: g.game_time,
            opponent: g.opponent,
            is_home_game: g.is_home_game,
            venue_name: venue?.name ?? null,
        };
    });

    const asset_count = assetsResult.data?.length ?? 0;

    return {
        id: customer.id,
        name: customer.name,
        sport_type: customer.sport_type as SportType,
        primary_contact: customer.primary_contact,
        contact_email: customer.contact_email,
        contact_phone: customer.contact_phone,
        timezone: customer.timezone,
        notes: customer.notes,
        venues,
        contracts,
        upcoming_games,
        asset_count,
    };
}
