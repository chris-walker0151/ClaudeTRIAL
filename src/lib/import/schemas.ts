/**
 * Validation engine for CSV import data.
 * Performs client-side checks: required fields, enum values, format validation.
 */

import type {
    DataTypeConfig,
    DataTypeKey,
    RowValidationError,
    ValidationResult,
} from "./types";
import { VALID_HUB_NAMES } from "./constants";

/**
 * Validate all rows against the data type's column definitions.
 */
export function validateRows(
    dataType: DataTypeKey,
    rows: Record<string, string>[],
    config: DataTypeConfig
): ValidationResult {
    const errors: RowValidationError[] = [];
    const warnings: RowValidationError[] = [];
    const errorRowSet = new Set<number>();
    const warningRowSet = new Set<number>();

    // Track serial_number uniqueness for assets
    const seenSerials = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        for (const col of config.columns) {
            const value = (row[col.csvHeader] ?? "").trim();

            // Required field check
            if (col.required && !value) {
                errors.push({
                    row: rowNum,
                    column: col.csvHeader,
                    value,
                    message: `Required field "${col.csvHeader}" is empty`,
                    severity: "error",
                });
                errorRowSet.add(rowNum);
                continue;
            }

            if (!value) continue;

            // Type-specific validation
            switch (col.type) {
                case "enum":
                    if (
                        col.enumValues &&
                        !col.enumValues.includes(value)
                    ) {
                        errors.push({
                            row: rowNum,
                            column: col.csvHeader,
                            value,
                            message: `Invalid value "${value}". Must be one of: ${col.enumValues.join(", ")}`,
                            severity: "error",
                        });
                        errorRowSet.add(rowNum);
                    }
                    break;

                case "date":
                    if (
                        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
                        isNaN(Date.parse(value))
                    ) {
                        errors.push({
                            row: rowNum,
                            column: col.csvHeader,
                            value,
                            message: `Invalid date format "${value}". Expected YYYY-MM-DD`,
                            severity: "error",
                        });
                        errorRowSet.add(rowNum);
                    }
                    break;

                case "time":
                    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
                        errors.push({
                            row: rowNum,
                            column: col.csvHeader,
                            value,
                            message: `Invalid time format "${value}". Expected HH:MM`,
                            severity: "error",
                        });
                        errorRowSet.add(rowNum);
                    }
                    break;

                case "number":
                    if (isNaN(Number(value))) {
                        errors.push({
                            row: rowNum,
                            column: col.csvHeader,
                            value,
                            message: `Invalid number "${value}"`,
                            severity: "error",
                        });
                        errorRowSet.add(rowNum);
                    }
                    break;

                case "boolean":
                    if (
                        !["true", "false", "yes", "no", "1", "0"].includes(
                            value.toLowerCase()
                        )
                    ) {
                        errors.push({
                            row: rowNum,
                            column: col.csvHeader,
                            value,
                            message: `Invalid boolean "${value}". Expected true/false, yes/no, or 1/0`,
                            severity: "error",
                        });
                        errorRowSet.add(rowNum);
                    }
                    break;

                case "email":
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        warnings.push({
                            row: rowNum,
                            column: col.csvHeader,
                            value,
                            message: `"${value}" may not be a valid email address`,
                            severity: "warning",
                        });
                        warningRowSet.add(rowNum);
                    }
                    break;

                case "phone":
                    if (!/^[\d\s()+.-]{7,20}$/.test(value)) {
                        warnings.push({
                            row: rowNum,
                            column: col.csvHeader,
                            value,
                            message: `"${value}" may not be a valid phone number`,
                            severity: "warning",
                        });
                        warningRowSet.add(rowNum);
                    }
                    break;
            }
        }

        // Hub name validation for assets, personnel, vehicles
        if (
            dataType === "assets" ||
            dataType === "personnel" ||
            dataType === "vehicles"
        ) {
            const hubValue = (row["home_hub"] ?? "").trim();
            if (
                hubValue &&
                !(VALID_HUB_NAMES as readonly string[]).includes(hubValue)
            ) {
                errors.push({
                    row: rowNum,
                    column: "home_hub",
                    value: hubValue,
                    message: `Invalid hub "${hubValue}". Must be one of: ${VALID_HUB_NAMES.join(", ")}`,
                    severity: "error",
                });
                errorRowSet.add(rowNum);
            }
        }

        // Serial number uniqueness check for assets
        if (dataType === "assets") {
            const serial = (row["serial_number"] ?? "").trim();
            if (serial) {
                if (seenSerials.has(serial)) {
                    errors.push({
                        row: rowNum,
                        column: "serial_number",
                        value: serial,
                        message: `Duplicate serial number "${serial}" in CSV`,
                        severity: "error",
                    });
                    errorRowSet.add(rowNum);
                }
                seenSerials.add(serial);
            }
        }

        // Contract date range validation
        if (dataType === "contracts") {
            const startDate = (row["start_date"] ?? "").trim();
            const endDate = (row["end_date"] ?? "").trim();
            if (
                startDate &&
                endDate &&
                /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
                /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
                new Date(endDate) <= new Date(startDate)
            ) {
                errors.push({
                    row: rowNum,
                    column: "end_date",
                    value: endDate,
                    message: `End date must be after start date (${startDate})`,
                    severity: "error",
                });
                errorRowSet.add(rowNum);
            }
        }
    }

    return {
        totalRows: rows.length,
        validRows: rows.length - errorRowSet.size,
        errorRows: errorRowSet.size,
        warningRows: warningRowSet.size,
        errors,
        warnings,
    };
}
