"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SETTINGS_TABS } from "@/lib/settings/constants";
import type { SettingsPageData, SettingsTab, PreferredRouteRow } from "@/lib/settings/types";
import { RoutesTab } from "./routes-tab";
import { RouteFormSheet } from "./route-form-sheet";
import { OptimizerTab } from "./optimizer-tab";
import { HubsTab } from "./hubs-tab";

interface SettingsShellProps {
    data: SettingsPageData;
}

export function SettingsShell({ data }: SettingsShellProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>("routes");
    const [routeToEdit, setRouteToEdit] = useState<PreferredRouteRow | null>(null);
    const [formOpen, setFormOpen] = useState(false);

    const handleAddRoute = () => {
        setRouteToEdit(null);
        setFormOpen(true);
    };

    const handleEditRoute = (route: PreferredRouteRow) => {
        setRouteToEdit(route);
        setFormOpen(true);
    };

    return (
        <>
            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as SettingsTab)}
            >
                <TabsList>
                    {SETTINGS_TABS.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="routes">
                    <RoutesTab
                        routes={data.preferredRoutes}
                        onEdit={handleEditRoute}
                        onAdd={handleAddRoute}
                    />
                </TabsContent>

                <TabsContent value="optimizer">
                    <OptimizerTab settings={data.optimizerSettings} />
                </TabsContent>

                <TabsContent value="hubs">
                    <HubsTab hubs={data.hubs} />
                </TabsContent>
            </Tabs>

            <RouteFormSheet
                open={formOpen}
                onOpenChange={setFormOpen}
                route={routeToEdit}
            />
        </>
    );
}
