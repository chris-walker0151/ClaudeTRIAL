"use client";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { SPORT_TYPE_LABELS, ALL_SPORT_TYPES } from "@/lib/customers/constants";
import type { SportFilter } from "@/lib/customers/types";

interface CustomerFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    sportFilter: SportFilter;
    onSportFilterChange: (value: SportFilter) => void;
}

export function CustomerFilters({
    searchQuery,
    onSearchChange,
    sportFilter,
    onSportFilterChange,
}: CustomerFiltersProps) {
    return (
        <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-8"
                />
            </div>
            <Select
                value={sportFilter}
                onValueChange={(v) => onSportFilterChange(v as SportFilter)}
            >
                <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Sports" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    {ALL_SPORT_TYPES.map((st) => (
                        <SelectItem key={st} value={st}>
                            {SPORT_TYPE_LABELS[st]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
