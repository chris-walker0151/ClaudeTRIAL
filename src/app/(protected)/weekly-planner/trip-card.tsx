"use client";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Route, Clock, Truck } from "lucide-react";
import {
    TRIP_STATUS_CONFIG,
    ASSET_TYPE_LABELS,
    getScoreColor,
    getScoreLabel,
} from "@/lib/weekly-planner/constants";
import type { AssetType, TripStatus, TripWithDetails } from "@/lib/weekly-planner/types";

const OPERATIONAL_STATUSES: TripStatus[] = [
    "confirmed",
    "in_transit",
    "on_site",
    "returning",
    "completed",
];

function TripStatusProgress({ status }: { status: TripStatus }) {
    const statusIndex = OPERATIONAL_STATUSES.indexOf(status);
    if (statusIndex === -1) return null; // Don't show for draft/recommended/cancelled

    return (
        <div className="flex items-center gap-0.5">
            {OPERATIONAL_STATUSES.map((s, i) => (
                <div
                    key={s}
                    className={`h-1.5 w-1.5 rounded-full ${
                        i <= statusIndex
                            ? "bg-primary"
                            : "bg-muted-foreground/25"
                    }`}
                    title={TRIP_STATUS_CONFIG[s].label}
                />
            ))}
        </div>
    );
}

interface TripCardProps {
    trip: TripWithDetails;
    onSelect: (tripId: string) => void;
}

export function TripCard({ trip, onSelect }: TripCardProps) {
    const statusConfig = TRIP_STATUS_CONFIG[trip.status];
    const scoreColor = getScoreColor(trip.optimizer_score);
    const scoreLabel = getScoreLabel(trip.optimizer_score);

    // Build venue names display
    const venueNames = trip.stops.map(
        (s) => s.venue?.name ?? "Unknown",
    );
    const displayVenues =
        venueNames.length <= 2
            ? venueNames.join(", ")
            : `${venueNames.slice(0, 2).join(", ")} +${venueNames.length - 2} more`;

    // Build asset summary text
    const assetParts: string[] = [];
    for (const [type, count] of Object.entries(trip.asset_summary.by_type)) {
        if (count && count > 0) {
            const label = ASSET_TYPE_LABELS[type as AssetType] ?? type;
            assetParts.push(`${count} ${label}`);
        }
    }
    const assetText =
        assetParts.length > 0
            ? assetParts.join(", ")
            : "No assets assigned";

    // Hub code
    const hubCode = trip.origin_hub?.code ?? "???";
    const vehicleName = trip.vehicle?.name ?? "No vehicle";

    return (
        <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => onSelect(trip.id)}
        >
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{vehicleName}</span>
                        <Badge variant="outline" className="text-xs font-normal">
                            {hubCode}
                        </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                            variant={statusConfig.variant}
                            className={`text-xs ${statusConfig.className ?? ""}`}
                        >
                            {statusConfig.label}
                        </Badge>
                        <TripStatusProgress status={trip.status} />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-2 pt-0">
                {/* Stops */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                        {trip.stops.length} {trip.stops.length === 1 ? "stop" : "stops"}
                        {venueNames.length > 0 && ` — ${displayVenues}`}
                    </span>
                </div>

                {/* Distance + Time */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Route className="h-3.5 w-3.5" />
                        <span>
                            {trip.total_miles != null
                                ? `${Math.round(trip.total_miles)} mi`
                                : "—"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                            {trip.total_drive_hrs != null
                                ? `${trip.total_drive_hrs.toFixed(1)} hrs`
                                : "—"}
                        </span>
                    </div>
                </div>

                {/* Assets + Score */}
                <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                        {assetText}
                    </span>
                    <Badge
                        variant="secondary"
                        className={`shrink-0 text-xs font-mono ${scoreColor}`}
                    >
                        {scoreLabel}
                    </Badge>
                </div>

                {/* Manual indicator */}
                {trip.is_manual && (
                    <Badge variant="outline" className="text-xs">
                        Manual
                    </Badge>
                )}
            </CardContent>
        </Card>
    );
}
