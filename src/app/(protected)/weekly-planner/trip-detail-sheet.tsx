"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    MapPin,
    Route,
    Clock,
    Users,
    ArrowDown,
    CornerDownRight,
    Home,
    Package,
    Save,
    CheckCircle,
    XCircle,
    Trash2,
    Truck,
    MapPinCheck,
    CornerDownLeft,
    CheckCircle2,
    Loader2 as TransitionLoader,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateTripStatus, updateTripNotes, deleteTrip, transitionTripStatus } from "./actions";
import { getNextTripTransitions } from "@/lib/weekly-planner/trip-state-machine";
import {
    TRIP_STATUS_CONFIG,
    ASSET_TYPE_LABELS,
    PERSONNEL_ROLE_LABELS,
    getScoreColor,
    getScoreLabel,
} from "@/lib/weekly-planner/constants";
import type { AssetType, TripStatus, TripWithDetails } from "@/lib/weekly-planner/types";

interface TripDetailSheetProps {
    trip: TripWithDetails | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TripDetailSheet({
    trip,
    open,
    onOpenChange,
}: TripDetailSheetProps) {
    const router = useRouter();
    const [notes, setNotes] = useState(trip?.notes ?? "");
    const [isSaving, setIsSaving] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Sync notes when trip changes
    if (trip && notes !== (trip.notes ?? "") && !isSaving) {
        setNotes(trip.notes ?? "");
    }

    const handleStatusChange = useCallback(
        async (newStatus: "confirmed" | "cancelled") => {
            if (!trip) return;
            const result = await updateTripStatus(trip.id, newStatus);
            if (result.success) {
                toast.success(
                    `Trip ${newStatus === "confirmed" ? "confirmed" : "cancelled"}`,
                );
                router.refresh();
            } else {
                toast.error(result.error ?? "Failed to update status");
            }
        },
        [trip, router],
    );

    const handleSaveNotes = useCallback(async () => {
        if (!trip) return;
        setIsSaving(true);
        const result = await updateTripNotes(trip.id, notes);
        setIsSaving(false);
        if (result.success) {
            toast.success("Notes saved");
            router.refresh();
        } else {
            toast.error(result.error ?? "Failed to save notes");
        }
    }, [trip, notes, router]);

    const handleOperationalTransition = useCallback(
        async (newStatus: TripStatus) => {
            if (!trip) return;
            setIsTransitioning(true);
            const result = await transitionTripStatus(trip.id, newStatus);
            setIsTransitioning(false);
            if (result.success) {
                toast.success(
                    `Trip updated to ${newStatus.replace("_", " ")}${
                        result.assetsUpdated
                            ? ` (${result.assetsUpdated} assets updated)`
                            : ""
                    }`,
                );
                router.refresh();
            } else {
                toast.error(result.error ?? "Failed to update trip status");
            }
        },
        [trip, router],
    );

    const handleDelete = useCallback(async () => {
        if (!trip) return;
        const result = await deleteTrip(trip.id);
        if (result.success) {
            toast.success("Trip deleted");
            onOpenChange(false);
            router.refresh();
        } else {
            toast.error(result.error ?? "Failed to delete trip");
        }
    }, [trip, onOpenChange, router]);

    if (!trip) return null;

    const statusConfig = TRIP_STATUS_CONFIG[trip.status];
    const canConfirm =
        trip.status === "draft" || trip.status === "recommended";
    const canCancel =
        trip.status === "draft" ||
        trip.status === "recommended" ||
        trip.status === "confirmed";
    const canDelete = trip.status === "draft" || trip.is_manual;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <div className="flex items-center gap-2">
                        <SheetTitle className="text-lg">
                            {trip.vehicle?.name ?? "Unassigned Vehicle"}
                        </SheetTitle>
                        <Badge
                            variant={statusConfig.variant}
                            className={statusConfig.className ?? ""}
                        >
                            {statusConfig.label}
                        </Badge>
                    </div>
                    <SheetDescription className="flex items-center gap-3">
                        <span>
                            {trip.origin_hub?.name ?? "Unknown hub"} ·{" "}
                            {trip.stops.length}{" "}
                            {trip.stops.length === 1 ? "stop" : "stops"}
                        </span>
                        <Badge
                            variant="secondary"
                            className={`font-mono text-xs ${getScoreColor(trip.optimizer_score)}`}
                        >
                            Score: {getScoreLabel(trip.optimizer_score)}
                        </Badge>
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Stats Row */}
                    <div className="flex gap-6 text-sm">
                        <div className="flex items-center gap-1.5">
                            <Route className="h-4 w-4 text-muted-foreground" />
                            <span>
                                {trip.total_miles != null
                                    ? `${Math.round(trip.total_miles)} miles`
                                    : "—"}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                                {trip.total_drive_hrs != null
                                    ? `${trip.total_drive_hrs.toFixed(1)} hours`
                                    : "—"}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>
                                {trip.asset_summary.total} assets
                            </span>
                        </div>
                    </div>

                    <Separator />

