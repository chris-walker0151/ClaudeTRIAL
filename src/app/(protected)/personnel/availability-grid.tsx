"use client";

import { Badge } from "@/components/ui/badge";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { WEEKS_IN_SEASON } from "@/lib/constants";
import { PERSONNEL_ROLE_LABELS } from "@/lib/weekly-planner/constants";
import { ROLE_COLORS, WEEK_STATUS_COLORS, WEEK_STATUS_LABELS } from "@/lib/personnel/constants";
import type { PersonnelAvailabilityRow } from "@/lib/personnel/types";

interface AvailabilityGridProps {
    rows: PersonnelAvailabilityRow[];
    onToggle: (personId: string, weekNumber: number) => void;
}

export function AvailabilityGrid({ rows, onToggle }: AvailabilityGridProps) {
    const weeks = Array.from({ length: WEEKS_IN_SEASON }, (_, i) => i + 1);

    return (
        <TooltipProvider>
            <div className="space-y-3">
                {/* Legend */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-green-500" />
                        <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-blue-500" />
                        <span>On Trip (locked)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-red-500" />
                        <span>Unavailable</span>
                    </div>
                </div>

                {/* Grid */}
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium min-w-[180px] border-r">
                                    Person
                                </th>
                                {weeks.map((w) => (
                                    <th key={w} className="px-1 py-2 text-center font-medium min-w-[36px]">
                                        W{w}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={WEEKS_IN_SEASON + 1}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        No personnel found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr key={row.person.id} className="border-b">
                                        <td className="sticky left-0 z-10 bg-background px-3 py-2 border-r">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{row.person.name}</span>
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-xs ${ROLE_COLORS[row.person.role]}`}
                                                >
                                                    {PERSONNEL_ROLE_LABELS[row.person.role] ?? row.person.role}
                                                </Badge>
                                            </div>
                                        </td>
                                        {row.weeks.map((week) => (
                                            <td
                                                key={week.week_number}
                                                className="px-1 py-2 text-center"
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className={`h-5 w-5 rounded-sm ${WEEK_STATUS_COLORS[week.status]} ${
                                                                week.status === "on_trip"
                                                                    ? "cursor-not-allowed opacity-70"
                                                                    : "cursor-pointer hover:opacity-80 transition-opacity"
                                                            } mx-auto`}
                                                            onClick={() => onToggle(row.person.id, week.week_number)}
                                                            disabled={week.status === "on_trip"}
                                                            aria-label={`Week ${week.week_number}: ${WEEK_STATUS_LABELS[week.status]}`}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>W{week.week_number}: {WEEK_STATUS_LABELS[week.status]}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </TooltipProvider>
    );
}
