"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { X, Search } from "lucide-react";
import { ASSET_TYPE_LABELS } from "@/lib/weekly-planner/constants";
import {
    ASSET_CONDITION_LABELS,
    ASSET_STATUS_LABELS,
    ALL_ASSET_CONDITIONS,
    ALL_ASSET_STATUSES,
} from "@/lib/assets/constants";
import type {
    AssetTypeFilter,
    ConditionFilter,
    StatusFilter,
    AssetType,
} from "@/lib/assets/types";

const ALL_ASSET_TYPES: AssetType[] = [
    "heated_bench",
    "cooling_bench",
    "hybrid_bench",
    "dragon_shader",
    "heated_foot_deck",
];

interface AssetFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    typeFilter: AssetTypeFilter;
    onTypeFilterChange: (value: AssetTypeFilter) => void;
    conditionFilter: ConditionFilter;
    onConditionFilterChange: (value: ConditionFilter) => void;
    statusFilter: StatusFilter;
    onStatusFilterChange: (value: StatusFilter) => void;
    hubFilter: string;
    onHubFilterChange: (value: string) => void;
    hubs: { id: string; name: string }[];
    onClearFilters: () => void;
}

export function AssetFilters({
    searchQuery, onSearchChange, typeFilter, onTypeFilterChange,
    conditionFilter, onConditionFilterChange, statusFilter, onStatusFilterChange,
    hubFilter, onHubFilterChange, hubs, onClearFilters,
}: AssetFiltersProps) {
    const hasFilters = searchQuery.trim() !== "" || typeFilter !== "all" || conditionFilter !== "all" || statusFilter !== "all" || hubFilter !== "all";

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search serial #, branding..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="w-64 pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as AssetTypeFilter)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {ALL_ASSET_TYPES.map((t) => (<SelectItem key={t} value={t}>{ASSET_TYPE_LABELS[t]}</SelectItem>))}
                </SelectContent>
            </Select>
            <Select value={hubFilter} onValueChange={onHubFilterChange}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Hubs" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Hubs</SelectItem>
                    {hubs.map((h) => (<SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>))}
                </SelectContent>
            </Select>
            <Select value={conditionFilter} onValueChange={(v) => onConditionFilterChange(v as ConditionFilter)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Conditions" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    {ALL_ASSET_CONDITIONS.map((c) => (<SelectItem key={c} value={c}>{ASSET_CONDITION_LABELS[c]}</SelectItem>))}
                </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ALL_ASSET_STATUSES.map((s) => (<SelectItem key={s} value={s}>{ASSET_STATUS_LABELS[s]}</SelectItem>))}
                </SelectContent>
            </Select>
            {hasFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
                    <X className="h-4 w-4" /> Clear Filters
                </Button>
            )}
        </div>
    );
}