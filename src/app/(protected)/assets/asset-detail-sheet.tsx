"use client";

import { useState, useEffect, useTransition } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ASSET_TYPE_LABELS } from "@/lib/weekly-planner/constants";
import {
    ASSET_CONDITION_LABELS,
    ASSET_CONDITION_COLORS,
    ASSET_STATUS_LABELS,
    ASSET_STATUS_COLORS,
} from "@/lib/assets/constants";
import { MovementHistory } from "./movement-history";
import { fetchAssetDetailAction, updateAssetNotes, transitionAssetStatus } from "./actions";
import { ASSET_TRANSITIONS } from "@/lib/assets/state-machine";
import type { AssetDetail, AssetStatus } from "@/lib/assets/types";

interface AssetDetailSheetProps {
    assetId: string | null;
    onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-2 py-1.5">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            <span className="text-sm font-medium text-right">{children}</span>
        </div>
    );
}

export function AssetDetailSheet({ assetId, onClose }: AssetDetailSheetProps) {
    const [detail, setDetail] = useState<AssetDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState("");
    const [isSaving, startSaving] = useTransition();
    const [isStatusTransitioning, setIsStatusTransitioning] = useState(false);

    useEffect(() => {
        if (!assetId) {
            setDetail(null);
            return;
        }
        setLoading(true);
        fetchAssetDetailAction(assetId).then((result) => {
            if (result.success && result.data) {
                setDetail(result.data);
                setNotes(result.data.notes ?? "");
            }
            setLoading(false);
        });
    }, [assetId]);

    const handleSaveNotes = () => {
        if (!detail) return;
        startSaving(async () => {
            await updateAssetNotes(detail.id, notes);
        });
    };

    return (
        <Sheet open={!!assetId} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent side="right" className="w-[480px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>
                        {loading ? <Skeleton className="h-6 w-40" /> : detail?.serial_number ?? "Asset Detail"}
                    </SheetTitle>
                    <SheetDescription>
                        {loading ? <Skeleton className="h-4 w-60" /> : detail ? ASSET_TYPE_LABELS[detail.asset_type] : ""}
                    </SheetDescription>
                </SheetHeader>

                {loading && (
                    <div className="space-y-4 pt-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full" />
                        ))}
                    </div>
                )}

                {detail && !loading && (
                    <div className="space-y-6 pt-4">
                        {/* Core info */}
                        <div>
                            <DetailRow label="Condition">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ASSET_CONDITION_COLORS[detail.condition]}`}>
                                    {ASSET_CONDITION_LABELS[detail.condition]}
                                </span>
                            </DetailRow>
                            <DetailRow label="Status">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ASSET_STATUS_COLORS[detail.status]}`}>
                                        {ASSET_STATUS_LABELS[detail.status]}
                                    </span>
                                    {ASSET_TRANSITIONS[detail.status]?.length > 0 && (
                                        <div className="flex gap-1">
                                            {ASSET_TRANSITIONS[detail.status].map((nextStatus) => (
                                                <Button
                                                    key={nextStatus}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs"
                                                    disabled={isStatusTransitioning}
                                                    onClick={async () => {
                                                        setIsStatusTransitioning(true);
                                                        const result = await transitionAssetStatus(
                                                            detail.id,
                                                            nextStatus as AssetStatus,
                                                        );
                                                        setIsStatusTransitioning(false);
                                                        if (result.success) {
                                                            // Refetch detail
                                                            const refreshed = await fetchAssetDetailAction(detail.id);
                                                            if (refreshed.success && refreshed.data) {
                                                                setDetail(refreshed.data);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    &rarr; {ASSET_STATUS_LABELS[nextStatus as AssetStatus]}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </DetailRow>
                            <DetailRow label="Model">{detail.model_version ?? "—"}</DetailRow>
                            <DetailRow label="Home Hub">{detail.home_hub_name ?? "—"}</DetailRow>
                            <DetailRow label="Current Hub">{detail.current_hub_name ?? "—"}</DetailRow>
                            <DetailRow label="Venue">{detail.current_venue_name ?? "—"}</DetailRow>
                            <DetailRow label="Branding">{detail.current_branding ?? "—"}</DetailRow>
                            <DetailRow label="Weight">{detail.weight_lbs ? `${detail.weight_lbs} lbs` : "—"}</DetailRow>
                        </div>

                            <Separator />

                            {/* Movement History */}
                            <div>
                                <h3 className="text-sm font-semibold mb-2">Movement History</h3>
                                <MovementHistory movements={detail.movements} />
                            </div>

                            <Separator />

                            {/* Assignments */}
                            <div>
                                <h3 className="text-sm font-semibold mb-2">Assignments</h3>
                                {detail.assignments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No assignments.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {detail.assignments.map((a) => (
                                            <div key={a.id} className="rounded border p-2 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{a.customer_name}</span>
                                                    <Badge variant={a.is_permanent ? "default" : "outline"}>
                                                        {a.is_permanent ? "Permanent" : `Season ${a.season_year}`}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Branding Tasks */}
                            <div>
                                <h3 className="text-sm font-semibold mb-2">Branding Tasks</h3>
                                {detail.branding_tasks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No branding tasks.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {detail.branding_tasks.map((b) => (
                                            <div key={b.id} className="rounded border p-2 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span>{b.from_branding ?? "None"} &rarr; {b.to_branding ?? "None"}</span>
                                                    <Badge variant="outline">{b.status}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {b.hub_name}{b.needed_by_date ? ` • Needed by ${new Date(b.needed_by_date).toLocaleDateString()}` : ""}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Notes */}
                            <div>
                                <h3 className="text-sm font-semibold mb-2">Notes</h3>
                                <textarea
                                    className="w-full rounded-md border bg-background p-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes about this asset..."
                                />
                                <Button
                                    size="sm"
                                    className="mt-2"
                                    disabled={isSaving || notes === (detail.notes ?? "")}
                                    onClick={handleSaveNotes}
                                >
                                    {isSaving ? "Saving..." : "Save Notes"}
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
        </Sheet>
    );
}
