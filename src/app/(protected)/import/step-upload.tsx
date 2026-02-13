"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseCsvFile, validateHeaders } from "@/lib/import/csv-parser";
import type { DataTypeConfig } from "@/lib/import/types";

interface StepUploadProps {
    config: DataTypeConfig;
    onParsed: (data: Record<string, string>[], headers: string[]) => void;
}

export function StepUpload({ config, onParsed }: StepUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [fileInfo, setFileInfo] = useState<{
        name: string;
        size: string;
        rows: number;
    } | null>(null);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [headerIssues, setHeaderIssues] = useState<{
        missing: string[];
        extra: string[];
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const expectedHeaders = config.columns.map((c) => c.csvHeader);

    const processFile = useCallback(
        async (file: File) => {
            setParseErrors([]);
            setHeaderIssues(null);

            if (!file.name.toLowerCase().endsWith(".csv")) {
                setParseErrors(["Please upload a CSV file (.csv)"]);
                return;
            }

            const result = await parseCsvFile(file);

            if (result.errors.length > 0) {
                setParseErrors(result.errors);
            }

            // Validate headers
            const headerCheck = validateHeaders(
                result.headers,
                expectedHeaders
            );
            if (!headerCheck.valid) {
                setHeaderIssues({
                    missing: headerCheck.missing,
                    extra: headerCheck.extra,
                });
                return;
            }

            const sizeStr =
                file.size < 1024
                    ? `${file.size} B`
                    : file.size < 1024 * 1024
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

            setFileInfo({
                name: file.name,
                size: sizeStr,
                rows: result.data.length,
            });

            if (headerCheck.extra.length > 0) {
                setHeaderIssues({
                    missing: [],
                    extra: headerCheck.extra,
                });
            }

            onParsed(result.data, result.headers);
        },
        [expectedHeaders, onParsed]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(true);
        },
        []
    );

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">
                    Upload {config.label} CSV
                </h2>
                <p className="text-sm text-muted-foreground">
                    Expected columns:{" "}
                    <span className="font-mono text-xs">
                        {expectedHeaders.join(", ")}
                    </span>
                </p>
            </div>

            {/* Drop zone */}
            <div
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                    isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload
                    className={`h-10 w-10 ${
                        isDragging
                            ? "text-primary"
                            : "text-muted-foreground/50"
                    }`}
                />
                <p className="mt-3 text-sm font-medium">
                    {isDragging
                        ? "Drop your CSV file here"
                        : "Drag and drop a CSV file, or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Only .csv files are accepted
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Parse Error</AlertTitle>
                    <AlertDescription>
                        {parseErrors.map((err, i) => (
                            <p key={i}>{err}</p>
                        ))}
                    </AlertDescription>
                </Alert>
            )}

            {/* Missing headers */}
            {headerIssues?.missing && headerIssues.missing.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Missing Required Columns</AlertTitle>
                    <AlertDescription>
                        <p>
                            The following columns are required but missing from
                            your CSV:
                        </p>
                        <p className="mt-1 font-mono text-xs">
                            {headerIssues.missing.join(", ")}
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            {/* File info (successful parse) */}
            {fileInfo && (
                <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle>File Loaded</AlertTitle>
                    <AlertDescription>
                        <div className="flex gap-4 text-xs">
                            <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {fileInfo.name}
                            </span>
                            <span>{fileInfo.size}</span>
                            <span className="font-medium">
                                {fileInfo.rows.toLocaleString()} rows
                            </span>
                        </div>
                        {headerIssues?.extra &&
                            headerIssues.extra.length > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Extra columns (will be ignored):{" "}
                                    <span className="font-mono">
                                        {headerIssues.extra.join(", ")}
                                    </span>
                                </p>
                            )}
                    </AlertDescription>
                </Alert>
            )}

            {!fileInfo && (
                <div className="text-center">
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Choose File
                    </Button>
                </div>
            )}
        </div>
    );
}
