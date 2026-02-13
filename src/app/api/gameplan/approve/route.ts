import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    checkGameplanReadiness,
    lockTripsForGameplan,
} from "@/lib/gameplan/queries";
import { sendStaffAssignmentEmails } from "@/lib/email/send-staff-assignments";

/**
 * POST /api/gameplan/approve
 *
 * Approve the gameplan for a given week:
 *  1. Auth check (Supabase session)
 *  2. Lock any remaining draft/recommended trips to "confirmed"
 *  3. Send staff assignment emails
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 },
            );
        }

        // 2. Parse body
        let body: { week_number?: number; season_year?: number };
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 },
            );
        }

        const { week_number, season_year } = body;
        if (!week_number || !season_year) {
            return NextResponse.json(
                { error: "week_number and season_year are required" },
                { status: 400 },
            );
        }

        // 3. Check readiness (warn but don't block -- ops may approve anyway)
        const readiness = await checkGameplanReadiness(
            week_number,
            season_year,
        );

        // 4. Lock any remaining non-confirmed trips
        const lockResult = await lockTripsForGameplan(
            week_number,
            season_year,
        );
        if (lockResult.error) {
            return NextResponse.json(
                { error: lockResult.error },
                { status: 500 },
            );
        }

        // 5. Send staff assignment emails
        const emailResult = await sendStaffAssignmentEmails(
            week_number,
            season_year,
        );

        // 6. Return result
        const approvedAt = new Date().toISOString();
        return NextResponse.json({
            success: true,
            tripsLocked: lockResult.locked,
            emailsSent: emailResult.sent,
            approvedAt,
            readinessWarnings: readiness.reasons,
            emailErrors: emailResult.errors,
        });
    } catch (error) {
        console.error("Gameplan approval error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
