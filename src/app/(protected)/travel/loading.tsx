import { Plane } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TravelLoading() {
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

            {/* Week selector skeleton */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-36" />
            </div>

            {/* Tabs skeleton */}
            <div className="flex gap-2">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
            </div>

            {/* Status filter skeleton */}
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
            </div>

            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-48" />
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
