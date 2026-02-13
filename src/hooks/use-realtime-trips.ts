"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to real-time changes on the trips table for a given week.
 * Triggers router.refresh() when any trip is inserted, updated, or deleted.
 */
export function useRealtimeTrips(weekNumber: number, seasonYear: number) {
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`trips-week-${seasonYear}-${weekNumber}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "trips",
                    filter: `week_number=eq.${weekNumber}`,
                },
                () => {
                    router.refresh();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [weekNumber, seasonYear, router]);
}
