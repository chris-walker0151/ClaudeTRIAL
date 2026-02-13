import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "./resend-client";
import { EMAIL_SUBJECTS } from "./constants";
import { buildStaffAssignmentHtml } from "./templates/staff-assignment";
import type {
    StaffAssignmentEmailData,
    StaffAssignmentTrip,
    StaffTravelRec,
} from "./types";

interface PersonnelRow {
    role: string | null;
    person: {
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
    } | null;
    trip: {
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
    } | null;
}

interface TravelRecRow {
    type: string;
    provider_name: string | null;
    booking_url: string | null;
    departure_time: string | null;
    arrival_time: string | null;
    person_id: string;
}

export async function sendStaffAssignmentEmails(
    weekNumber: number,
    seasonYear: number,
): Promise<{ sent: number; errors: string[] }> {
    const errors: string[] = [];
    let sent = 0;

    try {
        const supabase = await createClient();

        // Query all trip personnel for this week
        const { data: personnelData, error: personnelError } = await supabase
            .from("trip_personnel")
            .select(
                "role, "
                + "person:people(id, first_name, last_name, email), "
                + "trip:trips!inner(id, depart_time, return_time, total_miles, total_drive_hrs, "
                + "vehicle:vehicles(name), hub:hubs(name), "
                + "trip_stops(stop_order, action, arrival_time, venue:venues(name, city, state)))"
            )
            .eq("trip.week_number", weekNumber)
            .eq("trip.season_year", seasonYear);

        if (personnelError) {
            return { sent: 0, errors: [personnelError.message] };
        }

        const typedPersonnel = (personnelData || []) as unknown as PersonnelRow[];

        // Query travel recommendations for this week
        const { data: travelRecs } = await supabase
            .from("travel_recommendations")
            .select("type, provider_name, booking_url, departure_time, arrival_time, person_id")
            .eq("week_number", weekNumber)
            .eq("season_year", seasonYear);

        const typedRecs = (travelRecs || []) as unknown as TravelRecRow[];

        // Group by person
        const personMap = new Map<string, {
            name: string;
            email: string;
            trips: StaffAssignmentTrip[];
            travelRecs: StaffTravelRec[];
        }>();

        for (const row of typedPersonnel) {
            if (!row.person || !row.person.email || !row.trip) continue;

            const personId = row.person.id;
            if (!personMap.has(personId)) {
                personMap.set(personId, {
                    name: row.person.first_name + " " + row.person.last_name,
                    email: row.person.email,
                    trips: [],
                    travelRecs: [],
                });
            }

            const entry = personMap.get(personId);
            if (entry) {
                entry.trips.push({
                    id: row.trip.id,
                    vehicleName: row.trip.vehicle?.name || "Unknown Vehicle",
                    hubName: row.trip.hub?.name || "Unknown Hub",
                    departTime: row.trip.depart_time,
                    returnTime: row.trip.return_time,
                    roleOnTrip: row.role,
                    totalMiles: row.trip.total_miles,
                    totalDriveHrs: row.trip.total_drive_hrs,
                    stops: (row.trip.trip_stops || [])
                        .sort((a, b) => a.stop_order - b.stop_order)
                        .map((s) => ({
                            venueName: s.venue?.name || "Unknown Venue",
                            city: s.venue?.city || null,
                            state: s.venue?.state || null,
                            action: s.action,
                            arrivalTime: s.arrival_time,
                        })),
                });
            }
        }

        // Attach travel recommendations to each person
        for (const rec of typedRecs) {
            const entry = personMap.get(rec.person_id);
            if (entry) {
                entry.travelRecs.push({
                    type: rec.type,
                    providerName: rec.provider_name,
                    bookingUrl: rec.booking_url,
                    departureTime: rec.departure_time,
                    arrivalTime: rec.arrival_time,
                });
            }
        }

        // Send email to each person
        const subject = EMAIL_SUBJECTS.staffAssignment(weekNumber);

        for (const [, person] of personMap) {
            const emailData: StaffAssignmentEmailData = {
                personName: person.name,
                personEmail: person.email,
                weekNumber,
                seasonYear,
                trips: person.trips,
                travelRecommendations: person.travelRecs,
            };

            const html = buildStaffAssignmentHtml(emailData);
            const result = await sendEmail(person.email, subject, html);

            if (result.success) {
                sent++;
            } else {
                errors.push(person.name + ": " + (result.error || "Unknown error"));
            }
        }
    } catch (err) {
        errors.push(err instanceof Error ? err.message : "Failed to send staff assignment emails");
    }

    return { sent, errors };
}