                    {/* Route Timeline */}
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold">Route</h3>
                        <div className="space-y-0">
                            {/* Origin Hub */}
                            <div className="flex items-center gap-2 py-2">
                                <Home className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">
                                    {trip.origin_hub?.name ?? "Hub"} (
                                    {trip.origin_hub?.code ?? "?"})
                                </span>
                                {trip.depart_time && (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        Depart:{" "}
                                        {new Date(
                                            trip.depart_time,
                                        ).toLocaleString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                )}
                            </div>

                            {/* Stops */}
                            {trip.stops.map((stop, idx) => (
                                <div key={stop.id} className="border-l-2 border-muted ml-2 pl-4 py-2">
                                    <div className="flex items-start gap-2">
                                        <ArrowDown className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm font-medium">
                                                    Stop {idx + 1}:{" "}
                                                    {stop.venue?.name ??
                                                        "Unknown"}
                                                </span>
                                                {stop.action && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        {stop.action}
                                                    </Badge>
                                                )}
                                            </div>
                                            {stop.venue?.city && (
                                                <p className="text-xs text-muted-foreground">
                                                    {stop.venue.city}
                                                    {stop.venue.state
                                                        ? `, ${stop.venue.state}`
                                                        : ""}
                                                </p>
                                            )}

                                            {/* Times */}
                                            {(stop.arrival_time ||
                                                stop.depart_time) && (
                                                <div className="flex gap-3 text-xs text-muted-foreground">
                                                    {stop.arrival_time && (
                                                        <span>
                                                            Arrive:{" "}
                                                            {new Date(
                                                                stop.arrival_time,
                                                            ).toLocaleTimeString(
                                                                undefined,
                                                                {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                },
                                                            )}
                                                        </span>
                                                    )}
                                                    {stop.depart_time && (
                                                        <span>
                                                            Depart:{" "}
                                                            {new Date(
                                                                stop.depart_time,
                                                            ).toLocaleTimeString(
                                                                undefined,
                                                                {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                },
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Assets at this stop */}
                                            {stop.assets.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    {stop.assets.map((a) => (
                                                        <Badge
                                                            key={a.id}
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            {ASSET_TYPE_LABELS[
                                                                a.asset_type as AssetType
                                                            ] ??
                                                                a.asset_type}{" "}
                                                            ({a.serial_number})
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Hub return indicator */}
                                            {stop.requires_hub_return && (
                                                <div className="flex items-center gap-1 pt-1 text-xs text-amber-600">
                                                    <CornerDownRight className="h-3 w-3" />
                                                    Return to hub
                                                    {stop.hub_return_reason &&
                                                        `: ${stop.hub_return_reason}`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Return to hub */}
                            <div className="flex items-center gap-2 py-2">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Return to{" "}
                                    {trip.origin_hub?.name ?? "Hub"}
                                </span>
                                {trip.return_time && (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {new Date(
                                            trip.return_time,
                                        ).toLocaleString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Personnel */}
                    <div className="space-y-2">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                            <Users className="h-4 w-4" />
                            Personnel ({trip.personnel.length})
                        </h3>
                        {trip.personnel.length > 0 ? (
                            <div className="space-y-1">
                                {trip.personnel.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <span>{p.person.name}</span>
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            {PERSONNEL_ROLE_LABELS[
                                                p.role_on_trip ?? ""
                                            ] ??
                                                p.role_on_trip ??
                                                "Crew"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No personnel assigned
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Notes */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Notes</h3>
                        <textarea
                            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-20 resize-y"
                            placeholder="Add notes about this trip..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveNotes}
                            disabled={isSaving || notes === (trip.notes ?? "")}
                        >
                            <Save className="mr-2 h-3.5 w-3.5" />
                            {isSaving ? "Saving..." : "Save Notes"}
                        </Button>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pb-4">
                        {canConfirm && (
                            <Button
                                size="sm"
                                onClick={() => handleStatusChange("confirmed")}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Confirm Trip
                            </Button>
                        )}
                        {canCancel && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange("cancelled")}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Trip
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        )}
                        {/* Operational Transitions */}
                        {getNextTripTransitions(trip.status)
                            .filter(
                                (t) =>
                                    t.toStatus !== "confirmed" &&
                                    t.toStatus !== "cancelled",
                            )
                            .map((transition) => {
                                const IconComponent =
                                    transition.iconName === "Truck"
                                        ? Truck
                                        : transition.iconName === "MapPinCheck"
                                          ? MapPinCheck
                                          : transition.iconName === "CornerDownLeft"
                                            ? CornerDownLeft
                                            : CheckCircle2;
                                return (
                                    <Button
                                        key={transition.toStatus}
                                        size="sm"
                                        variant="secondary"
                                        disabled={isTransitioning}
                                        onClick={() =>
                                            handleOperationalTransition(
                                                transition.toStatus as TripStatus,
                                            )
                                        }
                                        title={transition.description}
                                    >
                                        {isTransitioning ? (
                                            <TransitionLoader className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <IconComponent className="mr-2 h-4 w-4" />
                                        )}
                                        {transition.label}
                                    </Button>
                                );
                            })}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
