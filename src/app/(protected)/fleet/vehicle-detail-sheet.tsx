"use client";

import { useEffect, useState, useTransition } from "react";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VehicleDetail } from "@/lib/fleet/types";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS } from "@/lib/fleet/constants";
import { fetchVehicleDetailAction, updateVehicleNotes } from "./actions";

interface VehicleDetailSheetProps {
    vehicleId: string | null;
    onClose: () => void;
}

export function VehicleDetailSheet({ vehicleId, onClose }: VehicleDetailSheetProps) {
    const [detail, setDetail] = useState<VehicleDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!vehicleId) {
            setDetail(null);
            return;
        }
        setLoading(true);
        fetchVehicleDetailAction(vehicleId).then((d) => {
            setDetail(d);
            setNotes(d?.notes ?? "");
            setLoading(false);
        });
    }, [vehicleId]);

    const handleSaveNotes = () => {
        if (!vehicleId) return;
        startTransition(async () => {
            await updateVehicleNotes(vehicleId, notes);
        });
    };

    return (
        <Sheet open={!!vehicleId} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{loading ? "Loading..." : detail?.name ?? "Vehicle"}</SheetTitle>
                    <SheetDescription>
                        {loading ? "Fetching details..." : detail?.type ?? "Vehicle details"}
                    </SheetDescription>
                </SheetHeader>
                {loading && (
                    <div className="space-y-4 pt-4">
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                )}
                {!loading && detail && (
                    <div className="space-y-6 pt-4">
                        {/* Status & Hub */}
                        <div className="flex items-center gap-2">
                            <Badge className={VEHICLE_STATUS_COLORS[detail.status] ?? ""}>
                                {VEHICLE_STATUS_LABELS[detail.status] ?? detail.status}
                            </Badge>
                            <Badge variant="outline">{detail.home_hub_name}</Badge>
                        </div>

                        {/* Capacity */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Weight Capacity</p>
                                <p className="font-medium">
                                    {detail.capacity_lbs != null
                                        ? detail.capacity_lbs.toLocaleString() + " lbs"
                                        : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Volume Capacity</p>
                                <p className="font-medium">
                                    {detail.capacity_cuft != null
                                        ? detail.capacity_cuft + " cu ft"
                                        : "—"}
                                </p>
                            </div>
                        </div>

                        {/* Trips Table */}
                        <div>
                            <h3 className="font-semibold mb-2">Upcoming Trips</h3>
                            {detail.upcoming_trips.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No upcoming trips</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-2 pr-2">Week</th>
                                            <th className="pb-2 pr-2">Status</th>
                                            <th className="pb-2 pr-2">Stops</th>
                                            <th className="pb-2">Miles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detail.upcoming_trips.map((trip) => (
                                            <tr key={trip.id} className="border-b last:border-0">
                                                <td className="py-2 pr-2">Wk {trip.week_number}</td>
                                                <td className="py-2 pr-2">
                                                    <Badge variant="outline">{trip.status}</Badge>
                                                </td>
                                                <td className="py-2 pr-2">{trip.stop_count}</td>
                                                <td className="py-2">
                                                    {trip.total_miles != null ? trip.total_miles.toLocaleString() : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <h3 className="font-semibold mb-2">Notes</h3>
                            <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                rows={4}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes about this vehicle..."
                            />
                            <button
                                className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                disabled={isPending}
                                onClick={handleSaveNotes}
                            >
                                {isPending ? "Saving..." : "Save Notes"}
                            </button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
