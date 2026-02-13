import { Settings } from "lucide-react";
import { fetchSettingsData } from "@/lib/settings/queries";
import { SettingsShell } from "./settings-shell";

export default async function SettingsPage() {
    const data = await fetchSettingsData();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">
                        Hub configuration, optimizer settings, and preferred flight routes
                    </p>
                </div>
            </div>
            <SettingsShell data={data} />
        </div>
    );
}
