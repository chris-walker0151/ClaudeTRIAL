"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hotel, Plane, Plus } from "lucide-react";
import type {
    TravelPageData,
    TravelTab,
    TravelStatusFilter,
    TravelRecommendationStatus,
} from "@/lib/travel/types";
import { ALL_TRAVEL_STATUSES, TRAVEL_STATUS_CONFIG } from "@/lib/travel/constants";
import { WeekSelector } from "./week-selector";
import { HotelsTab } from "./hotels-tab";
import { FlightsTab } from "./flights-tab";
import { AddRecommendationSheet } from "./add-recommendation-sheet";
import { updateRecommendationStatus, deleteTravelRecommendation } from "./actions";
import { toast } from "sonner";

interface TravelShellProps {
    data: TravelPageData;
}

export function TravelShell({ data }: TravelShellProps) {
    const [activeTab, setActiveTab] = useState<TravelTab>("hotels");
    const [statusFilter, setStatusFilter] = useState<TravelStatusFilter>("all");
    const [addSheetOpen, setAddSheetOpen] = useState(false);

    const filteredRecommendations = useMemo(() => {
        let recs = data.recommendations;
        recs = recs.filter((r) =>
            activeTab === "hotels" ? r.type === "hotel" : r.type === "flight",
        );
        if (statusFilter !== "all") {
            recs = recs.filter((r) => r.status === statusFilter);
        }
        return recs;
    }, [data.recommendations, activeTab, statusFilter]);

    const statusCounts = useMemo(() => {
        const typeRecs = data.recommendations.filter((r) =>
            activeTab === "hotels" ? r.type === "hotel" : r.type === "flight",
        );
        const counts: Record<string, number> = { all: typeRecs.length };
        for (const status of ALL_TRAVEL_STATUSES) {
            counts[status] = typeRecs.filter((r) => r.status === status).length;
        }
        return counts;
    }, [data.recommendations, activeTab]);

    const handleStatusChange = async (
        id: string,
        status: TravelRecommendationStatus,
    ) => {
        const result = await updateRecommendationStatus(id, status);
        if (result.success) {
            toast.success(
                "Status updated to " + TRAVEL_STATUS_CONFIG[status].label,
            );
        } else {
            toast.error(result.error ?? "Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        const result = await deleteTravelRecommendation(id);
        if (result.success) {
            toast.success("Recommendation deleted");
        } else {
            toast.error(result.error ?? "Failed to delete recommendation");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <WeekSelector weekNumber={data.weekNumber} />
                <Button size="sm" onClick={() => setAddSheetOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Recommendation
                </Button>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(v) => {
                    setActiveTab(v as TravelTab);
                    setStatusFilter("all");
                }}
            >
                <TabsList>
                    <TabsTrigger value="hotels">
                        <Hotel className="h-4 w-4" />
                        Hotels
                    </TabsTrigger>
                    <TabsTrigger value="flights">
                        <Plane className="h-4 w-4" />
                        Flights
                    </TabsTrigger>
                </TabsList>

                {/* Status filter pills */}
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setStatusFilter("all")}
                        className="inline-flex items-center"
                    >
                        <Badge
                            variant={statusFilter === "all" ? "default" : "outline"}
                            className="cursor-pointer"
                        >
                            All ({statusCounts.all})
                        </Badge>
                    </button>
                    {ALL_TRAVEL_STATUSES.map((status) => {
                        const config = TRAVEL_STATUS_CONFIG[status];
                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setStatusFilter(status)}
                            >
                                <Badge
                                    variant={
                                        statusFilter === status
                                            ? config.variant
                                            : "outline"
                                    }
                                    className={
                                        statusFilter === status
                                            ? config.className
                                            : "cursor-pointer"
                                    }
                                >
                                    {config.label} ({statusCounts[status]})
                                </Badge>
                            </button>
                        );
                    })}
                </div>

                <TabsContent value="hotels">
                    <HotelsTab
                        recommendations={filteredRecommendations}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                    />
                </TabsContent>

                <TabsContent value="flights">
                    <FlightsTab
                        recommendations={filteredRecommendations}
                        preferredRoutes={data.preferredRoutes}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                    />
                </TabsContent>
            </Tabs>

            <AddRecommendationSheet
                open={addSheetOpen}
                onOpenChange={setAddSheetOpen}
                recommendations={data.recommendations}
                weekNumber={data.weekNumber}
            />
        </div>
    );
}
