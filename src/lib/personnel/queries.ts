import { createClient } from "@/lib/supabase/server";
import { WEEKS_IN_SEASON } from "@/lib/constants";
import type {
    PersonnelListItem,
    PersonnelAvailabilityRow,
    PersonnelPageData,
    PersonnelRole,
    WeekAvailability,
    WeekStatus,
} from "./types";

export async function fetchPersonnelData(
    seasonYear: number,
): Promise<PersonnelPageData> {
    const supabase = await createClient();

    const [personnelResult, availabilityResult, tripPersonnelResult, hubsResult] =
        await Promise.all([
            supabase
                .from("personnel")
                .select("*, home_hub:hubs!home_hub_id(name)")
                .order("name"),
            supabase
                .from("personnel_availability")
                .select("*")
                .eq("season_year", seasonYear),
            supabase
                .from("trip_personnel")
                .select("*, trip:trips(id, week_number, season_year, status)")
                .not("trip", "is", null),
            supabase
                .from("hubs")
                .select("id, name")
                .order("name"),
        ]);

    const personnel: PersonnelListItem[] = (personnelResult.data ?? []).map(
        (row: Record<string, unknown>) => {
            const hub = row.home_hub as unknown as { name: string } | null;
            return {
                id: row.id as string,
                name: row.name as string,
                role: row.role as PersonnelRole,
                home_hub_id: row.home_hub_id as string,
                home_hub_name: hub?.name ?? "Unknown",
                phone: (row.phone as string) ?? null,
                email: (row.email as string) ?? null,
                max_drive_hrs: (row.max_drive_hrs as number) ?? 11,
                notes: (row.notes as string) ?? null,
            };
        },
    );

    const avMap = new Map<string, Map<number, boolean>>();
    for (const row of availabilityResult.data ?? []) {
        const r = row as Record<string, unknown>;
        const pid = r.person_id as string;
        if (!avMap.has(pid)) avMap.set(pid, new Map());
        avMap.get(pid)!.set(r.week_number as number, r.is_available as boolean);
    }

    const tripMap = new Map<string, Map<number, string>>();
    for (const row of tripPersonnelResult.data ?? []) {
        const r = row as Record<string, unknown>;
        const trip = r.trip as unknown as {
            id: string; week_number: number; season_year: number; status: string;
        } | null;
        if (!trip || trip.season_year !== seasonYear) continue;
        const pid = r.person_id as string;
        if (!tripMap.has(pid)) tripMap.set(pid, new Map());
        tripMap.get(pid)!.set(trip.week_number, trip.id);
    }

    const availability: PersonnelAvailabilityRow[] = personnel.map((person) => {
        const weeks: WeekAvailability[] = [];
        for (let w = 1; w <= WEEKS_IN_SEASON; w++) {
            const tripId = tripMap.get(person.id)?.get(w);
            let status: WeekStatus;
            if (tripId) {
                status = "on_trip";
            } else if (avMap.get(person.id)?.get(w) === false) {
                status = "unavailable";
            } else {
                status = "available";
            }
            weeks.push({ week_number: w, status, ...(tripId ? { trip_id: tripId } : {}) });
        }
        return { person, weeks };
    });

    const hubs = (hubsResult.data ?? []).map((h: Record<string, unknown>) => ({
        id: h.id as string,
        name: h.name as string,
    }));

    return { personnel, availability, hubs };
}
