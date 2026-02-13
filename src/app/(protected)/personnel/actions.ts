"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PersonnelDetail, PersonnelRole, PersonnelTripInfo } from "@/lib/personnel/types";

export async function toggleAvailability(
    personId: string,
    weekNumber: number,
    seasonYear: number,
    isAvailable: boolean,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: existing } = await supabase
        .from("personnel_availability")
        .select("id")
        .eq("person_id", personId)
        .eq("week_number", weekNumber)
        .eq("season_year", seasonYear)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from("personnel_availability")
            .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        if (error) return { success: false, error: error.message };
    } else {
        const { error } = await supabase
            .from("personnel_availability")
            .insert({
                person_id: personId,
                week_number: weekNumber,
                season_year: seasonYear,
                is_available: isAvailable,
            });
        if (error) return { success: false, error: error.message };
    }

    revalidatePath("/personnel");
    return { success: true };
}

export async function updatePersonnelNotes(
    personId: string,
    notes: string,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("personnel")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", personId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/personnel");
    return { success: true };
}

export async function fetchPersonnelDetailAction(
    personId: string,
): Promise<PersonnelDetail | null> {
    const supabase = await createClient();

    const { data: person } = await supabase
        .from("personnel")
        .select("*, home_hub:hubs!home_hub_id(name)")
        .eq("id", personId)
        .single();

    if (!person) return null;

    const { data: tripData } = await supabase
        .from("trip_personnel")
        .select("role_on_trip, trip:trips(id, week_number, status, depart_time, return_time, total_miles)")
        .eq("person_id", personId);

    const p = person as Record<string, unknown>;
    const hub = p.home_hub as unknown as { name: string } | null;
    const skills = p.skills as string[] | null;

    const upcomingTrips: PersonnelTripInfo[] = (tripData ?? []).map((row: Record<string, unknown>) => {
        const trip = row.trip as unknown as {
            id: string; week_number: number; status: string;
            depart_time: string | null; return_time: string | null; total_miles: number | null;
        } | null;
        return {
            id: trip?.id ?? "",
            week_number: trip?.week_number ?? 0,
            status: trip?.status ?? "unknown",
            depart_time: trip?.depart_time ?? null,
            return_time: trip?.return_time ?? null,
            total_miles: trip?.total_miles ?? null,
            role_on_trip: (row.role_on_trip as string) ?? null,
        };
    });

    return {
        id: p.id as string,
        name: p.name as string,
        role: p.role as PersonnelRole,
        home_hub_name: hub?.name ?? "Unknown",
        phone: (p.phone as string) ?? null,
        email: (p.email as string) ?? null,
        skills,
        max_drive_hrs: (p.max_drive_hrs as number) ?? 11,
        notes: (p.notes as string) ?? null,
        upcoming_trips: upcomingTrips,
    };
}
