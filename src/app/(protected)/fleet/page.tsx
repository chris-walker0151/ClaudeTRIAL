import { Truck } from "lucide-react";
import { SEASON_YEAR } from "@/lib/constants";
import { fetchFleetData } from "@/lib/fleet/queries";
import { FleetShell } from "./fleet-shell";

export default async function FleetPage() {
    const data = await fetchFleetData(SEASON_YEAR);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Truck className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Fleet</h1>
                    <p className="text-muted-foreground">
                        Vehicle status and availability tracking
                    </p>
                </div>
            </div>
            <FleetShell data={data} />
        </div>
    );
}
