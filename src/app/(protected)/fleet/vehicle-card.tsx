"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VehicleListItem } from "@/lib/fleet/types";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS } from "@/lib/fleet/constants";

interface VehicleCardProps {
    vehicle: VehicleListItem;
    onSelect: (id: string) => void;
}

export function VehicleCard({ vehicle, onSelect }: VehicleCardProps) {
    return (
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onSelect(vehicle.id)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{vehicle.name}</CardTitle>
                    <Badge className={VEHICLE_STATUS_COLORS[vehicle.status] ?? ""}>
                        {VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {vehicle.type && <p className="text-sm text-muted-foreground">{vehicle.type}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{vehicle.home_hub_name}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                    {vehicle.capacity_lbs != null && <span>{vehicle.capacity_lbs.toLocaleString()} lbs</span>}
                    {vehicle.capacity_cuft != null && <span>{vehicle.capacity_cuft} cu ft</span>}
                </div>
            </CardContent>
        </Card>
    );
}
