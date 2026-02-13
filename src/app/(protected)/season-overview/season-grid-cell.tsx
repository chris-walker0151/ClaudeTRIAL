"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GameCellData } from "@/lib/season-overview/types";
import { CELL_STATUS_COLORS, CELL_STATUS_LABELS } from "@/lib/season-overview/constants";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SeasonGridCellProps {
    data: GameCellData;
    weekNumber: number;
}

export function SeasonGridCell({ data, weekNumber }: SeasonGridCellProps) {
    const router = useRouter();

    const handleClick = useCallback(() => {
        if (data.has_game) {
            router.push(`/weekly-planner?week=${weekNumber}`);
        }
    }, [data.has_game, router, weekNumber]);

    const colorClass = CELL_STATUS_COLORS[data.trip_status];
    const statusLabel = CELL_STATUS_LABELS[data.trip_status];

    // No game: empty gray cell
    if (!data.has_game) {
        return (
            <div className="flex items-center justify-center px-1 py-1.5">
                <div className={`h-7 w-full rounded-sm ${colorClass} opacity-30`} />
            </div>
        );
    }

    // Game exists: colored cell with opponent abbreviation
    const opponentAbbr = data.opponent
        ? data.opponent.slice(0, 3).toUpperCase()
        : "--";

    return (
        <div className="flex items-center justify-center px-1 py-1.5">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={handleClick}
                            className={`flex h-7 w-full items-center justify-center rounded-sm text-[10px] font-mono font-bold text-white transition-opacity hover:opacity-80 ${colorClass}`}
                        >
                            {opponentAbbr}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <div className="space-y-1 text-xs">
                            <div className="font-semibold">
                                Week {weekNumber}
                            </div>
                            <div>
                                {data.is_home_game ? "Home" : "Away"} vs{" "}
                                {data.opponent ?? "TBD"}
                            </div>
                            <div>
                                Status: <span className="font-medium">{statusLabel}</span>
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
