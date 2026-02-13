"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Trash2, Plus, Route } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { PreferredRouteRow } from "@/lib/settings/types";
import { deletePreferredRoute } from "./actions";

interface RoutesTabProps {
    routes: PreferredRouteRow[];
    onEdit: (route: PreferredRouteRow) => void;
    onAdd: () => void;
}

function formatDuration(minutes: number | null): string {
    if (minutes === null || minutes === undefined) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return m + "m";
    if (m === 0) return h + "h";
    return h + "h " + m + "m";
}

function formatPrice(price: number | null): string {
    if (price === null || price === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
    }).format(price);
}

export function RoutesTab({ routes, onEdit, onAdd }: RoutesTabProps) {
    const router = useRouter();

    const handleDelete = async (id: string) => {
        const result = await deletePreferredRoute(id);
        if (result.success) {
            toast.success("Route deleted");
            router.refresh();
        } else {
            toast.error(result.error ?? "Failed to delete route");
        }
    };

    if (routes.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <Button onClick={onAdd} size="sm">
                        <Plus className="h-4 w-4" />
                        Add Route
                    </Button>
                </div>
                <div className="rounded-lg border border-dashed p-12 text-center">
                    <Route className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No preferred routes</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Add preferred flight routes to optimize travel planning.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={onAdd} size="sm">
                    <Plus className="h-4 w-4" />
                    Add Route
                </Button>
            </div>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Origin</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Airline</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Flights</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {routes.map((route) => (
                            <TableRow key={route.id}>
                                <TableCell className="font-medium">
                                    {route.origin_airport ?? "—"}
                                </TableCell>
                                <TableCell>
                                    {route.destination_airport ?? "—"}
                                </TableCell>
                                <TableCell>
                                    {route.preferred_airline ?? "—"}
                                </TableCell>
                                <TableCell>
                                    {formatPrice(route.typical_price)}
                                </TableCell>
                                <TableCell>
                                    {formatDuration(route.typical_duration_min)}
                                </TableCell>
                                <TableCell>
                                    {route.google_flights_url ? (
                                        <a
                                            href={route.google_flights_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    ) : (
                                        "—"
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => onEdit(route)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => handleDelete(route.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
