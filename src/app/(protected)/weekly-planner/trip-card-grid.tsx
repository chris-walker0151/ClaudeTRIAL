"use client";

import { CalendarDays } from "lucide-react";
import { TripCard } from "./trip-card";
import type {
    StatusFilter,
    TripWithDetails,
} from "@/lib/weekly-planner/types";

interface TripCardGridProps {
    trips: TripWithDetails[];
    statusFilter: StatusFilter;
    onSelectTrip: (tripId: string) => void;
}

export function TripCardGrid({
    trips,
    statusFilter,
    onSelectTrip,
}: TripCardGridProps) {
    const filtered =
        statusFilter === "all"
            ? trips
            : trips.filter((t) => t.status === statusFilter);

    if (filtered.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-12 text-center">
                <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h2 className="mt-4 text-lg font-semibold">No trips found</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    {statusFilter === "all"
                        ? "Run the optimizer to generate trip recommendations, or create a manual trip."
                        : `No trips with status "${statusFilter}". Try a different filter.`}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((trip) => (
                <TripCard
                    key={trip.id}
                    trip={trip}
                    onSelect={onSelectTrip}
                />
            ))}
        </div>
    );
}
