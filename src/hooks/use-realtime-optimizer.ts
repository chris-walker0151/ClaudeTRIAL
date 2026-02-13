"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to optimizer_runs table changes.
 * When a run completes (or fails/partial), fires the onRunComplete callback.
 */
export function useRealtimeOptimizer(
    weekNumber: number,
    seasonYear: number,
    onRunComplete: () => void,
) {
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`optimizer-${seasonYear}-${weekNumber}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "optimizer_runs",
                    filter: `week_number=eq.${weekNumber}`,
                },
                (payload) => {
                    const newRecord = payload.new as Record<string, unknown>;
                    const status = newRecord?.status as string | undefined;
                    if (
                        status === "completed" ||
                        status === "failed" ||
                        status === "partial"
                    ) {
                        onRunComplete();
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [weekNumber, seasonYear, onRunComplete]);
}
