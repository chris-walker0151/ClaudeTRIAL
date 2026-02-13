"use client";

import {
    Users,
    MapPin,
    FileText,
    Package,
    UserCog,
    Truck,
    CalendarDays,
    Link,
    Download,
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DATA_TYPES } from "@/lib/import/constants";
import type { DataTypeKey, DataTypeConfig } from "@/lib/import/types";

const ICON_MAP: Record<string, React.ElementType> = {
    Users,
    MapPin,
    FileText,
    Package,
    UserCog,
    Truck,
    CalendarDays,
    Link,
};

function downloadTemplate(config: DataTypeConfig) {
    const headers = config.columns.map((c) => c.csvHeader).join(",");
    const blob = new Blob([headers + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = config.csvFilename;
    a.click();
    URL.revokeObjectURL(url);
}

interface StepSelectTypeProps {
    onSelect: (dataType: DataTypeKey) => void;
}

export function StepSelectType({ onSelect }: StepSelectTypeProps) {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">
                    Select Data Type
                </h2>
                <p className="text-sm text-muted-foreground">
                    Choose the type of data you want to import. Import in order
                    if you have dependencies between data types.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {DATA_TYPES.map((dt) => {
                    const Icon = ICON_MAP[dt.icon] || Package;
                    return (
                        <Card
                            key={dt.key}
                            className="cursor-pointer transition-colors hover:border-primary"
                            onClick={() => onSelect(dt.key)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-sm">
                                        {dt.label}
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    {dt.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {dt.fkDependencies.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        <span className="text-xs text-muted-foreground">
                                            Requires:
                                        </span>
                                        {dt.fkDependencies.map((dep) => (
                                            <Badge
                                                key={dep}
                                                variant="outline"
                                                className="text-xs px-1.5 py-0"
                                            >
                                                {
                                                    DATA_TYPES.find(
                                                        (d) => d.key === dep
                                                    )?.label
                                                }
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-full text-xs"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        downloadTemplate(dt);
                                    }}
                                >
                                    <Download className="mr-1 h-3 w-3" />
                                    Download Template
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
