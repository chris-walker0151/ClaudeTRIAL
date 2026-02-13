/**
 * TypeScript types for the Travel page.
 * Mirrors travel_recommendations and preferred_routes database tables.
 */

// ============================================================
// Enum types
// ============================================================

export type TravelRecommendationType = "hotel" | "flight";
export type TravelRecommendationStatus = "suggested" | "booked" | "declined";

// ============================================================
// Database row types
// ============================================================

export interface TravelRecommendationRow {
    id: string;
    trip_id: string;
    stop_id: string | null;
    person_id: string | null;
    type: TravelRecommendationType | null;
    provider_name: string | null;
    price_estimate: number | null;
    rating: number | null;
    departure_time: string | null;
    arrival_time: string | null;
    origin: string | null;
    destination: string | null;
    distance_to_venue_mi: number | null;
    booking_url: string | null;
    status: TravelRecommendationStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================================
// Joined / denormalized types (used by UI components)
// ============================================================

export interface TravelRecommendationWithDetails extends TravelRecommendationRow {
    trip_vehicle_name: string | null;
    trip_status: string;
    trip_week: number;
    venue_name: string | null;
    venue_city: string | null;
    venue_state: string | null;
    person_name: string | null;
    person_role: string | null;
}

export interface PreferredRouteInfo {
    id: string;
    origin_airport: string | null;
    destination_airport: string | null;
    preferred_airline: string | null;
    typical_price: number | null;
    typical_duration_min: number | null;
    google_flights_url: string | null;
}

// ============================================================
// Page-level data shape (passed from server to client)
// ============================================================

export interface TravelPageData {
    recommendations: TravelRecommendationWithDetails[];
    preferredRoutes: PreferredRouteInfo[];
    weekNumber: number;
    seasonYear: number;
}

// ============================================================
// Component filter types
// ============================================================

export type TravelTab = "hotels" | "flights";
export type TravelStatusFilter = TravelRecommendationStatus | "all";