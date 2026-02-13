"use server";

/**
 * Server Actions for the CSV import wizard.
 * Handles FK validation, data import with geocoding, and batch inserts.
 */

import { createClient } from "@/lib/supabase/server";
import type { DataTypeKey, FkValidationResult, ImportResult } from "@/lib/import/types";
import { HUB_CODE_MAP } from "@/lib/import/constants";

// ---------------------------------------------------------------------------
// Geocoding helper
// ---------------------------------------------------------------------------

async function geocodeAddress(
    address: string
): Promise<{ lat: number; lng: number } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || !address) return null;

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results?.[0]?.geometry?.location) {
            return data.results[0].geometry.location;
        }
    } catch {
        // Geocoding failed — venue will be inserted without coordinates
    }
    return null;
}

function parseBool(value: string): boolean {
    return ["true", "yes", "1"].includes((value ?? "").toLowerCase());
}

// ---------------------------------------------------------------------------
// FK Validation
// ---------------------------------------------------------------------------

export async function validateForeignKeys(
    dataType: DataTypeKey,
    rows: Record<string, string>[]
): Promise<FkValidationResult> {
    const supabase = await createClient();
    const missing: FkValidationResult["missingReferences"] = [];
    let resolvedCount = 0;

    // Customer name FK check
    if (
        ["venues", "contracts", "game_schedule", "asset_assignments"].includes(
            dataType
        )
    ) {
        const customerNames = [
            ...new Set(
                rows.map((r) => r.customer_name?.trim()).filter(Boolean)
            ),
        ];
        if (customerNames.length > 0) {
            const { data: customers } = await supabase
                .from("customers")
                .select("name")
                .in("name", customerNames);
            const existing = new Set(
                (customers || []).map((c: { name: string }) => c.name)
            );

            for (let i = 0; i < rows.length; i++) {
                const name = rows[i].customer_name?.trim();
                if (!name) continue;
                if (existing.has(name)) {
                    resolvedCount++;
                } else {
                    missing.push({
                        row: i + 1,
                        column: "customer_name",
                        value: name,
                        message: `Customer "${name}" not found in database`,
                    });
                }
            }
        }
    }

    // Venue name FK check
    if (dataType === "game_schedule") {
        const venueNames = [
            ...new Set(
                rows.map((r) => r.venue_name?.trim()).filter(Boolean)
            ),
        ];
        if (venueNames.length > 0) {
            const { data: venues } = await supabase
                .from("venues")
                .select("name")
                .in("name", venueNames);
            const existing = new Set(
                (venues || []).map((v: { name: string }) => v.name)
            );

            for (let i = 0; i < rows.length; i++) {
                const name = rows[i].venue_name?.trim();
                if (!name) continue;
                if (existing.has(name)) {
                    resolvedCount++;
                } else {
                    missing.push({
                        row: i + 1,
                        column: "venue_name",
                        value: name,
                        message: `Venue "${name}" not found in database`,
                    });
                }
            }
        }
    }

    // Asset serial number FK check
    if (dataType === "asset_assignments") {
        const serials = [
            ...new Set(
                rows.map((r) => r.serial_number?.trim()).filter(Boolean)
            ),
        ];
        if (serials.length > 0) {
            // Supabase .in() has a limit — batch if needed
            const batchSize = 200;
            const existingSerials = new Set<string>();
            for (let i = 0; i < serials.length; i += batchSize) {
                const batch = serials.slice(i, i + batchSize);
                const { data: assets } = await supabase
                    .from("assets")
                    .select("serial_number")
                    .in("serial_number", batch);
                (assets || []).forEach(
                    (a: { serial_number: string }) =>
                        existingSerials.add(a.serial_number)
                );
            }

            for (let i = 0; i < rows.length; i++) {
                const serial = rows[i].serial_number?.trim();
                if (!serial) continue;
                if (existingSerials.has(serial)) {
                    resolvedCount++;
                } else {
                    missing.push({
                        row: i + 1,
                        column: "serial_number",
                        value: serial,
                        message: `Asset "${serial}" not found in database`,
                    });
                }
            }
        }
    }

    return {
        valid: missing.length === 0,
        missingReferences: missing,
        resolvedCount,
    };
}

