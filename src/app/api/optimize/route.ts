import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPTIMIZATION_SERVICE_URL =
    process.env.OPTIMIZATION_SERVICE_URL || "http://localhost:5001";

/**
 * POST /api/optimize
 *
 * Proxy to the Python optimization service.
 * - Auth check: must be authenticated Supabase user
 * - Rate limiting: max 1 pending/running per week, min 60s between runs
 * - Forwards triggered_by: user_id from session
 */
export async function POST(request: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { season_year, week_number } = body;

        if (!season_year || week_number === undefined || week_number === null) {
            return NextResponse.json(
                { error: "season_year and week_number are required" },
                { status: 400 }
            );
        }

        // Rate limiting: check for recent/active runs for this week
        const { data: recentRuns } = await supabase
            .from("optimizer_runs")
            .select("id, status, created_at")
            .eq("season_year", season_year)
            .eq("week_number", week_number)
            .in("status", ["pending", "running"])
            .limit(1);

        if (recentRuns && recentRuns.length > 0) {
            return NextResponse.json(
                {
                    error: "An optimization run is already in progress for this week",
                    existing_run_id: recentRuns[0].id,
                },
                { status: 429 }
            );
        }

        // Debounce: check if a run completed less than 60s ago
        const { data: completedRuns } = await supabase
            .from("optimizer_runs")
            .select("id, completed_at")
            .eq("season_year", season_year)
            .eq("week_number", week_number)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(1);

        if (completedRuns && completedRuns.length > 0) {
            const completedAt = new Date(completedRuns[0].completed_at);
            const now = new Date();
            const secondsSince =
                (now.getTime() - completedAt.getTime()) / 1000;

            if (secondsSince < 60) {
                return NextResponse.json(
                    {
                        error: `Please wait ${Math.ceil(60 - secondsSince)} seconds before re-running`,
                        last_run_id: completedRuns[0].id,
                    },
                    { status: 429 }
                );
            }
        }

        // Forward to Python optimization service
        const optimizeResponse = await fetch(
            `${OPTIMIZATION_SERVICE_URL}/optimize`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    season_year,
                    week_number,
                    triggered_by: user.id,
                }),
                // No timeout — optimizer can take 5+ minutes for complex weeks
            }
        );

        const result = await optimizeResponse.json();

        if (!optimizeResponse.ok) {
            return NextResponse.json(result, {
                status: optimizeResponse.status,
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Optimization API error:", error);

        if (error instanceof TypeError && error.message.includes("fetch")) {
            return NextResponse.json(
                {
                    error: "Optimization service is not running. Start it with: cd optimization-service && python main.py",
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
