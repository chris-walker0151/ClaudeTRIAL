"use client";

import { Hotel } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
    TravelRecommendationWithDetails,
    TravelRecommendationStatus,
} from "@/lib/travel/types";
import { RecommendationCard } from "./recommendation-card";

interface HotelsTabProps {
    recommendations: TravelRecommendationWithDetails[];
    onStatusChange: (id: string, status: TravelRecommendationStatus) => void;
    onDelete: (id: string) => void;
}

export function HotelsTab({ recommendations, onStatusChange, onDelete }: HotelsTabProps) {
    const grouped = recommendations.reduce(
        (acc, rec) => { if (!acc[rec.trip_id]) acc[rec.trip_id] = []; acc[rec.trip_id].push(rec); return acc; }, {} as Record<string, TravelRecommendationWithDetails[]>,
    );

    if (recommendations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Hotel className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No hotel recommendations</p>
                <p className="text-sm">Add a hotel recommendation to get started.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([tripId, recs]) => {
                const first = recs[0];
                return (
                    <div key={tripId} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">
                                {first.trip_vehicle_name ?? "Unknown Vehicle"}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                                {first.trip_status}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {recs.map((rec) => (
                                <RecommendationCard
                                    key={rec.id}
                                    recommendation={rec}
                                    onStatusChange={onStatusChange}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