// ---------------------------------------------------------------------------
// Import Data — Main dispatcher
// ---------------------------------------------------------------------------

export async function importData(
    dataType: DataTypeKey,
    rows: Record<string, string>[]
): Promise<ImportResult> {
    switch (dataType) {
        case "customers":
            return importCustomers(rows);
        case "venues":
            return importVenues(rows);
        case "contracts":
            return importContracts(rows);
        case "assets":
            return importAssets(rows);
        case "personnel":
            return importPersonnel(rows);
        case "vehicles":
            return importVehicles(rows);
        case "game_schedule":
            return importGameSchedule(rows);
        case "asset_assignments":
            return importAssetAssignments(rows);
    }
}

// ---------------------------------------------------------------------------
// Individual importers
// ---------------------------------------------------------------------------

async function importCustomers(
    rows: Record<string, string>[]
): Promise<ImportResult> {
    const supabase = await createClient();
    const errors: ImportResult["errors"] = [];
    let insertedCount = 0;

    const records = rows.map((r) => ({
        name: r.customer_name?.trim(),
        sport_type: r.sport?.trim(),
        primary_contact: r.primary_contact_name?.trim() || null,
        contact_email: r.contact_email?.trim() || null,
        contact_phone: r.contact_phone?.trim() || null,
        timezone: r.timezone?.trim() || null,
        notes: r.notes?.trim() || null,
    }));

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from("customers")
            .insert(batch)
            .select("id");
        if (error) {
            errors.push({ row: i + 1, message: error.message });
        } else {
            insertedCount += data?.length || 0;
        }
    }

    return {
        success: errors.length === 0,
        insertedCount,
        failedCount: records.length - insertedCount,
        errors,
    };
}

async function importVenues(
    rows: Record<string, string>[]
): Promise<ImportResult> {
    const supabase = await createClient();
    const errors: ImportResult["errors"] = [];
    let insertedCount = 0;
    let geocodedCount = 0;

    // Build customer name → id lookup
    const customerNames = [
        ...new Set(rows.map((r) => r.customer_name?.trim()).filter(Boolean)),
    ];
    const customerMap = new Map<string, string>();
    if (customerNames.length > 0) {
        const { data: customers } = await supabase
            .from("customers")
            .select("id, name")
            .in("name", customerNames);
        (customers || []).forEach(
            (c: { id: string; name: string }) =>
                customerMap.set(c.name, c.id)
        );
    }

    // Build records with geocoding
    const records = [];
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const customerName = r.customer_name?.trim();
        const customerId = customerName
            ? customerMap.get(customerName) || null
            : null;

        // Geocode
        let lat: number | null = null;
        let lng: number | null = null;
        const address = r.venue_address?.trim();
        if (address) {
            const geo = await geocodeAddress(address);
            if (geo) {
                lat = geo.lat;
                lng = geo.lng;
                geocodedCount++;
            }
            // Rate limit: 200ms between geocoding calls
            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Parse city/state from address
        const parts = (address || "").split(",").map((s) => s.trim());
        let city: string | null = null;
        let state: string | null = null;
        if (parts.length >= 3) {
            city = parts[parts.length - 3] || null;
            const stateZip = parts[parts.length - 2] || "";
            state = stateZip.split(" ")[0] || null;
        } else if (parts.length >= 2) {
            city = parts[parts.length - 2] || null;
            const stateZip = parts[parts.length - 1] || "";
            state = stateZip.split(" ")[0] || null;
        }

        records.push({
            customer_id: customerId,
            name: r.venue_name?.trim(),
            address: address || null,
            city,
            state,
            lat,
            lng,
            is_primary: parseBool(r.is_primary),
            notes: r.notes?.trim() || null,
        });
    }

    // Batch insert
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from("venues")
            .insert(batch)
            .select("id");
        if (error) {
            errors.push({ row: i + 1, message: error.message });
        } else {
            insertedCount += data?.length || 0;
        }
    }

    return {
        success: errors.length === 0,
        insertedCount,
        failedCount: records.length - insertedCount,
        errors,
        geocodedCount,
    };
}

