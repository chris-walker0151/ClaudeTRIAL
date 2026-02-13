/**
 * Server-side Supabase queries for the Travel page.
 * These run in server components and server actions only.
 */

import { createClient } from "@/lib/supabase/server";
import type {
    TravelPageData,
    TravelRecommendationWithDetails,
    PreferredRouteInfo,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Fetch all data needed for the Travel page.
 * Two-step approach: first fetch trip IDs for the week, then fetch
 * recommendations for those trips, plus all preferred routes.
 */
export async function fetchTravelData(
    seasonYear: number,
    weekNumber: number,
): Promise<TravelPageData> {
    const supabase = await createClient();

    // Step 1: Get trip IDs for the given week
    const { data: weekTrips } = await supabase
        .from("trips")
        .select("id")
        .eq("season_year", seasonYear)
        .eq("week_number", weekNumber);

    const tripIds = weekTrips?.map((t: { id: string }) => t.id) ?? [];

    // Step 2: Parallel queries - recommendations (if trips exist) + preferred routes
    const [recsResult, routesResult] = await Promise.all([
        tripIds.length > 0
            ? supabase
                  .from("travel_recommendations")
                  .select(
                      " " +
                      "*, " +
                      "trip:trips(status, week_number, vehicle:vehicles(name)), " +
                      "stop:trip_stops(venue:venues(name, city, state)), " +
                      "person:personnel(name, role)"
                  )
                  .in("trip_id", tripIds)
                  .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),

        supabase
            .from("preferred_routes")
            .select(
                "id, origin_airport, destination_airport, preferred_airline, typical_price, typical_duration_min, google_flights_url",
            )
            .order("origin_airport"),
    ]);

    const rawRecs = recsResult.data ?? [];
    const rawRoutes = routesResult.data ?? [];

    // Transform recommendations with nested FK casts
    const recommendations: TravelRecommendationWithDetails[] = rawRecs.map(
        (rec: any) => {
            const trip = rec.trip as unknown as {
                status: string;
                week_number: number;
                vehicle: { name: string } | null;
            } | null;

            const stop = rec.stop as unknown as {
                venue: {
                    name: string;
                    city: string | null;
                    state: string | null;
                } | null;
            } | null;

            const person = rec.person as unknown as {
                name: string;
                role: string;
            } | null;

            return {
                id: rec.id,
                trip_id: rec.trip_id,
                stop_id: rec.stop_id,
                person_id: rec.person_id,
                type: rec.type,
                provider_name: rec.provider_name,
                price_estimate: rec.price_estimate,
                rating: rec.rating,
                departure_time: rec.departure_time,
                arrival_time: rec.arrival_time,
                origin: rec.origin,
                destination: rec.destination,
                distance_to_venue_mi: rec.distance_to_venue_mi,
                booking_url: rec.booking_url,
                status: rec.status,
                notes: rec.notes,
                created_at: rec.created_at,
                updated_at: rec.updated_at,
                trip_vehicle_name: trip?.vehicle?.name ?? null,
                trip_status: trip?.status ?? "draft",
                trip_week: trip?.week_number ?? weekNumber,
                venue_name: stop?.venue?.name ?? null,
                venue_city: stop?.venue?.city ?? null,
                venue_state: stop?.venue?.state ?? null,
                person_name: person?.name ?? null,
                person_role: person?.role ?? null,
            };
        },
    );

    const preferredRoutes: PreferredRouteInfo[] =
        rawRoutes as PreferredRouteInfo[];

    return {
        recommendations,
        preferredRoutes,
        weekNumber,
        seasonYear,
    };
}

/* eslint-enable @typescript-eslint/no-explicit-any */
