"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSET_CONDITION_LABELS, ALL_ASSET_CONDITIONS } from "@/lib/assets/constants";
import { bulkUpdateCondition } from "./actions";
import type { AssetCondition } from "@/lib/assets/types";

interface BulkActionBarProps {
    selectedCount: number;
    selectedIds: string[];
    onComplete: () => void;
}

export function BulkActionBar({ selectedCount, selectedIds, onComplete }: BulkActionBarProps) {
    const [condition, setCondition] = useState<AssetCondition | "">("");
    const [isPending, startTransition] = useTransition();

    if (selectedCount === 0) return null;

    const handleUpdate = () => {
        if (!condition) return;
        startTransition(async () => {
            const result = await bulkUpdateCondition(selectedIds, condition);
            if (result.success) { setCondition(""); onComplete(); }
        });
    };

    return (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <Select value={condition} onValueChange={(v) => setCondition(v as AssetCondition)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Set condition..." />
                </SelectTrigger>
                <SelectContent>
                    {ALL_ASSET_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{ASSET_CONDITION_LABELS[c]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button size="sm" disabled={!condition || isPending} onClick={handleUpdate}>
                {isPending ? "Updating..." : "Update Condition"}
            </Button>
        </div>
    );
}
