import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "./resend-client";
import { EMAIL_SUBJECTS, OPS_RECIPIENTS } from "./constants";
import { buildOpsGameplanHtml } from "./templates/ops-gameplan";
import type {
    EmailSendResult,
    OpsGameplanEmailData,
    OpsGameplanTrip,
} from "./types";

interface TripRow {
    id: string;
    status: string;
    total_miles: number | null;
    total_drive_hrs: number | null;
    optimizer_score: number | null;
    depart_time: string | null;
    return_time: string | null;
    vehicle: { name: string } | null;
    hub: { name: string } | null;
    trip_personnel: {
        role: string | null;
        person: { first_name: string; last_name: string } | null;
    }[];
    trip_stops: {
        stop_order: number;
        action: string | null;
        arrival_time: string | null;
        depart_time: string | null;
        asset_count: number;
        venue: {
            name: string;
            city: string | null;
            state: string | null;
        } | null;
    }[];
}

export async function sendOpsGameplanEmail(
    weekNumber: number,
    seasonYear: number,
): Promise<EmailSendResult> {
    try {
        if (OPS_RECIPIENTS.length === 0) {
            return { success: false, error: "No OPS_EMAIL_RECIPIENTS configured" };
        }

        const supabase = await createClient();

        // Query trips for this week with all nested data
        const { data: trips, error: tripsError } = await supabase
            .from("trips")
            .select(
                "id, status, total_miles, total_drive_hrs, optimizer_score, depart_time, return_time, "
                + "vehicle:vehicles(name), "
                + "hub:hubs(name), "
                + "trip_personnel(role, person:people(first_name, last_name)), "
                + "trip_stops(stop_order, action, arrival_time, depart_time, asset_count, venue:venues(name, city, state))"
            )
            .eq("week_number", weekNumber)
            .eq("season_year", seasonYear)
            .order("depart_time", { ascending: true });

        if (tripsError) {
            return { success: false, error: tripsError.message };
        }

        const typedTrips = (trips || []) as unknown as TripRow[];

        // Check for Thursday games for priority flags
        const { data: thursdayGames } = await supabase
            .from("game_schedule")
            .select("id, venue:venues(name, city, state)")
            .eq("week_number", weekNumber)
            .eq("season_year", seasonYear)
            .eq("day_of_week", "Thursday");

        const thursdayPriorityFlags: string[] = [];
        if (thursdayGames && thursdayGames.length > 0) {
            for (const g of thursdayGames as unknown as { id: string; venue: { name: string; city: string | null; state: string | null } | null }[]) {
                const vName = g.venue?.name || "Unknown venue";
                thursdayPriorityFlags.push("Thursday game at " + vName + " — confirm early departure");
            }
        }

        const alerts: string[] = [];
        for (const t of typedTrips) {
            if (t.trip_personnel.length === 0) {
                alerts.push("Trip " + (t.vehicle?.name || t.id) + " has no personnel assigned");
            }
            if (t.trip_stops.length === 0) {
                alerts.push("Trip " + (t.vehicle?.name || t.id) + " has no stops");
            }
        }

        const uniquePersonnel = new Set<string>();
        for (const t of typedTrips) {
            for (const p of t.trip_personnel) {
                if (p.person) {
                    uniquePersonnel.add(p.person.first_name + " " + p.person.last_name);
                }
            }
        }
        let totalAssets = 0;
        for (const t of typedTrips) {
            for (const s of t.trip_stops) {
                totalAssets += s.asset_count || 0;
            }
        }

        // Map trips to email data format
        const mappedTrips: OpsGameplanTrip[] = typedTrips.map((t) => ({
            id: t.id,
            vehicleName: t.vehicle?.name || "Unknown Vehicle",
            hubName: t.hub?.name || "Unknown Hub",
            status: t.status,
            totalMiles: t.total_miles,
            totalDriveHrs: t.total_drive_hrs,
            optimizerScore: t.optimizer_score,
            departTime: t.depart_time,
            returnTime: t.return_time,
            personnel: t.trip_personnel.map((p) => ({
                name: p.person ? (p.person.first_name + " " + p.person.last_name) : "Unknown",
                role: p.role || "Staff",
            })),
            stops: t.trip_stops
                .sort((a, b) => a.stop_order - b.stop_order)
                .map((s) => ({
                    venueName: s.venue?.name || "Unknown Venue",
                    city: s.venue?.city || null,
                    state: s.venue?.state || null,
                    action: s.action,
                    arrivalTime: s.arrival_time,
                    departTime: s.depart_time,
                    assetCount: s.asset_count,
                })),
        }));

        const emailData: OpsGameplanEmailData = {
            weekNumber,
            seasonYear,
            totalTrips: typedTrips.length,
            totalPersonnel: uniquePersonnel.size,
            totalAssets,
            generatedAt: new Date().toISOString(),
            alerts,
            thursdayPriorityFlags,
            trips: mappedTrips,
        };

        const html = buildOpsGameplanHtml(emailData);
        const subject = EMAIL_SUBJECTS.opsGameplan(weekNumber);

        return await sendEmail(OPS_RECIPIENTS, subject, html);
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to send ops gameplan email",
        };
    }
}
