"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { importData } from "./actions";
import type { DataTypeKey, DataTypeConfig, ImportResult } from "@/lib/import/types";

interface StepImportProps {
    config: DataTypeConfig;
    dataType: DataTypeKey;
    rows: Record<string, string>[];
    onReset: () => void;
}

export function StepImport({
    config,
    dataType,
    rows,
    onReset,
}: StepImportProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handleImport = async () => {
        setIsImporting(true);
        setHasStarted(true);
        setProgress(10);

        try {
            // Simulate progress while the server action runs
            const progressInterval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 5, 90));
            }, 500);

            const importResult = await importData(dataType, rows);

            clearInterval(progressInterval);
            setProgress(100);
            setResult(importResult);
        } catch (error) {
            setResult({
                success: false,
                insertedCount: 0,
                failedCount: rows.length,
                errors: [
                    {
                        row: 0,
                        message:
                            error instanceof Error
                                ? error.message
                                : "An unexpected error occurred",
                    },
                ],
            });
            setProgress(100);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">Import Data</h2>
                <p className="text-sm text-muted-foreground">
                    Import {rows.length.toLocaleString()} {config.label.toLowerCase()}{" "}
                    records into the database.
                </p>
            </div>

            {/* Pre-import summary */}
            {!hasStarted && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Ready to Import
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-muted-foreground">
                                Data type:
                            </div>
                            <div className="font-medium">{config.label}</div>
                            <div className="text-muted-foreground">
                                Total rows:
                            </div>
                            <div className="font-medium">
                                {rows.length.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground">
                                Target table:
                            </div>
                            <div className="font-mono text-xs">
                                {config.tableName}
                            </div>
                            {dataType === "venues" && (
                                <>
                                    <div className="text-muted-foreground">
                                        Geocoding:
                                    </div>
                                    <div className="text-xs">
                                        Addresses will be auto-geocoded
                                    </div>
                                </>
                            )}
                            {dataType === "contracts" && (
                                <>
                                    <div className="text-muted-foreground">
                                        Grouping:
                                    </div>
                                    <div className="text-xs">
                                        Rows will be grouped into contracts +
                                        line items
                                    </div>
                                </>
                            )}
                        </div>
                        <Button
                            onClick={handleImport}
                            className="w-full"
                            size="lg"
                        >
                            Start Import
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Progress */}
            {hasStarted && !result && (
                <Card>
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm font-medium">
                                Importing {config.label.toLowerCase()}...
                            </span>
                        </div>
                        <Progress value={progress} />
                        <p className="text-xs text-muted-foreground">
                            {dataType === "venues"
                                ? "Geocoding addresses and inserting records..."
                                : dataType === "contracts"
                                  ? "Grouping contracts and creating line items..."
                                  : `Processing ${rows.length.toLocaleString()} rows in batches...`}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {result.success ? (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertTitle>Import Complete</AlertTitle>
                            <AlertDescription>
                                Successfully imported all records.
                            </AlertDescription>
                        </Alert>
                    ) : result.insertedCount > 0 ? (
                        <Alert>
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle>Partial Import</AlertTitle>
                            <AlertDescription>
                                Some records failed to import. See details below.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Import Failed</AlertTitle>
                            <AlertDescription>
                                No records were imported. See errors below.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {result.insertedCount.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Inserted
                                    </div>
                                </div>
                                {result.failedCount > 0 && (
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-red-600">
                                            {result.failedCount.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Failed
                                        </div>
                                    </div>
                                )}
                                {result.geocodedCount !== undefined && (
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {result.geocodedCount.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Geocoded
                                        </div>
                                    </div>
                                )}
                                {result.contractsCreated !== undefined && (
                                    <>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {result.contractsCreated.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Contracts
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {(result.contractItemsCreated || 0).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Line Items
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Error details */}
                    {result.errors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>
                                Errors ({result.errors.length})
                            </AlertTitle>
                            <AlertDescription>
                                <div className="mt-1 max-h-40 overflow-y-auto text-xs">
                                    {result.errors.map((err, i) => (
                                        <p key={i}>
                                            {err.row > 0
                                                ? `Batch starting at row ${err.row}: `
                                                : ""}
                                            {err.message}
                                        </p>
                                    ))}
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button
                        variant="outline"
                        onClick={onReset}
                        className="w-full"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Import Another File
                    </Button>
                </div>
            )}
        </div>
    );
}
