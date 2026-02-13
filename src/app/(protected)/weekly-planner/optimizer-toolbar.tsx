"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Play,
    Loader2,
    CheckCheck,
    Plus,
    Clock,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { acceptAllRecommendations } from "./actions";
import type {
    OptimizerRunRow,
    OptimizeApiResponse,
} from "@/lib/weekly-planner/types";

interface OptimizerToolbarProps {
    currentRun: OptimizerRunRow | null;
    allRuns: OptimizerRunRow[];
    weekNumber: number;
    seasonYear: number;
    tripCount: number;
    recommendedCount: number;
    onRunComplete: () => void;
    onRunSelected: (runId: string | null) => void;
    onCreateManualTrip: () => void;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function OptimizerToolbar({
    currentRun,
    allRuns,
    weekNumber,
    seasonYear,
    tripCount,
    recommendedCount,
    onRunComplete,
    onRunSelected,
    onCreateManualTrip,
}: OptimizerToolbarProps) {
    const router = useRouter();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizeError, setOptimizeError] = useState<string | null>(null);

    // Note: Real-time subscription in PlannerShell handles
    // optimizer completion detection for multi-user scenarios.
    const handleRunOptimizer = useCallback(async () => {
        setIsOptimizing(true);
        setOptimizeError(null);

        try {
            const response = await fetch("/api/optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    season_year: seasonYear,
                    week_number: weekNumber,
                }),
                // No timeout — optimizer can take 5+ minutes for complex weeks
            });

            const result: OptimizeApiResponse = await response.json();

            if (!response.ok) {
                throw new Error(
                    (result as unknown as { error: string }).error ??
                        "Optimization failed",
                );
            }

            toast.success(
                `Optimization complete: ${result.trips_generated} trips generated (score: ${Math.round(result.score)})`,
            );
            onRunComplete();
            router.refresh();
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Optimization failed";
            setOptimizeError(message);
            toast.error(message);
        } finally {
            setIsOptimizing(false);
        }
    }, [seasonYear, weekNumber, onRunComplete, router]);

    const handleAcceptAll = useCallback(async () => {
        const result = await acceptAllRecommendations(weekNumber, seasonYear);
        if (result.success) {
            toast.success(`${result.count} trips confirmed`);
            router.refresh();
        } else {
            toast.error(result.error ?? "Failed to accept recommendations");
        }
    }, [weekNumber, seasonYear, router]);

    const isRunPending =
        currentRun?.status === "pending" || currentRun?.status === "running";

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Run Optimizer */}
            <Button
                onClick={handleRunOptimizer}
                disabled={isOptimizing || isRunPending}
            >
                {isOptimizing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Play className="mr-2 h-4 w-4" />
                )}
                {isOptimizing ? "Optimizing..." : "Run Optimizer"}
            </Button>

            {/* Accept All Recommendations */}
            <Button
                variant="outline"
                onClick={handleAcceptAll}
                disabled={recommendedCount === 0}
            >
                <CheckCheck className="mr-2 h-4 w-4" />
                Accept All ({recommendedCount})
            </Button>

            {/* Last run info */}
            {currentRun && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                        {currentRun.completed_at
                            ? timeAgo(currentRun.completed_at)
                            : currentRun.status}
                    </span>
                    {currentRun.duration_ms && (
                        <span className="text-xs">
                            ({(currentRun.duration_ms / 1000).toFixed(1)}s)
                        </span>
                    )}
                    <Badge variant="outline" className="text-xs">
                        {tripCount} trips
                    </Badge>
                </div>
            )}

            {/* Error indicator */}
            {optimizeError && (
                <div className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="max-w-48 truncate">{optimizeError}</span>
                </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Run History */}
            {allRuns.length > 1 && (
                <Select
                    value={currentRun?.id ?? ""}
                    onValueChange={(v) =>
                        onRunSelected(v === "" ? null : v)
                    }
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Run history" />
                    </SelectTrigger>
                    <SelectContent>
                        {allRuns.map((run) => (
                            <SelectItem key={run.id} value={run.id}>
                                {run.completed_at
                                    ? new Date(
                                          run.completed_at,
                                      ).toLocaleString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : run.status}{" "}
                                ({run.trips_generated ?? 0} trips)
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* New Trip button */}
            <Button variant="outline" onClick={onCreateManualTrip}>
                <Plus className="mr-2 h-4 w-4" />
                New Trip
            </Button>
        </div>
    );
}
