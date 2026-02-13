"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TravelRecommendationStatus } from "@/lib/travel/types";

interface ActionResult {
    success: boolean;
    error?: string;
}

export async function updateRecommendationStatus(
    id: string,
    status: TravelRecommendationStatus,
): Promise<ActionResult> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("travel_recommendations")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/travel");
        return { success: true };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }
}

export async function addTravelRecommendation(data: {
    trip_id: string;
    type: string;
    provider_name: string;
    price_estimate?: number;
    rating?: number;
    departure_time?: string;
    arrival_time?: string;
    origin?: string;
    destination?: string;
    distance_to_venue_mi?: number;
    booking_url?: string;
    stop_id?: string;
    person_id?: string;
    notes?: string;
}): Promise<ActionResult> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("travel_recommendations")
            .insert({
                trip_id: data.trip_id,
                type: data.type,
                provider_name: data.provider_name,
                price_estimate: data.price_estimate ?? null,
                rating: data.rating ?? null,
                departure_time: data.departure_time ?? null,
                arrival_time: data.arrival_time ?? null,
                origin: data.origin ?? null,
                destination: data.destination ?? null,
                distance_to_venue_mi: data.distance_to_venue_mi ?? null,
                booking_url: data.booking_url ?? null,
                stop_id: data.stop_id ?? null,
                person_id: data.person_id ?? null,
                notes: data.notes ?? null,
                status: "suggested",
            });

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/travel");
        return { success: true };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }
}

export async function deleteTravelRecommendation(
    id: string,
): Promise<ActionResult> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("travel_recommendations")
            .delete()
            .eq("id", id);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/travel");
        return { success: true };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }
}
