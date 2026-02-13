"use client";

import { WEEKS_IN_SEASON } from "@/lib/constants";

export function SeasonGridHeader() {
    return (
        <div className="grid grid-cols-[200px_repeat(19,minmax(48px,1fr))] border-b bg-muted/50">
            <div className="sticky left-0 z-10 bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
                Customer
            </div>
            {Array.from({ length: WEEKS_IN_SEASON + 1 }, (_, i) => (
                <div
                    key={i}
                    className="px-1 py-2 text-center text-xs font-mono text-muted-foreground"
                >
                    {i === 0 ? "Pre" : `W${i}`}
                </div>
            ))}
        </div>
    );
}
