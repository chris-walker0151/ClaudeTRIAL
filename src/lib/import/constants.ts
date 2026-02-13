/**
 * Central configuration for all 8 importable data types.
 * Defines column schemas, enum values, FK dependencies, and import ordering.
 */

import type { DataTypeConfig } from "./types";

// Enum values from 00001_create_enums.sql
export const ENUM_VALUES = {
    sport_type: [
        "nfl",
        "ncaa_football",
        "mlb",
        "pga",
        "tennis",
        "other",
    ] as const,
    asset_type: [
        "heated_bench",
        "cooling_bench",
        "hybrid_bench",
        "dragon_shader",
        "heated_foot_deck",
    ] as const,
    asset_condition: [
        "excellent",
        "good",
        "fair",
        "needs_repair",
        "out_of_service",
    ] as const,
    asset_status: [
        "at_hub",
        "loaded",
        "in_transit",
        "on_site",
        "returning",
        "rebranding",
    ] as const,
    personnel_role: [
        "driver",
        "service_tech",
        "lead_tech",
        "sales",
    ] as const,
    contract_type: [
        "lease_1yr",
        "lease_3yr",
        "lease_5yr",
        "one_off_rental",
        "conference_deal",
    ] as const,
    season_phase: [
        "preseason",
        "regular",
        "postseason",
        "bowl_season",
        "offseason",
    ] as const,
} as const;

// Valid hub names/codes accepted in CSV imports
export const VALID_HUB_NAMES = [
    "Cleveland",
    "Kansas City",
    "Jacksonville",
    "CLE",
    "KC",
    "JAX",
] as const;

// Hub code → full name mapping (used in server actions for FK resolution)
export const HUB_CODE_MAP: Record<string, string> = {
    CLE: "Cleveland",
    KC: "Kansas City",
    JAX: "Jacksonville",
    Cleveland: "Cleveland",
    "Kansas City": "Kansas City",
    Jacksonville: "Jacksonville",
};