async function importContracts(
    rows: Record<string, string>[]
): Promise<ImportResult> {
    const supabase = await createClient();
    const errors: ImportResult["errors"] = [];
    let contractsCreated = 0;
    let contractItemsCreated = 0;

    // Build customer name → id lookup
    const customerNames = [
        ...new Set(rows.map((r) => r.customer_name?.trim()).filter(Boolean)),
    ];
    const customerMap = new Map<string, string>();
    if (customerNames.length > 0) {
        const { data: customers } = await supabase
            .from("customers")
            .select("id, name")
            .in("name", customerNames);
        (customers || []).forEach(
            (c: { id: string; name: string }) =>
                customerMap.set(c.name, c.id)
        );
    }

    // Group rows into contracts by (customer_name, contract_type, start_date, end_date)
    const contractGroups = new Map<
        string,
        { header: Record<string, string>; items: Record<string, string>[] }
    >();
    for (const row of rows) {
        const key = [
            row.customer_name?.trim(),
            row.contract_type?.trim(),
            row.start_date?.trim(),
            row.end_date?.trim(),
        ].join("|");
        if (!contractGroups.has(key)) {
            contractGroups.set(key, { header: row, items: [] });
        }
        contractGroups.get(key)!.items.push(row);
    }

    // Insert each contract + its items
    let groupIdx = 0;
    for (const [, group] of contractGroups) {
        groupIdx++;
        const h = group.header;
        const customerName = h.customer_name?.trim();
        const customerId = customerName
            ? customerMap.get(customerName)
            : undefined;
        if (!customerId) {
            errors.push({
                row: groupIdx,
                message: `Customer "${customerName}" not found`,
            });
            continue;
        }

        // Insert contract
        const { data: contractData, error: contractErr } = await supabase
            .from("contracts")
            .insert({
                customer_id: customerId,
                contract_type: h.contract_type?.trim(),
                start_date: h.start_date?.trim(),
                end_date: h.end_date?.trim(),
                status: "active",
                notes: h.notes?.trim() || null,
            })
            .select("id")
            .single();

        if (contractErr || !contractData) {
            errors.push({
                row: groupIdx,
                message: contractErr?.message || "Failed to create contract",
            });
            continue;
        }
        contractsCreated++;

        // Insert contract items
        const items = group.items.map((item) => ({
            contract_id: contractData.id,
            asset_type: item.asset_type?.trim(),
            model_version: item.model_version?.trim() || null,
            quantity: parseInt(item.quantity?.trim() || "0", 10),
            branding_spec: item.branding_spec?.trim() || null,
            notes: null,
        }));

        const { data: itemData, error: itemErr } = await supabase
            .from("contract_items")
            .insert(items)
            .select("id");
        if (itemErr) {
            errors.push({
                row: groupIdx,
                message: `Contract items error: ${itemErr.message}`,
            });
        } else {
            contractItemsCreated += itemData?.length || 0;
        }
    }

    return {
        success: errors.length === 0,
        insertedCount: contractsCreated,
        failedCount: contractGroups.size - contractsCreated,
        errors,
        contractsCreated,
        contractItemsCreated,
    };
}

async function importAssets(
    rows: Record<string, string>[]
): Promise<ImportResult> {
    const supabase = await createClient();
    const errors: ImportResult["errors"] = [];
    let insertedCount = 0;

    // Build hub name → id lookup
    const { data: hubs } = await supabase.from("hubs").select("id, name");
    const hubMap = new Map<string, string>();
    (hubs || []).forEach((h: { id: string; name: string }) =>
        hubMap.set(h.name, h.id)
    );

    const records = rows.map((r) => {
        const hubCode = r.home_hub?.trim() || "";
        const hubName = HUB_CODE_MAP[hubCode] || hubCode;
        const hubId = hubMap.get(hubName) || null;

        return {
            serial_number: r.serial_number?.trim(),
            asset_type: r.asset_type?.trim(),
            model_version: r.generation?.trim() || null,
            condition: "good" as const,
            status: "at_hub" as const,
            home_hub_id: hubId,
            current_hub: hubId,
            weight_lbs: r.weight_lbs ? parseFloat(r.weight_lbs.trim()) : null,
            notes: r.notes?.trim() || null,
        };
    });

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from("assets")
            .insert(batch)
            .select("id");
        if (error) {
            errors.push({ row: i + 1, message: error.message });
        } else {
            insertedCount += data?.length || 0;
        }
    }

    return {
        success: errors.length === 0,
        insertedCount,
        failedCount: records.length - insertedCount,
        errors,
    };
}

