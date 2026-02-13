"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VehicleFiltersProps {
    hubs: { id: string; name: string }[];
    hubFilter: string; onHubFilterChange: (v: string) => void;
    statusFilter: string; onStatusFilterChange: (v: string) => void;
    searchQuery: string; onSearchChange: (v: string) => void;
}

export function VehicleFilters({ hubs, hubFilter, onHubFilterChange, statusFilter, onStatusFilterChange, searchQuery, onSearchChange }: VehicleFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search vehicles..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" />
            </div>
            <Select value={hubFilter} onValueChange={onHubFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Hubs" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Hubs</SelectItem>
                    {hubs.map((hub) => <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
