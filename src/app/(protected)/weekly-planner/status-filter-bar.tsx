"use client";

import { Badge } from "@/components/ui/badge";
import {
    ALL_TRIP_STATUSES,
    TRIP_STATUS_CONFIG,
} from "@/lib/weekly-planner/constants";
import type {
    StatusFilter,
    TripStatus,
    TripWithDetails,
} from "@/lib/weekly-planner/types";

interface StatusFilterBarProps {
    activeFilter: StatusFilter;
    onFilterChange: (filter: StatusFilter) => void;
    trips: TripWithDetails[];
}

export function StatusFilterBar({
    activeFilter,
    onFilterChange,
    trips,
}: StatusFilterBarProps) {
    const countByStatus = (status: TripStatus) =>
        trips.filter((t) => t.status === status).length;

    return (
        <div className="flex flex-wrap gap-2">
            {/* "All" filter */}
            <button onClick={() => onFilterChange("all")}>
                <Badge
                    variant={activeFilter === "all" ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1 text-xs"
                >
                    All ({trips.length})
                </Badge>
            </button>

            {/* Status filters */}
            {ALL_TRIP_STATUSES.map((status) => {
                const count = countByStatus(status);
                const config = TRIP_STATUS_CONFIG[status];
                const isActive = activeFilter === status;

                return (
                    <button key={status} onClick={() => onFilterChange(status)}>
                        <Badge
                            variant={isActive ? config.variant : "outline"}
                            className={`cursor-pointer px-3 py-1 text-xs ${
                                isActive ? (config.className ?? "") : ""
                            } ${count === 0 ? "opacity-50" : ""}`}
                        >
                            {config.label} ({count})
                        </Badge>
                    </button>
                );
            })}
        </div>
    );
}
