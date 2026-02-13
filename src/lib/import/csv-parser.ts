/**
 * PapaParse wrapper for browser-side CSV parsing.
 */

import Papa from "papaparse";

export interface ParsedCsvResult {
    data: Record<string, string>[];
    headers: string[];
    errors: string[];
}

export function parseCsvFile(file: File): Promise<ParsedCsvResult> {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => header.trim(),
            transform: (value: string) => value.trim(),
            complete: (results) => {
                resolve({
                    data: results.data as Record<string, string>[],
                    headers: results.meta.fields || [],
                    errors: results.errors.map(
                        (e) => `Row ${e.row}: ${e.message}`
                    ),
                });
            },
            error: (error: Error) => {
                resolve({ data: [], headers: [], errors: [error.message] });
            },
        });
    });
}

export function validateHeaders(
    actual: string[],
    expected: string[]
): { valid: boolean; missing: string[]; extra: string[] } {
    const missing = expected.filter((h) => !actual.includes(h));
    const extra = actual.filter((h) => !expected.includes(h));
    return { valid: missing.length === 0, missing, extra };
}
