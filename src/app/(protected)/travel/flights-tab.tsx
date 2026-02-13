"use client";

import { Plane, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
    TravelRecommendationWithDetails,
    TravelRecommendationStatus,
    PreferredRouteInfo,
} from "@/lib/travel/types";
import { RecommendationCard } from "./recommendation-card";

interface FlightsTabProps {
    recommendations: TravelRecommendationWithDetails[];
    preferredRoutes: PreferredRouteInfo[];
    onStatusChange: (id: string, status: TravelRecommendationStatus) => void;
    onDelete: (id: string) => void;
}

export function FlightsTab({ recommendations, preferredRoutes, onStatusChange, onDelete }: FlightsTabProps) {
    const grouped = recommendations.reduce(
        (acc, rec) => {
            const key = rec.person_id ?? "unassigned";
            if (!acc[key]) acc[key] = [];
            acc[key].push(rec);
            return acc;
        }, {} as Record<string, TravelRecommendationWithDetails[]>,
    );

    const findRoute = (origin: string | null, dest: string | null): PreferredRouteInfo | undefined => {
        if (!origin || !dest) return undefined;
        return preferredRoutes.find(
            (r) => r.origin_airport === origin && r.destination_airport === dest,
        );
    };

    if (recommendations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Plane className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No flight recommendations</p>
                <p className="text-sm">Add a flight recommendation to get started.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([personId, recs]) => {
                const first = recs[0];
                return (
                    <div key={personId} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">
                                {first.person_name ?? "Unassigned"}
                            </h3>
                            {first.person_role && (
                                <Badge variant="outline" className="text-xs">
                                    {first.person_role}
                                </Badge>
                            )}
                        </div>
                        {recs.map((rec) => {
                            const route = findRoute(rec.origin, rec.destination);
                            return (
                                <div key={rec.id} className="space-y-2">
                                    {route && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md bg-muted p-2">
                                            <span>Preferred: {route.preferred_airline ?? "Any"}</span>
                                            {route.google_flights_url && (<a href={route.google_flights_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Flights</a>)}
                                        </div>
                                    )}
                                    <RecommendationCard
                                        recommendation={rec}
                                        onStatusChange={onStatusChange}
                                        onDelete={onDelete}
                                    />
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
