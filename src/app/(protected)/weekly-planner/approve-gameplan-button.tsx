"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { TripWithDetails } from "@/lib/weekly-planner/types";

interface ApproveGameplanButtonProps {
    weekNumber: number;
    seasonYear: number;
    trips: TripWithDetails[];
}

export function ApproveGameplanButton({
    weekNumber,
    seasonYear,
    trips,
}: ApproveGameplanButtonProps) {
    const router = useRouter();
    const [isApproving, setIsApproving] = useState(false);

    // Compute readiness from the trips prop
    const readiness = useMemo(() => {
        const activeTrips = trips.filter((t) => t.status !== "cancelled");
        const unconfirmed = activeTrips.filter(
            (t) => t.status === "draft" || t.status === "recommended",
        );
        const noPersonnel = activeTrips.filter(
            (t) => t.personnel.length === 0,
        );
        const noVehicle = activeTrips.filter((t) => !t.vehicle);

        const reasons: string[] = [];
        if (unconfirmed.length > 0) {
            reasons.push(unconfirmed.length + " trip(s) not yet confirmed");
        }
        if (noPersonnel.length > 0) {
            reasons.push(
                noPersonnel.length + " trip(s) without personnel",
            );
        }
        if (noVehicle.length > 0) {
            reasons.push(
                noVehicle.length + " trip(s) without a vehicle",
            );
        }
        if (activeTrips.length === 0) {
            reasons.push("No trips for this week");
        }

        return {
            isReady:
                activeTrips.length > 0 && unconfirmed.length === 0,
            reasons,
            totalTrips: activeTrips.length,
        };
    }, [trips]);

    const handleApprove = useCallback(async () => {
        setIsApproving(true);
        try {
            const response = await fetch("/api/gameplan/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    week_number: weekNumber,
                    season_year: seasonYear,
                }),
                signal: AbortSignal.timeout(60000),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error ?? "Approval failed");
            }

            toast.success(
                "Gameplan approved! " + result.emailsSent + " assignment email(s) sent.",
            );
            router.refresh();
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Approval failed";
            toast.error(message);
        } finally {
            setIsApproving(false);
        }
    }, [weekNumber, seasonYear, router]);

    // Don't render if no trips at all
    if (trips.length === 0) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div>
                        <Button
                            onClick={handleApprove}
                            disabled={!readiness.isReady || isApproving}
                            variant={
                                readiness.isReady ? "default" : "outline"
                            }
                            className={
                                readiness.isReady
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : ""
                            }
                        >
                            {isApproving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ShieldCheck className="mr-2 h-4 w-4" />
                            )}
                            {isApproving
                                ? "Approving..."
                                : "Approve Gameplan"}
                        </Button>
                    </div>
                </TooltipTrigger>
                {!readiness.isReady && readiness.reasons.length > 0 && (
                    <TooltipContent
                        side="bottom"
                        className="max-w-xs"
                    >
                        <p className="font-medium mb-1">
                            Cannot approve yet:
                        </p>
                        <ul className="text-sm space-y-0.5">
                            {readiness.reasons.map((reason, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-1"
                                >
                                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                    {reason}
                                </li>
                            ))}
                        </ul>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}
