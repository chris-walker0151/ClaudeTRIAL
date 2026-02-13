"use client";

import { Truck, CheckCircle, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FleetStats } from "@/lib/fleet/types";

interface FleetStatsCardsProps { stats: FleetStats; }

export function FleetStatsCards({ stats }: FleetStatsCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Vehicles</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        <span className="text-2xl font-bold">{stats.total}</span>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-2xl font-bold">{stats.active}</span>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">In Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-amber-600" />
                        <span className="text-2xl font-bold">{stats.maintenance}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
