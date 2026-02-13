"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import type { PreferredRouteRow } from "@/lib/settings/types";
import { createPreferredRoute, updatePreferredRoute } from "./actions";

interface RouteFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    route: PreferredRouteRow | null;
}

export function RouteFormSheet({ open, onOpenChange, route }: RouteFormSheetProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [originAirport, setOriginAirport] = useState("");
    const [destinationAirport, setDestinationAirport] = useState("");
    const [preferredAirline, setPreferredAirline] = useState("");
    const [typicalPrice, setTypicalPrice] = useState("");
    const [typicalDurationMin, setTypicalDurationMin] = useState("");
    const [googleFlightsUrl, setGoogleFlightsUrl] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (route) {
            setOriginAirport(route.origin_airport ?? "");
            setDestinationAirport(route.destination_airport ?? "");
            setPreferredAirline(route.preferred_airline ?? "");
            setTypicalPrice(route.typical_price?.toString() ?? "");
            setTypicalDurationMin(route.typical_duration_min?.toString() ?? "");
            setGoogleFlightsUrl(route.google_flights_url ?? "");
            setNotes(route.notes ?? "");
        } else {
            setOriginAirport("");
            setDestinationAirport("");
            setPreferredAirline("");
            setTypicalPrice("");
            setTypicalDurationMin("");
            setGoogleFlightsUrl("");
            setNotes("");
        }
    }, [route, open]);

    const handleSubmit = async () => {
        if (!originAirport.trim() || !destinationAirport.trim()) {
            toast.error("Origin and destination airports are required");
            return;
        }

        setSaving(true);
        try {
            const formData = {
                origin_airport: originAirport.trim().toUpperCase(),
                destination_airport: destinationAirport.trim().toUpperCase(),
                preferred_airline: preferredAirline.trim() || undefined,
                typical_price: typicalPrice ? Number(typicalPrice) : undefined,
                typical_duration_min: typicalDurationMin
                    ? Number(typicalDurationMin)
                    : undefined,
                google_flights_url: googleFlightsUrl.trim() || undefined,
                notes: notes.trim() || undefined,
            };

            const result = route
                ? await updatePreferredRoute(route.id, formData)
                : await createPreferredRoute(formData);

            if (result.success) {
                toast.success(route ? "Route updated" : "Route created");
                onOpenChange(false);
                router.refresh();
            } else {
                toast.error(result.error ?? "Failed to save route");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>
                        {route ? "Edit Route" : "Add Route"}
                    </SheetTitle>
                    <SheetDescription>
                        {route
                            ? "Update preferred flight route details."
                            : "Add a new preferred flight route."}
                    </SheetDescription>
                </SheetHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="origin">Origin Airport</Label>
                            <Input
                                id="origin"
                                placeholder="e.g. ORD"
                                value={originAirport}
                                onChange={(e) => setOriginAirport(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="destination">Destination Airport</Label>
                            <Input
                                id="destination"
                                placeholder="e.g. LAX"
                                value={destinationAirport}
                                onChange={(e) => setDestinationAirport(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="airline">Preferred Airline</Label>
                        <Input
                            id="airline"
                            placeholder="e.g. United Airlines"
                            value={preferredAirline}
                            onChange={(e) => setPreferredAirline(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Typical Price ($)</Label>
                            <Input
                                id="price"
                                type="number"
                                placeholder="e.g. 350"
                                value={typicalPrice}
                                onChange={(e) => setTypicalPrice(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration (min)</Label>
                            <Input
                                id="duration"
                                type="number"
                                placeholder="e.g. 240"
                                value={typicalDurationMin}
                                onChange={(e) => setTypicalDurationMin(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="flights-url">Google Flights URL</Label>
                        <Input
                            id="flights-url"
                            type="url"
                            placeholder="https://www.google.com/travel/flights/..."
                            value={googleFlightsUrl}
                            onChange={(e) => setGoogleFlightsUrl(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <textarea
                            id="notes"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Any additional notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <SheetFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? "Saving..." : route ? "Update Route" : "Add Route"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

