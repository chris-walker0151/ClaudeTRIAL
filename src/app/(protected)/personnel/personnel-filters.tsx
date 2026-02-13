"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PERSONNEL_ROLE_LABELS } from "@/lib/weekly-planner/constants";
import type { RoleFilter } from "@/lib/personnel/types";

interface PersonnelFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    roleFilter: RoleFilter;
    onRoleChange: (value: RoleFilter) => void;
    hubFilter: string;
    onHubChange: (value: string) => void;
    hubs: { id: string; name: string }[];
}

export function PersonnelFilters({
    searchQuery, onSearchChange,
    roleFilter, onRoleChange,
    hubFilter, onHubChange,
    hubs,
}: PersonnelFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-8"
                />
            </div>

            <Select value={roleFilter} onValueChange={(v) => onRoleChange(v as RoleFilter)}>
                <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {Object.entries(PERSONNEL_ROLE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={hubFilter} onValueChange={onHubChange}>
                <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Hubs" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Hubs</SelectItem>
                    {hubs.map((hub) => (
                        <SelectItem key={hub.id} value={hub.id}>
                            {hub.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
