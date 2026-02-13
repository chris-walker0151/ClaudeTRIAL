"use client";

import { useTransition } from "react";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { WEEKS_IN_SEASON, SEASON_YEAR } from "@/lib/constants";
import type { VehicleAvailabilityRow, WeekStatus } from "@/lib/fleet/types";
import { WEEK_STATUS_COLORS, WEEK_STATUS_LABELS } from "@/lib/fleet/constants";
import { toggleVehicleAvailability } from "./actions";

interface FleetAvailabilityGridProps {
    rows: VehicleAvailabilityRow[];
}

export function FleetAvailabilityGrid({ rows }: FleetAvailabilityGridProps) {
    const [isPending, startTransition] = useTransition();

    const handleCellClick = (
        vehicleId: string,
        weekNumber: number,
        currentStatus: WeekStatus,
    ) => {
        if (currentStatus === "on_trip") return;
        const newAvailable = currentStatus === "unavailable";
        startTransition(async () => {
            await toggleVehicleAvailability(vehicleId, weekNumber, SEASON_YEAR, newAvailable);
        });
    };

    const weeks = Array.from({ length: WEEKS_IN_SEASON }, (_, i) => i + 1);

    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">No vehicles to display</p>
        );
    }

    return (
        <TooltipProvider delayDuration={0}>
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-medium">
                                Vehicle
                            </th>
                            {weeks.map((w) => (
                                <th key={w} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                                    Wk {w}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.vehicle.id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium whitespace-nowrap">
                                    {row.vehicle.name}
                                </td>
                                {row.weeks.map((week) => (
                                    <Tooltip key={week.week_number}>
                                        <TooltipTrigger asChild>
                                            <td
                                                className="px-2 py-2 text-center"
                                                onClick={() =>
                                                    handleCellClick(
                                                        row.vehicle.id,
                                                        week.week_number,
                                                        week.status,
                                                    )
                                                }
                                            >
                                                <div
                                                    className={`mx-auto h-4 w-8 rounded ${WEEK_STATUS_COLORS[week.status]} ${week.status !== "on_trip" ? "cursor-pointer hover:opacity-80" : ""} ${isPending ? "opacity-50" : ""}`}
                                                />
                                            </td>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{row.vehicle.name} - Wk {week.week_number}</p>
                                            <p className="text-muted-foreground">
                                                {WEEK_STATUS_LABELS[week.status]}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </TooltipProvider>
    );
}
