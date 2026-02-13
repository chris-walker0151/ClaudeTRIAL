"use client";

import type { SportFilter } from "@/lib/season-overview/types";
import { SPORT_TYPE_LABELS, ALL_SPORT_TYPES } from "@/lib/season-overview/constants";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SeasonFiltersProps {
    sportFilter: SportFilter;
    onSportFilterChange: (value: SportFilter) => void;
}

export function SeasonFilters({
    sportFilter,
    onSportFilterChange,
}: SeasonFiltersProps) {
    return (
        <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">
                Sport:
            </label>
            <Select
                value={sportFilter}
                onValueChange={(val: string) =>
                    onSportFilterChange(val as SportFilter)
                }
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Sports" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    {ALL_SPORT_TYPES.map((sport) => (
                        <SelectItem key={sport} value={sport}>
                            {SPORT_TYPE_LABELS[sport]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
