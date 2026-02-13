import type { StaffAssignmentEmailData, StaffAssignmentTrip } from "../types";
import { APP_URL } from "../constants";

function formatTimestamp(iso: string | null): string {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
            + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
        return iso;
    }
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildTripBlock(trip: StaffAssignmentTrip, index: number): string {
    const miles = trip.totalMiles != null ? trip.totalMiles.toLocaleString() : "—";
    const hours = trip.totalDriveHrs != null ? trip.totalDriveHrs.toFixed(1) : "—";
    const itineraryRows = trip.stops.map((s) => {
        const loc = [s.venueName, s.city, s.state].filter(Boolean).map((v) => escapeHtml(v as string)).join(", ");
        const action = s.action ? escapeHtml(s.action) : "—";
        const arrival = s.arrivalTime ? formatTimestamp(s.arrivalTime) : "—";
        return `<tr><td style="padding:8px 10px;font-size:13px;border-bottom:1px solid #e0e0e0;">${loc}</td><td style="padding:8px 10px;font-size:13px;border-bottom:1px solid #e0e0e0;">${action}</td><td style="padding:8px 10px;font-size:13px;border-bottom:1px solid #e0e0e0;">${arrival}</td></tr>`;
    }).join("");
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;border:1px solid #e0e0e0;border-collapse:collapse;overflow:hidden;"><tr><td colspan="2" style="background:#f0f4f8;padding:14px 16px;border-bottom:1px solid #e0e0e0;"><p style="margin:0;font-size:15px;font-weight:700;color:#1e3a5f;">Trip ${index + 1}: ${escapeHtml(trip.vehicleName)}</p></td></tr><tr><td width="50%" style="padding:12px 16px;vertical-align:top;font-size:13px;"><p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Role</p><p style="margin:0 0 14px 0;color:#1f2937;font-weight:600;">${escapeHtml(trip.roleOnTrip || "Staff")}</p><p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Hub</p><p style="margin:0;color:#1f2937;">${escapeHtml(trip.hubName)}</p></td><td width="50%" style="padding:12px 16px;vertical-align:top;font-size:13px;"><p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Depart</p><p style="margin:0 0 14px 0;color:#1f2937;">${formatTimestamp(trip.departTime)}</p><p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Return</p><p style="margin:0;color:#1f2937;">${formatTimestamp(trip.returnTime)}</p></td></tr><tr><td colspan="2" style="padding:0 16px 12px 16px;font-size:13px;"><p style="margin:0;color:#6b7280;"><strong style="color:#1f2937;">${miles}</strong> miles &bull; <strong style="color:#1f2937;">${hours}</strong> drive hours</p></td></tr><tr><td colspan="2" style="padding:0 16px 12px 16px;"><p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#1e3a5f;">Itinerary</p><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e0e0e0;border-collapse:collapse;"><thead><tr style="background:#f8f9fb;"><th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0;">Venue</th><th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0;">Action</th><th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0;">Arrival</th></tr></thead><tbody>${itineraryRows || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#9ca3af;">No stops listed.</td></tr>'}</tbody></table></td></tr></table>`;
}

export function buildStaffAssignmentHtml(data: StaffAssignmentEmailData): string {
    const tripBlocks = data.trips.map((trip, i) => buildTripBlock(trip, i)).join("");
    const travelRecsSection = data.travelRecommendations.length > 0
        ? `<h2 style="margin:0 0 12px 0;font-size:16px;color:#1e3a5f;font-weight:700;">Travel Recommendations</h2>${data.travelRecommendations.map((rec) => {
            const depTime = rec.departureTime ? formatTimestamp(rec.departureTime) : "—";
            const arrTime = rec.arrivalTime ? formatTimestamp(rec.arrivalTime) : "—";
            const provider = rec.providerName ? escapeHtml(rec.providerName) : "TBD";
            const linkHtml = rec.bookingUrl ? `<p style="margin:4px 0 0 0;"><a href="${escapeHtml(rec.bookingUrl)}" style="color:#1a73e8;text-decoration:none;font-size:12px;">Book Now</a></p>` : "";
            return `<div style="background:#f0f9ff;border-left:4px solid #0284c7;padding:12px 16px;border-radius:4px;margin-bottom:8px;"><p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#0c4a6e;">${escapeHtml(rec.type)} &mdash; ${provider}</p><p style="margin:0;font-size:12px;color:#475569;">Depart: ${depTime} &bull; Arrive: ${arrTime}</p>${linkHtml}</div>`;
        }).join("")}` : "";
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Your Week ${data.weekNumber} Assignment</title></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><tr><td style="background:#1e3a5f;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Your Week ${data.weekNumber} Assignment</h1><p style="margin:6px 0 0 0;color:#b0c4de;font-size:13px;">${data.seasonYear} Season &mdash; Dragon Seats</p></td></tr><tr><td style="padding:24px 32px 0 32px;"><p style="margin:0 0 16px 0;font-size:15px;color:#1f2937;">Hi ${escapeHtml(data.personName)},</p><p style="margin:0 0 24px 0;font-size:14px;color:#4b5563;line-height:1.5;">Here are your trip assignments for Week ${data.weekNumber}. Please review the details below.</p></td></tr><tr><td style="padding:0 32px;">${tripBlocks || '<p style="font-size:14px;color:#9ca3af;">No trips assigned for this week.</p>'}</td></tr><tr><td style="padding:0 32px;">${travelRecsSection}</td></tr><tr><td style="background:#f8f9fb;padding:20px 32px;border-top:1px solid #e0e0e0;"><p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;">Questions? Contact your operations manager or reply to this email.</p><p style="margin:0;font-size:12px;"><a href="${APP_URL}" style="color:#1a73e8;text-decoration:none;">Open Dragon Seats Control Tower</a></p></td></tr></table></td></tr></table></body></html>`;
}
