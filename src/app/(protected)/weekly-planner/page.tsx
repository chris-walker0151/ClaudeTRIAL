import { CalendarDays } from "lucide-react";
import { SEASON_YEAR } from "@/lib/constants";
import { fetchWeekData, fetchFormData } from "@/lib/weekly-planner/queries";
import { PlannerShell } from "./planner-shell";

interface PageProps {
    searchParams: Promise<{ week?: string }>;
}

export default async function WeeklyPlannerPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const parsed = parseInt(params.week ?? "1", 10);
    const weekNumber = Math.max(
        0,
        Math.min(18, Number.isNaN(parsed) ? 1 : parsed),
    );

    const [weekData, formData] = await Promise.all([
        fetchWeekData(SEASON_YEAR, weekNumber),
        fetchFormData(),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <CalendarDays className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">
                        {weekNumber === 0 ? "Pre-Season Deployment" : "Weekly Planner"}
                    </h1>
                    <p className="text-muted-foreground">
                        {weekNumber === 0
                            ? "Deploy equipment from hubs to Week 1 game venues"
                            : "Plan and manage weekly trip assignments"}
                    </p>
                </div>
            </div>
            <PlannerShell data={weekData} formData={formData} />
        </div>
    );
}
