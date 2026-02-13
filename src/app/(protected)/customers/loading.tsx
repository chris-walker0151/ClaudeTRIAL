import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Customers</h1>
                    <p className="text-muted-foreground">
                        Manage customer accounts, venues, and contracts
                    </p>
                </div>
            </div>

            {/* Filters skeleton */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-36" />
            </div>

            {/* Table skeleton */}
            <div className="rounded-lg border">
                <div className="border-b px-4 py-3 flex gap-8">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 w-24" />
                    ))}
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border-b px-4 py-3 flex gap-8">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-10" />
                        <Skeleton className="h-4 w-10" />
                    </div>
                ))}
            </div>
        </div>
    );
}
