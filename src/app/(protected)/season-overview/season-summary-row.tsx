"use client";

import type { WeekSummary } from "@/lib/season-overview/types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SeasonSummaryRowProps {
    summaries: WeekSummary[];
}

export function SeasonSummaryRow({ summaries }: SeasonSummaryRowProps) {
    return (
        <div className="grid grid-cols-[200px_repeat(18,minmax(48px,1fr))] border-t bg-muted/30">
            <div className="sticky left-0 z-10 bg-muted/30 flex items-center px-4 py-2">
                <span className="text-sm font-bold">Summary</span>
            </div>
            {summaries.map((summary) => (
                <div
                key={summary.week_number}
                    className="flex items-center justify-center px-1 py-2"
                >
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-xs font-mono cursor-default">
                                    {summary.total_games}/{summary.confirmed}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <div className="space-y-1 text-xs">
                                    <div className="font-semibold">
                                        Week {summary.week_number} Summary
                                    </div>
                                    <div>Games: {summary.total_games}</div>
                                    <div>Trips: {summary.total_trips}</div>
                                    <div>Confirmed: {summary.confirmed}</div>
                                    <div>Unassigned: {summary.unassigned}</div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ))}
        </div>
    );
}
