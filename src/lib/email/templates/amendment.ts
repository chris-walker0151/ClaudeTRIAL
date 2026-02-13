import type { AmendmentEmailData, StaffAssignmentTrip } from "../types";
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

function badgeStyle(changeType: "added" | "removed" | "modified"): { bg: string; fg: string; label: string } {
    switch (changeType) {
        case "added":
            return { bg: "#dcfce7", fg: "#166534", label: "Added" };
        case "removed":
            return { bg: "#fee2e2", fg: "#991b1b", label: "Removed" };
        case "modified":
            return { bg: "#fef3c7", fg: "#92400e", label: "Modified" };
    }
}

function buildTripSection(trip: StaffAssignmentTrip): string {
    const miles = trip.totalMiles != null ? trip.totalMiles.toLocaleString() : "—";
    const hours = trip.totalDriveHrs != null ? trip.totalDriveHrs.toFixed(1) : "—";
    const itineraryRows = trip.stops.map((s) => {
        const loc = [s.venueName, s.city, s.state].filter(Boolean).map((v) => escapeHtml(v as string)).join(", ");
        const action = s.action ? escapeHtml(s.action) : "—";
        const arrival = s.arrivalTime ? formatTimestamp(s.arrivalTime) : "—";
        return `<tr><td style="padding:8px 10px;font-size:13px;border-bottom:1px solid #e0e0e0;">${loc}</td><td style="padding:8px 10px;font-size:13px;border-bottom:1px solid #e0e0e0;">${action}</td><td style="padding:8px 10px;font-size:13px;border-bottom:1px solid #e0e0e0;">${arrival}</td></tr>`;
    }).join("");
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border:1px solid #e0e0e0;border-collapse:collapse;overflow:hidden;"><tr><td colspan="2" style="background:#f0f4f8;padding:14px 16px;border-bottom:1px solid #e0e0e0;"><p style="margin:0;font-size:15px;font-weight:700;color:#1e3a5f;">Updated Trip: ${escapeHtml(trip.vehicleName)}</p></td></tr><tr><td width="50%" style="padding:12px 16px;vertical-align:top;font-size:13px;"><p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Role</p><p style="margin:0 0 14px 0;color:#1f2937;font-weight:600;">${escapeHtml(trip.roleOnTrip || "Staff")}</p><p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Hub</p><p style="margin:0;color:#1f2937;">${escapeHtml(trip.hubName)}</p></td><td width="50%" style="padding:12px 16px;vertical-align:top;font-size:13px;"><p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Depart</p><p style="margin:0 0 14px 0;color:#1f2937;">${formatTimestamp(trip.departTime)}</p><p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Return</p><p style="margin:0;color:#1f2937;">${formatTimestamp(trip.returnTime)}</p></td></tr><tr><td colspan="2" style="padding:0 16px 12px 16px;font-size:13px;"><p style="margin:0;color:#6b7280;"><strong style="color:#1f2937;">${miles}</strong> miles &bull; <strong style="color:#1f2937;">${hours}</strong> drive hours</p></td></tr><tr><td colspan="2" style="padding:0 16px 12px 16px;"><p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#1e3a5f;">Itinerary</p><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e0e0e0;border-collapse:collapse;"><thead><tr style="background:#f8f9fb;"><th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0;">Venue</th><th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0;">Action</th><th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0;">Arrival</th></tr></thead><tbody>${itineraryRows || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#9ca3af;">No stops listed.</td></tr>'}</tbody></table></td></tr></table>`;
}

export function buildAmendmentHtml(data: AmendmentEmailData): string {
    const badge = badgeStyle(data.changeType);
    const tripSection = data.updatedTrip ? buildTripSection(data.updatedTrip) : "";
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Schedule Update — Week ${data.weekNumber}</title></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><tr><td style="background:#1e3a5f;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Schedule Update &mdash; Week ${data.weekNumber}</h1><p style="margin:6px 0 0 0;color:#b0c4de;font-size:13px;">${data.seasonYear} Season &mdash; Dragon Seats</p></td></tr><tr><td style="padding:24px 32px 0 32px;"><p style="margin:0 0 16px 0;font-size:15px;color:#1f2937;">Hi ${escapeHtml(data.personName)},</p><p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;line-height:1.5;">Your Week ${data.weekNumber} schedule has been updated.</p><table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;"><tr><td style="background:${badge.bg};color:${badge.fg};padding:6px 14px;border-radius:4px;font-size:13px;font-weight:700;">${badge.label}</td></tr></table><div style="background:#f8f9fb;border-left:4px solid #1e3a5f;padding:14px 16px;border-radius:4px;margin-bottom:16px;"><p style="margin:0;font-size:14px;color:#1f2937;line-height:1.5;">${escapeHtml(data.changeSummary)}</p></div>${tripSection}</td></tr><tr><td style="background:#f8f9fb;padding:20px 32px;border-top:1px solid #e0e0e0;"><p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;">Questions? Contact your operations manager or reply to this email.</p><p style="margin:0;font-size:12px;"><a href="${APP_URL}" style="color:#1a73e8;text-decoration:none;">Open Dragon Seats Control Tower</a></p></td></tr></table></td></tr></table></body></html>`;
}