async function importPersonnel(
    rows: Record<string, string>[]
): Promise<ImportResult> {
    const supabase = await createClient();
    const errors: ImportResult["errors"] = [];
    let insertedCount = 0;

    // Build hub lookup
    const { data: hubs } = await supabase.from("hubs").select("id, name");
    const hubMap = new Map<string, string>();
    (hubs || []).forEach((h: { id: string; name: string }) =>
        hubMap.set(h.name, h.id)
    );

    const records = rows.map((r) => {
        const hubCode = r.home_hub?.trim() || "";
        const hubName = HUB_CODE_MAP[hubCode] || hubCode;
        const hubId = hubMap.get(hubName) || null;

        // Convert semicolon-separated skills to JSON array
        const skillsText = r.skills?.trim();
        const skills = skillsText
            ? skillsText.split(";").map((s) => s.trim()).filter(Boolean)
            : null;

        return {
            name: r.name?.trim(),
            role: r.role?.trim(),
            home_hub_id: hubId,
            phone: r.phone?.trim() || null,
            email: r.email?.trim() || null,
            skills: skills ? JSON.stringify(skills) : null,
            max_drive_hrs: r.max_drive_hours
                ? parseInt(r.max_drive_hours.trim(), 10)
                : 11,
            notes: r.notes?.trim() || null,
        };
    });

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from("personnel")
            .insert(batch)
            .select("id");
        if (error) {
            errors.push({ row: i + 1, message: error.message });
        } else {
            insertedCount += data?.length || 0;
        }
    }

    return {
        success: errors.length === 0,
        insertedCount,
        failedCount: records.length - insertedCount,
        errors,
    };
}

async function importVehicles(
    rows: Record<string, string>[]
): Promise<ImportResult> {
    const supabase = await createClient();
    const errors: ImportResult["errors"] = [];
    let insertedCount = 0;

    // Build hub lookup
    const { data: hubs } = await supabase.from("hubs").select("id, name");
    const hubMap = new Map<string, string>();
    (hubs || []).forEach((h: { id: string; name: string }) =>
        hubMap.set(h.name, h.id)
    );

    const records = rows.map((r) => {
        const hubCode = r.home_hub?.trim() || "";
        const hubName = HUB_CODE_MAP[hubCode] || hubCode;
        const hubId = hubMap.get(hubName) || null;

        return {
            name: r.vehicle_name?.trim(),
            type: r.vehicle_type?.trim() || null,
            home_hub_id: hubId,
            capacity_lbs: r.capacity_lbs
                ? parseInt(r.capacity_lbs.trim(), 10)
                : null,
            capacity_cuft: r.capacity_cuft
                ? parseInt(r.capacity_cuft.trim(), 10)
                : null,
            status: r.status?.trim() || "active",
            notes: r.notes?.trim() || null,
        };
    });

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from("vehicles")
            .insert(batch)
            .select("id");
        if (error) {
            errors.push({ row: i + 1, message: error.message });
        } else {
            insertedCount += data?.length || 0;
        }
    }

    return {
        success: errors.length === 0,
        insertedCount,
        failedCount: records.length - insertedCount,
        errors,
    };
}

