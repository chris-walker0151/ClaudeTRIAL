import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "./resend-client";
import { EMAIL_SUBJECTS } from "./constants";
import { buildAmendmentHtml } from "./templates/amendment";
import type {
    EmailSendResult,
    AmendmentEmailData,
    StaffAssignmentTrip,
} from "./types";

interface PersonRow {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
}

interface TripJoinRow {
    id: string;
    depart_time: string | null;
    return_time: string | null;
    total_miles: number | null;
    total_drive_hrs: number | null;
    vehicle: { name: string } | null;
    hub: { name: string } | null;
    trip_stops: {
        stop_order: number;
        action: string | null;
        arrival_time: string | null;
        venue: {
            name: string;
            city: string | null;
            state: string | null;
        } | null;
    }[];
    trip_personnel: {
        role: string | null;
        person_id: string;
    }[];
}

export async function sendAmendmentEmail(
    personId: string,
    weekNumber: number,
    seasonYear: number,
    changeType: "added" | "removed" | "modified",
    changeSummary: string,
): Promise<EmailSendResult> {
    try {
        const supabase = await createClient();

        // Lookup person
        const { data: person, error: personError } = await supabase
            .from("people")
            .select("id, first_name, last_name, email")
            .eq("id", personId)
            .single();

        if (personError || !person) {
            return { success: false, error: personError?.message || "Person not found" };
        }

        const typedPerson = person as unknown as PersonRow;
        if (!typedPerson.email) {
            return { success: false, error: "Person has no email address" };
        }

        // Query updated trip if added or modified
        let updatedTrip: StaffAssignmentTrip | null = null;

        if (changeType !== "removed") {
            const { data: trips } = await supabase
                .from("trips")
                .select(
                    "id, depart_time, return_time, total_miles, total_drive_hrs, "
                    + "vehicle:vehicles(name), hub:hubs(name), "
                    + "trip_stops(stop_order, action, arrival_time, venue:venues(name, city, state)), "
                    + "trip_personnel(role, person_id)"
                )
                .eq("week_number", weekNumber)
                .eq("season_year", seasonYear)
                .order("depart_time", { ascending: true });

            const typedTrips = (trips || []) as unknown as TripJoinRow[];

            // Find the trip this person is assigned to
            const matchedTrip = typedTrips.find((t) =>
                t.trip_personnel.some((p) => p.person_id === personId)
            );

            if (matchedTrip) {
                const personnelEntry = matchedTrip.trip_personnel.find(
                    (p) => p.person_id === personId
                );
                updatedTrip = {
                    id: matchedTrip.id,
                    vehicleName: matchedTrip.vehicle?.name || "Unknown Vehicle",
                    hubName: matchedTrip.hub?.name || "Unknown Hub",
                    departTime: matchedTrip.depart_time,
                    returnTime: matchedTrip.return_time,
                    roleOnTrip: personnelEntry?.role || null,
                    totalMiles: matchedTrip.total_miles,
                    totalDriveHrs: matchedTrip.total_drive_hrs,
                    stops: (matchedTrip.trip_stops || [])
                        .sort((a, b) => a.stop_order - b.stop_order)
                        .map((s) => ({
                            venueName: s.venue?.name || "Unknown Venue",
                            city: s.venue?.city || null,
                            state: s.venue?.state || null,
                            action: s.action,
                            arrivalTime: s.arrival_time,
                        })),
                };
            }
        }

        const emailData: AmendmentEmailData = {
            personName: typedPerson.first_name + " " + typedPerson.last_name,
            personEmail: typedPerson.email,
            weekNumber,
            seasonYear,
            changeType,
            changeSummary,
            updatedTrip,
        };

        const html = buildAmendmentHtml(emailData);
        const subject = EMAIL_SUBJECTS.amendment(weekNumber);

        return await sendEmail(typedPerson.email, subject, html);
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to send amendment email",
        };
    }
}
