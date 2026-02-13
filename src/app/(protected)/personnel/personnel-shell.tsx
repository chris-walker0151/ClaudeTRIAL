"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEASON_YEAR } from "@/lib/constants";
import type { PersonnelPageData, RoleFilter } from "@/lib/personnel/types";
import { toggleAvailability } from "./actions";
import { PersonnelTable } from "./personnel-table";
import { PersonnelFilters } from "./personnel-filters";
import { PersonnelDetailSheet } from "./personnel-detail-sheet";
import { AvailabilityGrid } from "./availability-grid";

interface PersonnelShellProps { data: PersonnelPageData; }

export function PersonnelShell({ data }: PersonnelShellProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<string>("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
    const [hubFilter, setHubFilter] = useState<string>("all");
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

    const filteredPersonnel = data.personnel.filter((p) => {
        const matchesSearch = searchQuery === "" ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        const matchesRole = roleFilter === "all" || p.role === roleFilter;
        const matchesHub = hubFilter === "all" || p.home_hub_id === hubFilter;
        return matchesSearch && matchesRole && matchesHub;
    });

    const filteredIds = new Set(filteredPersonnel.map((p) => p.id));
    const filteredAvailability = data.availability.filter((row) =>
        filteredIds.has(row.person.id),
    );

    const handleToggle = useCallback(
        async (personId: string, weekNumber: number) => {
            const row = data.availability.find((r) => r.person.id === personId);
            if (!row) return;
            const week = row.weeks.find((w) => w.week_number === weekNumber);
            if (!week || week.status === "on_trip") return;
            const newAvailable = week.status === "unavailable";
            await toggleAvailability(personId, weekNumber, SEASON_YEAR, newAvailable);
            router.refresh();
        },
        [data.availability, router],
    );

    return (
        <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
                <TabsList>
                    <TabsTrigger value="list">Staff List</TabsTrigger>
                    <TabsTrigger value="availability">Availability Grid</TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    <PersonnelFilters
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        roleFilter={roleFilter}
                        onRoleChange={setRoleFilter}
                        hubFilter={hubFilter}
                        onHubChange={setHubFilter}
                        hubs={data.hubs}
                    />
                </div>

                <TabsContent value="list" className="mt-4">
                    <PersonnelTable
                        personnel={filteredPersonnel}
                        onSelectPerson={setSelectedPersonId}
                    />
                </TabsContent>

                <TabsContent value="availability" className="mt-4">
                    <AvailabilityGrid
                        rows={filteredAvailability}
                        onToggle={handleToggle}
                    />
                </TabsContent>
            </Tabs>

            <PersonnelDetailSheet
                personId={selectedPersonId}
                onClose={() => setSelectedPersonId(null)}
            />
        </>
    );
}