async function importGameSchedule(
    rows: Record<string, string>[]
): Promise<ImportResult> {
    const supabase = await createClient();
    const errors: ImportResult["errors"] = [];
    let insertedCount = 0;

    // Build customer name → id lookup
    const customerNames = [
        ...new Set(rows.map((r) => r.customer_name?.trim()).filter(Boolean)),
    ];
    const customerMap = new Map<string, string>();
    if (customerNames.length > 0) {
        const { data: customers } = await supabase
            .from("customers")
            .select("id, name")
            .in("name", customerNames);
        (customers || []).forEach(
            (c: { id: string; name: string }) =>
                customerMap.set(c.name, c.id)
        );
    }

    // Build venue name → id lookup
    const venueNames = [
        ...new Set(rows.map((r) => r.venue_name?.trim()).filter(Boolean)),
    ];
    const venueMap = new Map<string, string>();
    if (venueNames.length > 0) {
        const { data: venues } = await supabase
            .from("venues")
            .select("id, name")
            .in("name", venueNames);
        (venues || []).forEach(
            (v: { id: string; name: string }) =>
                venueMap.set(v.name, v.id)
        );
    }

    const records = rows.map((r) => {
        const customerName = r.customer_name?.trim();
        const venueName = r.venue_name?.trim();

        return {
            customer_id: customerName
                ? customerMap.get(customerName) || null
                : null,
            venue_id: venueName ? venueMap.get(venueName) || null : null,
            season_year: parseInt(r.season_year?.trim() || "0", 10),
            week_number: parseInt(r.week_number?.trim() || "0", 10),
            game_date: r.game_date?.trim(),
            game_time: r.game_time?.trim() || null,
            opponent: r.opponent?.trim() || null,
            is_home_game: r.is_home_game
                ? parseBool(r.is_home_game)
                : true,
            sidelines_served: r.sidelines_served?.trim() || "both",
            season_phase: r.season_phase?.trim(),
            notes: r.notes?.trim() || null,
        };
    });

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from("game_schedule")
            .insert(batch)
            .select("id");
        if (error) {
            errors.push({ row: i + 1, message: error.message });
        } else {
            insertedCount += data?.length || 0;
        }
    }

    return {
        success: errors.length === 0,
        insertedCount,
        failedCount: records.length - insertedCount,
        errors,
    };
}

async function importAssetAssignments(
    rows: Record<string, string>[]
): Promise<ImportResult> {
    const supabase = await createClient();
    const errors: ImportResult["errors"] = [];
    let insertedCount = 0;

    // Build customer name → id lookup
    const customerNames = [
        ...new Set(rows.map((r) => r.customer_name?.trim()).filter(Boolean)),
    ];
    const customerMap = new Map<string, string>();
    if (customerNames.length > 0) {
        const { data: customers } = await supabase
            .from("customers")
            .select("id, name")
            .in("name", customerNames);
        (customers || []).forEach(
            (c: { id: string; name: string }) =>
                customerMap.set(c.name, c.id)
        );
    }

    // Build serial_number → id lookup (batch for 800+ assets)
    const serials = [
        ...new Set(rows.map((r) => r.serial_number?.trim()).filter(Boolean)),
    ];
    const assetMap = new Map<string, string>();
    const batchLookupSize = 200;
    for (let i = 0; i < serials.length; i += batchLookupSize) {
        const batch = serials.slice(i, i + batchLookupSize);
        const { data: assets } = await supabase
            .from("assets")
            .select("id, serial_number")
            .in("serial_number", batch);
        (assets || []).forEach(
            (a: { id: string; serial_number: string }) =>
                assetMap.set(a.serial_number, a.id)
        );
    }

    const records = rows.map((r) => {
        const customerName = r.customer_name?.trim();
        const serialNumber = r.serial_number?.trim();

        return {
            asset_id: serialNumber ? assetMap.get(serialNumber) || null : null,
            customer_id: customerName
                ? customerMap.get(customerName) || null
                : null,
            season_year: parseInt(r.season_year?.trim() || "0", 10),
            is_permanent: r.is_permanent
                ? parseBool(r.is_permanent)
                : false,
            assigned_at: r.assigned_at?.trim() || null,
            unassigned_at: r.unassigned_at?.trim() || null,
            notes: r.notes?.trim() || null,
        };
    });

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from("asset_assignments")
            .insert(batch)
            .select("id");
        if (error) {
            errors.push({ row: i + 1, message: error.message });
        } else {
            insertedCount += data?.length || 0;
        }
    }

    return {
        success: errors.length === 0,
        insertedCount,
        failedCount: records.length - insertedCount,
        errors,
    };
}
