"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WeekSelector } from "./week-selector";
import { OptimizerToolbar } from "./optimizer-toolbar";
import { StatusFilterBar } from "./status-filter-bar";
import { TripCardGrid } from "./trip-card-grid";
import { TripDetailSheet } from "./trip-detail-sheet";
import { WarningsPanel } from "./warnings-panel";
import { ManualTripSheet } from "./manual-trip-sheet";
import { ApproveGameplanButton } from "./approve-gameplan-button";
import type {
    StatusFilter,
    WeeklyPlannerData,
    FormData,
} from "@/lib/weekly-planner/types";
import { useRealtimeTrips } from "@/hooks/use-realtime-trips";
import { useRealtimeOptimizer } from "@/hooks/use-realtime-optimizer";

interface PlannerShellProps {
    data: WeeklyPlannerData;
    formData: FormData;
}

export function PlannerShell({ data, formData }: PlannerShellProps) {
    const router = useRouter();

    // Real-time subscription for trips
    useRealtimeTrips(data.weekNumber, data.seasonYear);

    // State
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [manualTripOpen, setManualTripOpen] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(
        data.currentRun?.id ?? null,
    );

    // Filter trips by selected optimizer run (if run history is used)
    const visibleTrips = useMemo(() => {
        if (!selectedRunId) return data.trips;
        return data.trips.filter(
            (t) =>
                t.optimizer_run_id === selectedRunId ||
                t.is_manual,
        );
    }, [data.trips, selectedRunId]);

    // Count of recommended trips
    const recommendedCount = useMemo(
        () => visibleTrips.filter((t) => t.status === "recommended").length,
        [visibleTrips],
    );

    // Selected trip for detail sheet
    const selectedTrip = useMemo(
        () => visibleTrips.find((t) => t.id === selectedTripId) ?? null,
        [visibleTrips, selectedTripId],
    );

    // Handlers
    const handleSelectTrip = useCallback((tripId: string) => {
        setSelectedTripId(tripId);
    }, []);

    const handleRunComplete = useCallback(() => {
        setSelectedRunId(null);
        router.refresh();
    }, [router]);

    // Real-time subscription for optimizer runs
    useRealtimeOptimizer(data.weekNumber, data.seasonYear, handleRunComplete);

    const handleRunSelected = useCallback((runId: string | null) => {
        setSelectedRunId(runId);
    }, []);

    return (
        <div className="space-y-4">
            {/* Week navigation */}
            <WeekSelector
                weekNumber={data.weekNumber}
                gameCount={data.games.length}
            />

            {/* Week 0 info banner */}
            {data.weekNumber === 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        Pre-Season Deployment (Week 0)
                    </h3>
                    <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                        Deploy equipment from hubs to Week 1 game venues.
                        Vehicles can make multiple round trips — there is no
                        weekly time crunch.
                    </p>
                </div>
            )}

            {/* Optimizer toolbar */}
            <OptimizerToolbar
                currentRun={data.currentRun}
                allRuns={data.allRuns}
                weekNumber={data.weekNumber}
                seasonYear={data.seasonYear}
                tripCount={visibleTrips.length}
                recommendedCount={recommendedCount}
                onRunComplete={handleRunComplete}
                onRunSelected={handleRunSelected}
                onCreateManualTrip={() => setManualTripOpen(true)}
            />

            {/* Approve Gameplan */}
            <ApproveGameplanButton
                weekNumber={data.weekNumber}
                seasonYear={data.seasonYear}
                trips={visibleTrips}
            />

            {/* Warnings panel */}
            <WarningsPanel
                unassignedDemands={data.currentRun?.unassigned_demands ?? null}
                constraintRelaxations={
                    data.currentRun?.constraint_relaxations ?? null
                }
                warnings={data.currentRun?.warnings ?? null}
            />

            {/* Status filter */}
            <StatusFilterBar
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
                trips={visibleTrips}
            />

            {/* Trip cards grid */}
            <TripCardGrid
                trips={visibleTrips}
                statusFilter={statusFilter}
                onSelectTrip={handleSelectTrip}
            />

            {/* Trip detail slide-over */}
            <TripDetailSheet
                trip={selectedTrip}
                open={selectedTripId !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedTripId(null);
                }}
            />

            {/* Manual trip creation */}
            <ManualTripSheet
                open={manualTripOpen}
                onOpenChange={setManualTripOpen}
                weekNumber={data.weekNumber}
                seasonYear={data.seasonYear}
                formData={formData}
            />
        </div>
    );
}
