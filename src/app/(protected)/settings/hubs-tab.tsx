"use client";

import { MapPin, Warehouse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HubDetail } from "@/lib/settings/types";

interface HubsTabProps {
    hubs: HubDetail[];
}

export function HubsTab({ hubs }: HubsTabProps) {
    if (hubs.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-12 text-center">
                <Warehouse className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No hubs configured</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Hub configuration is managed via the database.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {hubs.map((hub) => (
                <Card key={hub.id}>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Warehouse className="h-4 w-4 text-primary" />
                            {hub.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div>
                                <p>{hub.city}, {hub.state}</p>
                                <p className="text-muted-foreground">{hub.address}</p>
                            </div>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                            {hub.lat.toFixed(4)}, {hub.lng.toFixed(4)}
                        </p>
                        {hub.capacity_notes && (
                            <p className="text-xs text-muted-foreground italic">
                                {hub.capacity_notes}
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

