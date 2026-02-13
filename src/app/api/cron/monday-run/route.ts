import { NextRequest, NextResponse } from "next/server";
import { OPTIMIZATION_SERVICE_URL } from "@/lib/gameplan/constants";
import { sendOpsGameplanEmail } from "@/lib/email/send-ops-gameplan";
import { SEASON_YEAR } from "@/lib/constants";

/**
 * POST /api/cron/monday-run
 *
 * Vercel Cron webhook that fires every Monday at 11:00 UTC (6 AM ET).
 *  1. Verify CRON_SECRET via Authorization Bearer header
 *  2. Call the Python optimizer service
 *  3. Send ops gameplan email
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Verify CRON_SECRET
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== "Bearer " + cronSecret) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const errors: string[] = [];

        // 2. Determine current week number
        // Accept from body if provided; otherwise default to 1.
        // In production this would compute from the season calendar.
        let weekNumber: number;
        try {
            const body = await request.json().catch(() => ({}));
            weekNumber =
                (body as { week_number?: number }).week_number || 1;
        } catch {
            weekNumber = 1;
        }

        // 3. Call Python optimizer
        let optimizerResult = {
            runId: null as string | null,
            tripsGenerated: 0,
            status: "failed",
        };

        try {
            const optimizeResponse = await fetch(
                OPTIMIZATION_SERVICE_URL + "/optimize",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        season_year: SEASON_YEAR,
                        week_number: weekNumber,
                        triggered_by: "cron",
                    }),
                    signal: AbortSignal.timeout(120000),
                },
            );

            const result = await optimizeResponse.json();
            optimizerResult = {
                runId: result.run_id ?? null,
                tripsGenerated: result.trips_generated || 0,
                status: result.status || "failed",
            };
        } catch (err) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Optimizer call failed";
            errors.push(msg);
        }

        // 4. Send ops gameplan email
        let opsEmailSent = false;
        try {
            const emailResult = await sendOpsGameplanEmail(
                weekNumber,
                SEASON_YEAR,
            );
            opsEmailSent = emailResult.success;
            if (!emailResult.success && emailResult.error) {
                errors.push("Email failed: " + emailResult.error);
            }
        } catch (err) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Email send failed";
            errors.push(msg);
        }

        // 5. Return result
        return NextResponse.json({
            optimizerResult,
            opsEmailSent,
            errors,
        });
    } catch (error) {
        console.error("Monday cron run error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
