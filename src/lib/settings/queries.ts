import { createClient } from "@/lib/supabase/server";
import { DEFAULT_OPTIMIZER_SETTINGS } from "./constants";
import type { SettingsPageData, PreferredRouteRow, HubDetail } from "./types";

export async function fetchSettingsData(): Promise<SettingsPageData> {
    const supabase = await createClient();
    const [routesResult, hubsResult] = await Promise.all([
        supabase.from("preferred_routes").select("*").order("origin_airport").order("destination_airport"),
        supabase.from("hubs").select("*").order("name"),
    ]);
    return {
        preferredRoutes: (routesResult.data ?? []) as PreferredRouteRow[],
        hubs: (hubsResult.data ?? []) as HubDetail[],
        optimizerSettings: DEFAULT_OPTIMIZER_SETTINGS,
    };
}
