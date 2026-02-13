import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SeasonOverviewLoading() {
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

            {/* Filter bar skeleton */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-40" />
                <div className="flex gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 w-20" />
                    ))}
                </div>
            </div>

            {/* Grid skeleton */}
            <div className="rounded-lg border overflow-hidden">
                {/* Header row */}
                <div className="flex gap-1 p-2 bg-muted/50">
                    <Skeleton className="h-6 w-[200px] shrink-0" />
                    {Array.from({ length: 18 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-12" />
                    ))}
                </div>
                {/* Data rows */}
                {Array.from({ length: 8 }).map((_, rowIdx) => (
                    <div key={rowIdx} className="flex gap-1 p-2">
                        <Skeleton className="h-8 w-[200px] shrink-0" />
                        {Array.from({ length: 18 }).map((_, colIdx) => (
                            <Skeleton
                                key={colIdx}
                                className="h-8 w-12 rounded"
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
