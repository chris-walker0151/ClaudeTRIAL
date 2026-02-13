"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ASSET_TYPE_LABELS } from "@/lib/weekly-planner/constants";
import {
    ASSET_CONDITION_LABELS,
    ASSET_CONDITION_COLORS,
    ASSET_STATUS_LABELS,
    ASSET_STATUS_COLORS,
} from "@/lib/assets/constants";
import type { AssetListItem } from "@/lib/assets/types";

interface AssetTableProps {
    assets: AssetListItem[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleAll: () => void;
    onSelectAsset: (id: string) => void;
}

export function AssetTable({
    assets,
    selectedIds,
    onToggleSelect,
    onToggleAll,
    onSelectAsset,
}: AssetTableProps) {
    const allSelected = assets.length > 0 && assets.every((a) => selectedIds.has(a.id));
    const someSelected = !allSelected && assets.some((a) => selectedIds.has(a.id));

    function getLocation(asset: AssetListItem): string {
        if (asset.current_venue_name) return asset.current_venue_name;
        if (asset.current_hub_name) return asset.current_hub_name;
        return "Unknown";
    }

    if (assets.length === 0) {
        return (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                No assets match your filters.
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]">
                            <Checkbox
                                checked={allSelected}
                                ref={(el) => {
                                    if (el) {
                                        (el as unknown as HTMLInputElement).indeterminate = someSelected;
                                    }
                                }}
                                onCheckedChange={onToggleAll}
                                aria-label="Select all"
                            />
                        </TableHead>
                        <TableHead>Serial #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Branding</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {assets.map((asset) => (
                        <TableRow
                            key={asset.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => onSelectAsset(asset.id)}
                        >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={selectedIds.has(asset.id)}
                                    onCheckedChange={() => onToggleSelect(asset.id)}
                                    aria-label={`Select ${asset.serial_number}`}
                                />
                            </TableCell>
                            <TableCell className="font-mono font-medium">
                                {asset.serial_number}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">
                                    {ASSET_TYPE_LABELS[asset.asset_type]}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {asset.model_version ?? "—"}
                            </TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ASSET_CONDITION_COLORS[asset.condition]}`}>
                                    {ASSET_CONDITION_LABELS[asset.condition]}
                                </span>
                            </TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ASSET_STATUS_COLORS[asset.status]}`}>
                                    {ASSET_STATUS_LABELS[asset.status]}
                                </span>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">
                                {getLocation(asset)}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate text-muted-foreground">
                                {asset.current_branding ?? "—"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
