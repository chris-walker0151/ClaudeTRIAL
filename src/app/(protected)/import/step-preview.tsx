"use client";

import { useEffect, useState } from "react";
import {
    CheckCircle2,
    AlertCircle,
    TriangleAlert,
    Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { validateRows } from "@/lib/import/schemas";
import { validateForeignKeys } from "./actions";
import type {
    DataTypeConfig,
    DataTypeKey,
    ValidationResult,
    FkValidationResult,
} from "@/lib/import/types";

interface StepPreviewProps {
    config: DataTypeConfig;
    dataType: DataTypeKey;
    rows: Record<string, string>[];
    onValidationComplete: (
        validation: ValidationResult,
        fkValidation: FkValidationResult | null
    ) => void;
}

export function StepPreview({
    config,
    dataType,
    rows,
    onValidationComplete,
}: StepPreviewProps) {
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [fkValidation, setFkValidation] =
        useState<FkValidationResult | null>(null);
    const [fkLoading, setFkLoading] = useState(false);

    // Run client-side validation on mount
    useEffect(() => {
        const result = validateRows(dataType, rows, config);
        setValidation(result);

        // If there are FK dependencies, run server-side FK validation
        if (config.fkDependencies.length > 0) {
            setFkLoading(true);
            validateForeignKeys(dataType, rows)
                .then((fkResult) => {
                    setFkValidation(fkResult);
                    onValidationComplete(result, fkResult);
                })
                .catch(() => {
                    const fallback: FkValidationResult = {
                        valid: true,
                        missingReferences: [],
                        resolvedCount: 0,
                    };
                    setFkValidation(fallback);
                    onValidationComplete(result, fallback);
                })
                .finally(() => setFkLoading(false));
        } else {
            onValidationComplete(result, null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const errorRowSet = new Set(
        validation?.errors.map((e) => e.row) || []
    );
    const headers = config.columns.map((c) => c.csvHeader);
    const previewRows = rows.slice(0, 100);

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">
                    Preview & Validate
                </h2>
                <p className="text-sm text-muted-foreground">
                    Review your data before importing. Error rows are highlighted
                    in red.
                </p>
            </div>

            {/* Summary bar */}
            {validation && (
                <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                        {validation.totalRows.toLocaleString()} rows
                    </Badge>
                    <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 text-green-700 text-sm"
                    >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {validation.validRows.toLocaleString()} valid
                    </Badge>
                    {validation.errorRows > 0 && (
                        <Badge
                            variant="destructive"
                            className="text-sm"
                        >
                            <AlertCircle className="mr-1 h-3 w-3" />
                            {validation.errorRows} errors
                        </Badge>
                    )}
                    {validation.warningRows > 0 && (
                        <Badge
                            variant="outline"
                            className="border-yellow-200 bg-yellow-50 text-yellow-700 text-sm"
                        >
                            <TriangleAlert className="mr-1 h-3 w-3" />
                            {validation.warningRows} warnings
                        </Badge>
                    )}
                </div>
            )}

            {/* FK validation status */}
            {config.fkDependencies.length > 0 && (
                <div>
                    {fkLoading ? (
                        <Alert>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <AlertTitle>
                                Checking references...
                            </AlertTitle>
                            <AlertDescription>
                                Verifying that referenced records exist in the
                                database.
                            </AlertDescription>
                        </Alert>
                    ) : fkValidation?.valid ? (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertTitle>
                                References validated
                            </AlertTitle>
                            <AlertDescription>
                                All {fkValidation.resolvedCount} foreign key
                                references found in the database.
                            </AlertDescription>
                        </Alert>
                    ) : fkValidation ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>
                                Missing references (
                                {fkValidation.missingReferences.length})
                            </AlertTitle>
                            <AlertDescription>
                                <div className="mt-1 max-h-32 overflow-y-auto text-xs">
                                    {fkValidation.missingReferences
                                        .slice(0, 10)
                                        .map((ref, i) => (
                                            <p key={i}>
                                                Row {ref.row}:{" "}
                                                {ref.message}
                                            </p>
                                        ))}
                                    {fkValidation.missingReferences.length >
                                        10 && (
                                        <p className="mt-1 font-medium">
                                            ...and{" "}
                                            {fkValidation.missingReferences
                                                .length - 10}{" "}
                                            more
                                        </p>
                                    )}
                                </div>
                            </AlertDescription>
                        </Alert>
                    ) : null}
                </div>
            )}

            {/* Validation errors detail */}
            {validation && validation.errors.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                        Validation Errors ({validation.errors.length})
                    </AlertTitle>
                    <AlertDescription>
                        <div className="mt-1 max-h-40 overflow-y-auto text-xs">
                            {validation.errors.slice(0, 20).map((err, i) => (
                                <p key={i}>
                                    Row {err.row}, {err.column}:{" "}
                                    {err.message}
                                </p>
                            ))}
                            {validation.errors.length > 20 && (
                                <p className="mt-1 font-medium">
                                    ...and {validation.errors.length - 20} more
                                </p>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Warnings */}
            {validation && validation.warnings.length > 0 && (
                <Alert>
                    <TriangleAlert className="h-4 w-4 text-yellow-600" />
                    <AlertTitle>
                        Warnings ({validation.warnings.length})
                    </AlertTitle>
                    <AlertDescription>
                        <div className="mt-1 max-h-32 overflow-y-auto text-xs">
                            {validation.warnings.slice(0, 10).map((w, i) => (
                                <p key={i}>
                                    Row {w.row}, {w.column}: {w.message}
                                </p>
                            ))}
                            {validation.warnings.length > 10 && (
                                <p className="mt-1 font-medium">
                                    ...and {validation.warnings.length - 10}{" "}
                                    more
                                </p>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Data preview table */}
            <div className="rounded-md border">
                <div className="max-h-[400px] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                {headers.map((h) => (
                                    <TableHead key={h}>{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewRows.map((row, i) => (
                                <TableRow
                                    key={i}
                                    className={
                                        errorRowSet.has(i + 1)
                                            ? "bg-destructive/10"
                                            : ""
                                    }
                                >
                                    <TableCell className="text-muted-foreground text-xs">
                                        {i + 1}
                                    </TableCell>
                                    {headers.map((h) => (
                                        <TableCell
                                            key={h}
                                            className="max-w-[200px] truncate text-xs"
                                        >
                                            {row[h] || ""}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {rows.length > 100 && (
                    <div className="border-t p-2 text-center text-xs text-muted-foreground">
                        Showing first 100 of {rows.length.toLocaleString()} rows
                    </div>
                )}
            </div>
        </div>
    );
}
