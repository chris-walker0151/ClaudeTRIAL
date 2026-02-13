"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeAssets } from "@/hooks/use-realtime-assets";
import { AssetFilters } from "./asset-filters";
import { BulkActionBar } from "./bulk-action-bar";
import { AssetTable } from "./asset-table";
import { AssetDetailSheet } from "./asset-detail-sheet";
import { ITEMS_PER_PAGE } from "@/lib/assets/constants";
import { Button } from "@/components/ui/button";
import type {
    AssetsPageData,
    AssetTypeFilter,
    ConditionFilter,
    StatusFilter,
} from "@/lib/assets/types";

interface AssetsShellProps {
    data: AssetsPageData;
}

export function AssetsShell({ data }: AssetsShellProps) {
    const router = useRouter();

    // Real-time subscription for asset changes
    useRealtimeAssets();

    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>("all");
    const [conditionFilter, setConditionFilter] = useState<ConditionFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [hubFilter, setHubFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    const filteredAssets = useMemo(() => {
        return data.assets.filter((asset) => {
            if (typeFilter !== "all" && asset.asset_type !== typeFilter) return false;
            if (conditionFilter !== "all" && asset.condition !== conditionFilter) return false;
            if (statusFilter !== "all" && asset.status !== statusFilter) return false;
            if (hubFilter !== "all") {
                if (asset.home_hub_name !== hubFilter && asset.current_hub_name !== hubFilter) return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const haystack = [
                    asset.serial_number,
                    asset.current_branding ?? "",
                    asset.model_version ?? "",
                ].join(" ").toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [data.assets, typeFilter, conditionFilter, statusFilter, hubFilter, searchQuery]);

    const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
    const paginatedAssets = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAssets.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAssets, currentPage]);

    const handleToggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleToggleAll = useCallback(() => {
        const allOnPage = paginatedAssets.every((a) => selectedIds.has(a.id));
        if (allOnPage) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                paginatedAssets.forEach((a) => next.delete(a.id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                paginatedAssets.forEach((a) => next.add(a.id));
                return next;
            });
        }
    }, [paginatedAssets, selectedIds]);

    const handleClearFilters = useCallback(() => {
        setSearchQuery("");
        setTypeFilter("all");
        setConditionFilter("all");
        setStatusFilter("all");
        setHubFilter("all");
        setCurrentPage(1);
    }, []);

    return (
        <div className="space-y-4">
            <AssetFilters
                searchQuery={searchQuery}
                onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
                typeFilter={typeFilter}
                onTypeFilterChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}
                conditionFilter={conditionFilter}
                onConditionFilterChange={(v) => { setConditionFilter(v); setCurrentPage(1); }}
                statusFilter={statusFilter}
                onStatusFilterChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                hubFilter={hubFilter}
                onHubFilterChange={(v) => { setHubFilter(v); setCurrentPage(1); }}
                hubs={data.hubs}
                onClearFilters={handleClearFilters}
            />

            <BulkActionBar
                selectedCount={selectedIds.size}
                selectedIds={Array.from(selectedIds)}
                onComplete={() => setSelectedIds(new Set())}
            />

            <AssetTable
                assets={paginatedAssets}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleAll={handleToggleAll}
                onSelectAsset={(id) => setSelectedAssetId(id)}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{
                            Math.min(currentPage * ITEMS_PER_PAGE, filteredAssets.length)
                        } of {filteredAssets.length} assets
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                        >
                            Previous
                        </Button>
                        <span className="text-sm">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <AssetDetailSheet
                assetId={selectedAssetId}
                onClose={() => setSelectedAssetId(null)}
            />
        </div>
    );
}
