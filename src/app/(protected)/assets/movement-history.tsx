"use client";

import { Warehouse, MapPin, ArrowRight } from "lucide-react";
import type { AssetMovementInfo } from "@/lib/assets/types";

interface MovementHistoryProps { movements: AssetMovementInfo[]; }

function LocationIcon({ type }: { type: string | null }) {
    if (type === "hub") return <Warehouse className="h-3.5 w-3.5 text-blue-500" />;
    if (type === "venue") return <MapPin className="h-3.5 w-3.5 text-green-500" />;
    return <MapPin className="h-3.5 w-3.5 text-muted-foreground" />;
}

function formatTimestamp(ts: string | null): string {
    if (!ts) return "Unknown time";
    try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return ts; }
}

export function MovementHistory({ movements }: MovementHistoryProps) {
    if (movements.length === 0) return <p className="text-sm text-muted-foreground py-2">No movement history recorded.</p>;
    return (
        <div className="relative space-y-0">
            {movements.map((m, i) => (
                <div key={m.id} className="relative flex gap-3 pb-4">
                    {i < movements.length - 1 && <div className="absolute left-[7px] top-4 h-full w-px bg-border" />}
                    <div className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-background" />
                    <div className="flex-1 space-y-1">
                        <p className="text-xs text-muted-foreground">{formatTimestamp(m.moved_at)}</p>
                        <div className="flex items-center gap-1.5 text-sm">
                            <span className="flex items-center gap-1"><LocationIcon type={m.from_location_type} />{m.from_location_name ?? "Unknown"}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="flex items-center gap-1"><LocationIcon type={m.to_location_type} />{m.to_location_name ?? "Unknown"}</span>
                        </div>
                        {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                    </div>
                </div>
            ))}
        </div>
    );
}