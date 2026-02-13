import { CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WeeklyPlannerLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <CalendarDays className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Weekly Planner</h1>
                    <p className="text-muted-foreground">
                        Plan and manage weekly trip assignments
                    </p>
                </div>
            </div>

            {/* Week selector skeleton */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9" />
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-12" />
                ))}
                <Skeleton className="h-9 w-9" />
            </div>

            {/* Toolbar skeleton */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-10 w-44" />
                <Skeleton className="ml-auto h-10 w-28" />
            </div>

            {/* Filter bar skeleton */}
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
            </div>

            {/* Trip cards skeleton */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-36" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-48" />
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-6 w-10 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
