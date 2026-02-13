"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { FleetPageData, VehicleListItem } from "@/lib/fleet/types";
import { FleetStatsCards } from "./fleet-stats";
import { VehicleFilters } from "./vehicle-filters";
import { VehicleCardGrid } from "./vehicle-card-grid";
import { FleetAvailabilityGrid } from "./fleet-availability-grid";
import { VehicleDetailSheet } from "./vehicle-detail-sheet";

interface FleetShellProps {
    data: FleetPageData;
}

export function FleetShell({ data }: FleetShellProps) {
    const [activeTab, setActiveTab] = useState("vehicles");
    const [hubFilter, setHubFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

    const filteredVehicles = useMemo(() => {
        let result: VehicleListItem[] = data.vehicles;
        if (hubFilter !== "all") {
            result = result.filter((v) => v.home_hub_id === hubFilter);
        }
        if (statusFilter !== "all") {
            result = result.filter((v) => v.status === statusFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (v) =>
                    v.name.toLowerCase().includes(q) ||
                    v.home_hub_name.toLowerCase().includes(q) ||
                    (v.type && v.type.toLowerCase().includes(q)),
            );
        }
        return result;
    }, [data.vehicles, hubFilter, statusFilter, searchQuery]);

    const filteredAvailability = useMemo(() => {
        const ids = new Set(filteredVehicles.map((v) => v.id));
        return data.availability.filter((row) => ids.has(row.vehicle.id));
    }, [data.availability, filteredVehicles]);

    return (
        <>
            <FleetStatsCards stats={data.stats} />
            <VehicleFilters
                hubs={data.hubs}
                hubFilter={hubFilter}
                onHubFilterChange={setHubFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                    <TabsTrigger value="availability">Availability</TabsTrigger>
                </TabsList>
                <TabsContent value="vehicles" className="mt-4">
                    <VehicleCardGrid
                        vehicles={filteredVehicles}
                        onSelect={setSelectedVehicleId}
                    />
                </TabsContent>
                <TabsContent value="availability" className="mt-4">
                    <FleetAvailabilityGrid rows={filteredAvailability} />
                </TabsContent>
            </Tabs>
            <VehicleDetailSheet
                vehicleId={selectedVehicleId}
                onClose={() => setSelectedVehicleId(null)}
            />
        </>
    );
}
