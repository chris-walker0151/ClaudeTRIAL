"use client";

import { Truck } from "lucide-react";
import type { VehicleListItem } from "@/lib/fleet/types";
import { VehicleCard } from "./vehicle-card";

interface VehicleCardGridProps {
    vehicles: VehicleListItem[];
    onSelect: (id: string) => void;
}

export function VehicleCardGrid({ vehicles, onSelect }: VehicleCardGridProps) {
    if (vehicles.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-12 text-center">
                <Truck className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No vehicles found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting your filters
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} onSelect={onSelect} />
            ))}
        </div>
    );
}
