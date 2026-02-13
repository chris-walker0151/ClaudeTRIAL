import { BarChart3 } from "lucide-react";
import { SEASON_YEAR } from "@/lib/constants";
import { fetchSeasonOverview } from "@/lib/season-overview/queries";
import { SeasonOverviewShell } from "./season-overview-shell";

export default async function SeasonOverviewPage() {
    const data = await fetchSeasonOverview(SEASON_YEAR);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Season Overview</h1>
                    <p className="text-muted-foreground">
                        Full season view across all customers
                    </p>
                </div>
            </div>
            <SeasonOverviewShell data={data} />
        </div>
    );
}
