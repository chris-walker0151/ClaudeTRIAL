import { Plane } from "lucide-react";
import { SEASON_YEAR } from "@/lib/constants";
import { fetchTravelData } from "@/lib/travel/queries";
import { TravelShell } from "./travel-shell";

interface PageProps {
    searchParams: Promise<{ week?: string }>;
}

export default async function TravelPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const weekNumber = Math.max(
        1,
        Math.min(18, parseInt(params.week ?? "1", 10) || 1),
    );

    const data = await fetchTravelData(SEASON_YEAR, weekNumber);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Plane className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Travel</h1>
                    <p className="text-muted-foreground">
                        Hotel and flight recommendations for trip personnel
                    </p>
                </div>
            </div>
            <TravelShell data={data} />
        </div>
    );
}
