/**
 * TypeScript types for the CSV import system.
 */

export type DataTypeKey =
    | "customers"
    | "venues"
    | "contracts"
    | "assets"
    | "personnel"
    | "vehicles"
    | "game_schedule"
    | "asset_assignments";

export type ColumnType =
    | "text"
    | "enum"
    | "date"
    | "time"
    | "number"
    | "boolean"
    | "email"
    | "phone";

export interface ColumnDef {
    csvHeader: string;
    dbField: string;
    required: boolean;
    type: ColumnType;
    enumValues?: readonly string[];
    description?: string;
}

export interface DataTypeConfig {
    key: DataTypeKey;
    label: string;
    description: string;
    icon: string;
    tableName: string;
    csvFilename: string;
    columns: ColumnDef[];
    fkDependencies: DataTypeKey[];
    importOrder: number;
}

export interface RowValidationError {
    row: number;
    column: string;
    value: string;
    message: string;
    severity: "error" | "warning";
}

export interface ValidationResult {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
    errors: RowValidationError[];
    warnings: RowValidationError[];
}

export interface FkValidationResult {
    valid: boolean;
    missingReferences: {
        row: number;
        column: string;
        value: string;
        message: string;
    }[];
    resolvedCount: number;
}

export interface ImportResult {
    success: boolean;
    insertedCount: number;
    failedCount: number;
    errors: { row: number; message: string }[];
    geocodedCount?: number;
    contractsCreated?: number;
    contractItemsCreated?: number;
}
