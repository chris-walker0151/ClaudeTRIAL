"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowRight, Star, Trash2 } from "lucide-react";
import type { TravelRecommendationWithDetails, TravelRecommendationStatus } from "@/lib/travel/types";
import { TRAVEL_STATUS_CONFIG, TRAVEL_TYPE_CONFIG } from "@/lib/travel/constants";

interface RecommendationCardProps {
    recommendation: TravelRecommendationWithDetails;
    onStatusChange: (id: string, status: TravelRecommendationStatus) => void;
    onDelete: (id: string) => void;
}

export function RecommendationCard({ recommendation: rec, onStatusChange, onDelete }: RecommendationCardProps) {
    const typeConfig = rec.type ? TRAVEL_TYPE_CONFIG[rec.type] : null;
    const statusConfig = TRAVEL_STATUS_CONFIG[rec.status];

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                        {rec.provider_name ?? "Unknown Provider"}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                        {typeConfig && (
                            <Badge variant={typeConfig.variant} className={typeConfig.className}>
                                {typeConfig.label}
                            </Badge>
                        )}
                        <Badge variant={statusConfig.variant} className={statusConfig.className}>
                            {statusConfig.label}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                {rec.type === "hotel" && (
                    <>
                        {rec.rating != null && (
                            <div className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span>{rec.rating} / 5</span>
                            </div>
                        )}
                    </>
                )}
                {rec.type === "flight" && (<div className="flex items-center gap-2"><span>{rec.origin}</span><ArrowRight className="h-3.5 w-3.5" /><span>{rec.destination}</span></div>)}
                {rec.notes && (<p className="text-muted-foreground text-xs">{rec.notes}</p>)}
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    {rec.status === "suggested" && (<>
                        <Button size="xs" onClick={() => onStatusChange(rec.id, "booked")}>Book</Button>
                        <Button size="xs" variant="outline" onClick={() => onStatusChange(rec.id, "declined")}>Decline</Button>
                    </>)}
                    {rec.status === "booked" && (<Button size="xs" variant="outline" onClick={() => onStatusChange(rec.id, "suggested")}>Revert</Button>)}
                    {rec.status === "declined" && (<Button size="xs" variant="outline" onClick={() => onStatusChange(rec.id, "suggested")}>Reconsider</Button>)}
                </div>
                <div className="flex items-center gap-1.5">
                    {rec.booking_url && (<a href={rec.booking_url} target="_blank" rel="noopener noreferrer"><Button size="xs" variant="link"><ExternalLink className="h-3 w-3" />View</Button></a>)}
                    <Button size="icon-xs" variant="ghost" className="text-destructive" onClick={() => onDelete(rec.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
            </CardFooter>
        </Card>
    );
}
