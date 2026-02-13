"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to real-time changes on the assets table.
 * Triggers router.refresh() when any asset is updated.
 */
export function useRealtimeAssets() {
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel("assets-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "assets",
                },
                () => {
                    router.refresh();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router]);
}
