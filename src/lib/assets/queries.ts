/**
 * Server-side Supabase queries for the Assets page.
 * These run in server components only.
 */

import { createClient } from "@/lib/supabase/server";
import type { AssetListItem, AssetsPageData } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Fetch all assets with hub/venue name joins, plus hubs list for filters.
 */
export async function fetchAssetsList(): Promise<AssetsPageData> {
    const supabase = await createClient();

    const [assetsResult, hubsResult] = await Promise.all([
        supabase
            .from("assets")
            .select(`
                id, serial_number, asset_type, model_version,
                condition, status, current_branding, weight_lbs, notes,
                home_hub:hubs\!home_hub_id(name),
                current_hub_rel:hubs\!current_hub(name),
                current_venue:venues\!current_venue_id(name)
            `)
            .order("serial_number", { ascending: true }),
        supabase
            .from("hubs")
            .select("id, name")
            .order("name"),
    ]);

    const rawAssets = assetsResult.data ?? [];
    const hubs = (hubsResult.data ?? []) as { id: string; name: string }[];

    const assets: AssetListItem[] = rawAssets.map((raw: any) => {
        const homeHub = raw.home_hub as unknown as { name: string } | null;
        const currentHub = raw.current_hub_rel as unknown as { name: string } | null;
        const currentVenue = raw.current_venue as unknown as { name: string } | null;

        return {
            id: raw.id,
            serial_number: raw.serial_number,
            asset_type: raw.asset_type,
            model_version: raw.model_version,
            condition: raw.condition,
            status: raw.status,
            home_hub_name: homeHub?.name ?? null,
            current_hub_name: currentHub?.name ?? null,
            current_venue_name: currentVenue?.name ?? null,
            current_branding: raw.current_branding,
            weight_lbs: raw.weight_lbs,
            notes: raw.notes,
        };
    });

    return { assets, hubs };
}

/* eslint-enable @typescript-eslint/no-explicit-any */
