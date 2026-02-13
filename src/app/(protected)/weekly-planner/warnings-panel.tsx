"use client";

import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
    UnassignedDemand,
    ConstraintRelaxation,
} from "@/lib/weekly-planner/types";

interface WarningsPanelProps {
    unassignedDemands: UnassignedDemand[] | null;
    constraintRelaxations: ConstraintRelaxation[] | null;
    warnings: string[] | null;
}

export function WarningsPanel({
    unassignedDemands,
    constraintRelaxations,
    warnings,
}: WarningsPanelProps) {
    const demands = unassignedDemands ?? [];
    const relaxations = constraintRelaxations ?? [];
    const warningList = warnings ?? [];
    const totalIssues = demands.length + relaxations.length + warningList.length;

    if (totalIssues === 0) {
        return null;
    }

    const hasCritical = demands.length > 0;

    return (
        <Collapsible defaultOpen={hasCritical}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border p-3 text-sm font-medium hover:bg-muted/50">
                <AlertTriangle
                    className={`h-4 w-4 ${hasCritical ? "text-destructive" : "text-amber-500"}`}
                />
                <span>Warnings &amp; Issues</span>
                <Badge
                    variant={hasCritical ? "destructive" : "secondary"}
                    className="ml-1 text-xs"
                >
                    {totalIssues}
                </Badge>
                <ChevronDown className="ml-auto h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2 space-y-4 rounded-lg border p-4">
                {/* Unassigned Demands */}
                {demands.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Unassigned Demands ({demands.length})
                        </h4>
                        <div className="space-y-1">
                            {demands.map((d, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-2 rounded bg-destructive/5 px-3 py-2 text-sm"
                                >
                                    <div className="flex-1">
                                        <span className="font-medium">
                                            {d.customer_name}
                                        </span>{" "}
                                        — {d.venue_name}
                                        <div className="text-xs text-muted-foreground">
                                            {d.quantity}x {d.asset_type} ·{" "}
                                            {d.reason}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Constraint Relaxations */}
                {relaxations.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                            <Info className="h-3.5 w-3.5" />
                            Constraint Relaxations ({relaxations.length})
                        </h4>
                        <div className="space-y-1">
                            {relaxations.map((r, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-2 rounded bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/20"
                                >
                                    <div className="flex-1">
                                        <span className="font-medium">
                                            {r.constraint}
                                        </span>
                                        <div className="text-xs text-muted-foreground">
                                            {String(r.original_value)} →{" "}
                                            {String(r.relaxed_value)} ·{" "}
                                            {r.reason}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* General Warnings */}
                {warningList.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">
                            Warnings ({warningList.length})
                        </h4>
                        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                            {warningList.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}
