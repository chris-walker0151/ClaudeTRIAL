"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PreferredRouteFormData } from "@/lib/settings/types";

export async function createPreferredRoute(
    data: PreferredRouteFormData,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase.from("preferred_routes").insert({
        origin_airport: data.origin_airport,
        destination_airport: data.destination_airport,
        preferred_airline: data.preferred_airline ?? null,
        typical_price: data.typical_price ?? null,
        typical_duration_min: data.typical_duration_min ?? null,
        google_flights_url: data.google_flights_url ?? null,
        notes: data.notes ?? null,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    return { success: true };
}

export async function updatePreferredRoute(
    id: string,
    data: Partial<PreferredRouteFormData>,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("preferred_routes")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    return { success: true };
}

export async function deletePreferredRoute(
    id: string,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("preferred_routes")
        .delete()
        .eq("id", id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    return { success: true };
}
