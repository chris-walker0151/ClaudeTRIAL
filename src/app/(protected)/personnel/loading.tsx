import { UserCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PersonnelLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <UserCog className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Personnel</h1>
                    <p className="text-muted-foreground">
                        Manage staff assignments, availability, and scheduling
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
            </div>
            <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-9 w-36" />
            </div>
            <div className="rounded-lg border">
                <div className="border-b p-3 flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-36" />
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="border-b p-3 flex gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                ))}
            </div>
        </div>
    );
}
