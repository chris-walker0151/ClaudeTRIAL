"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { WEEKS_IN_SEASON } from "@/lib/constants";

interface WeekSelectorProps {
    weekNumber: number;
    gameCount: number;
}

export function WeekSelector({ weekNumber, gameCount }: WeekSelectorProps) {
    const router = useRouter();

    const navigateToWeek = useCallback(
        (week: number) => {
            router.push(`/weekly-planner?week=${week}`);
        },
        [router],
    );

    const canGoPrev = weekNumber > 0;
    const canGoNext = weekNumber < WEEKS_IN_SEASON;

    return (
        <div className="flex items-center gap-2">
            {/* Desktop: horizontal week strip */}
            <div className="hidden items-center gap-1 md:flex">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!canGoPrev}
                    onClick={() => navigateToWeek(weekNumber - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {Array.from(
                    { length: WEEKS_IN_SEASON + 1 },
                    (_, i) => i,
                ).map((week) => (
                    <Button
                        key={week}
                        variant={week === weekNumber ? "default" : "ghost"}
                        size="sm"
                        className="h-8 w-10 text-xs"
                        onClick={() => navigateToWeek(week)}
                    >
                        {week === 0 ? "Pre" : week}
                    </Button>
                ))}

                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!canGoNext}
                    onClick={() => navigateToWeek(weekNumber + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Mobile: dropdown */}
            <div className="flex items-center gap-2 md:hidden">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    disabled={!canGoPrev}
                    onClick={() => navigateToWeek(weekNumber - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select
                    value={weekNumber.toString()}
                    onValueChange={(v) => navigateToWeek(parseInt(v, 10))}
                >
                    <SelectTrigger className="w-28">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from(
                            { length: WEEKS_IN_SEASON + 1 },
                            (_, i) => i,
                        ).map((week) => (
                            <SelectItem key={week} value={week.toString()}>
                                {week === 0 ? "Pre-Season" : `Week ${week}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    disabled={!canGoNext}
                    onClick={() => navigateToWeek(weekNumber + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Game count badge */}
            <Badge variant="secondary" className="ml-1">
                {gameCount} {gameCount === 1 ? "game" : "games"}
            </Badge>
        </div>
    );
}