// All 8 importable data types with full column definitions
export const DATA_TYPES: DataTypeConfig[] = [
    {
        key: "customers",
        label: "Customers",
        description: "NFL and NCAA team accounts with contact info",
        icon: "Users",
        tableName: "customers",
        csvFilename: "customers.csv",
        importOrder: 1,
        fkDependencies: [],
        columns: [
            { csvHeader: "customer_name", dbField: "name", required: true, type: "text" },
            { csvHeader: "sport", dbField: "sport_type", required: true, type: "enum", enumValues: ENUM_VALUES.sport_type },
            { csvHeader: "primary_contact_name", dbField: "primary_contact", required: false, type: "text" },
            { csvHeader: "contact_email", dbField: "contact_email", required: false, type: "email" },
            { csvHeader: "contact_phone", dbField: "contact_phone", required: false, type: "phone" },
            { csvHeader: "timezone", dbField: "timezone", required: false, type: "text" },
            { csvHeader: "notes", dbField: "notes", required: false, type: "text" },
        ],
    },
    {
        key: "venues",
        label: "Venues",
        description: "Stadium and event locations (auto-geocoded on import)",
        icon: "MapPin",
        tableName: "venues",
        csvFilename: "venues.csv",
        importOrder: 2,
        fkDependencies: ["customers"],
        columns: [
            { csvHeader: "customer_name", dbField: "_fk_customer", required: false, type: "text", description: "Must match an existing customer name" },
            { csvHeader: "venue_name", dbField: "name", required: true, type: "text" },
            { csvHeader: "venue_address", dbField: "address", required: true, type: "text", description: "Full address for geocoding" },
            { csvHeader: "is_primary", dbField: "is_primary", required: false, type: "boolean" },
            { csvHeader: "notes", dbField: "notes", required: false, type: "text" },
        ],
    },
    {
        key: "contracts",
        label: "Contracts",
        description: "Equipment contracts with line items (grouped automatically)",
        icon: "FileText",
        tableName: "contracts",
        csvFilename: "contracts.csv",
        importOrder: 3,
        fkDependencies: ["customers"],
        columns: [
            { csvHeader: "customer_name", dbField: "_fk_customer", required: true, type: "text", description: "Must match an existing customer name" },
            { csvHeader: "contract_type", dbField: "contract_type", required: true, type: "enum", enumValues: ENUM_VALUES.contract_type },
            { csvHeader: "start_date", dbField: "start_date", required: true, type: "date" },
            { csvHeader: "end_date", dbField: "end_date", required: true, type: "date" },
            { csvHeader: "asset_type", dbField: "_item_asset_type", required: true, type: "enum", enumValues: ENUM_VALUES.asset_type },
            { csvHeader: "model_version", dbField: "_item_model_version", required: false, type: "text" },
            { csvHeader: "quantity", dbField: "_item_quantity", required: true, type: "number" },
            { csvHeader: "branding_spec", dbField: "_item_branding_spec", required: false, type: "text" },
            { csvHeader: "notes", dbField: "notes", required: false, type: "text" },
        ],
    },
    {
        key: "assets",
        label: "Assets",
        description: "Equipment inventory (benches, shaders, foot decks)",
        icon: "Package",
        tableName: "assets",
        csvFilename: "assets.csv",
        importOrder: 4,
        fkDependencies: [],
        columns: [
            { csvHeader: "serial_number", dbField: "serial_number", required: true, type: "text" },
            { csvHeader: "asset_type", dbField: "asset_type", required: true, type: "enum", enumValues: ENUM_VALUES.asset_type },
            { csvHeader: "generation", dbField: "model_version", required: false, type: "text" },
            { csvHeader: "home_hub", dbField: "_fk_hub", required: true, type: "text", description: "Cleveland, Kansas City, Jacksonville, CLE, KC, or JAX" },
            { csvHeader: "status", dbField: "_status_text", required: false, type: "text" },
            { csvHeader: "weight_lbs", dbField: "weight_lbs", required: false, type: "number" },
            { csvHeader: "notes", dbField: "notes", required: false, type: "text" },
        ],
    },
    {
        key: "personnel",
        label: "Personnel",
        description: "Drivers, technicians, and sales staff",
        icon: "UserCog",
        tableName: "personnel",
        csvFilename: "personnel.csv",
        importOrder: 5,
        fkDependencies: [],
        columns: [
            { csvHeader: "name", dbField: "name", required: true, type: "text" },
            { csvHeader: "role", dbField: "role", required: true, type: "enum", enumValues: ENUM_VALUES.personnel_role },
            { csvHeader: "home_hub", dbField: "_fk_hub", required: true, type: "text", description: "Cleveland, Kansas City, Jacksonville, CLE, KC, or JAX" },
            { csvHeader: "phone", dbField: "phone", required: false, type: "phone" },
            { csvHeader: "email", dbField: "email", required: false, type: "email" },
            { csvHeader: "skills", dbField: "skills", required: false, type: "text", description: "Semicolon-separated list of skills" },
            { csvHeader: "max_drive_hours", dbField: "max_drive_hrs", required: false, type: "number" },
            { csvHeader: "notes", dbField: "notes", required: false, type: "text" },
        ],
    },
    {
        key: "vehicles",
        label: "Vehicles",
        description: "Trucks, trailers, and vans by hub",
        icon: "Truck",
        tableName: "vehicles",
        csvFilename: "vehicles.csv",
        importOrder: 6,
        fkDependencies: [],
        columns: [
            { csvHeader: "vehicle_name", dbField: "name", required: true, type: "text" },
            { csvHeader: "vehicle_type", dbField: "type", required: false, type: "text" },
            { csvHeader: "home_hub", dbField: "_fk_hub", required: true, type: "text", description: "Cleveland, Kansas City, Jacksonville, CLE, KC, or JAX" },
            { csvHeader: "capacity_lbs", dbField: "capacity_lbs", required: false, type: "number" },
            { csvHeader: "capacity_cuft", dbField: "capacity_cuft", required: false, type: "number" },
            { csvHeader: "status", dbField: "status", required: false, type: "text" },
            { csvHeader: "notes", dbField: "notes", required: false, type: "text" },
        ],
    },
    {
        key: "game_schedule",
        label: "Game Schedule",
        description: "Season game dates, times, and venues",
        icon: "CalendarDays",
        tableName: "game_schedule",
        csvFilename: "game-schedule.csv",
        importOrder: 7,
        fkDependencies: ["customers", "venues"],
        columns: [
            { csvHeader: "customer_name", dbField: "_fk_customer", required: true, type: "text", description: "Must match an existing customer name" },
            { csvHeader: "venue_name", dbField: "_fk_venue", required: false, type: "text", description: "Must match an existing venue name (blank = customer's primary venue)" },
            { csvHeader: "season_year", dbField: "season_year", required: true, type: "number" },
            { csvHeader: "week_number", dbField: "week_number", required: true, type: "number" },
            { csvHeader: "game_date", dbField: "game_date", required: true, type: "date" },
            { csvHeader: "game_time", dbField: "game_time", required: false, type: "time" },
            { csvHeader: "opponent", dbField: "opponent", required: false, type: "text" },
            { csvHeader: "is_home_game", dbField: "is_home_game", required: false, type: "boolean" },
            { csvHeader: "sidelines_served", dbField: "sidelines_served", required: false, type: "text" },
            { csvHeader: "season_phase", dbField: "season_phase", required: true, type: "enum", enumValues: ENUM_VALUES.season_phase },
            { csvHeader: "notes", dbField: "notes", required: false, type: "text" },
        ],
    },
    {
        key: "asset_assignments",
        label: "Asset Assignments",
        description: "Link assets to customers for a season",
        icon: "Link",
        tableName: "asset_assignments",
        csvFilename: "asset-assignments.csv",
        importOrder: 8,
        fkDependencies: ["customers", "assets"],
        columns: [
            { csvHeader: "serial_number", dbField: "_fk_asset", required: true, type: "text", description: "Must match an existing asset serial number" },
            { csvHeader: "customer_name", dbField: "_fk_customer", required: true, type: "text", description: "Must match an existing customer name" },
            { csvHeader: "season_year", dbField: "season_year", required: true, type: "number" },
            { csvHeader: "is_permanent", dbField: "is_permanent", required: false, type: "boolean" },
            { csvHeader: "assigned_at", dbField: "assigned_at", required: false, type: "date" },
            { csvHeader: "unassigned_at", dbField: "unassigned_at", required: false, type: "date" },
            { csvHeader: "notes", dbField: "notes", required: false, type: "text" },
        ],
    },
];

/**
 * Look up a DataTypeConfig by key.
 */
export function getDataTypeConfig(key: string): DataTypeConfig | undefined {
    return DATA_TYPES.find((dt) => dt.key === key);
}
