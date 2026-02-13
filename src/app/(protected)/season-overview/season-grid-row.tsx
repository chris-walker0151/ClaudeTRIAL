"use client";

import type { SeasonCustomerRow } from "@/lib/season-overview/types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { SeasonGridCell } from "./season-grid-cell";

interface SeasonGridRowProps {
    customer: SeasonCustomerRow;
}

export function SeasonGridRow({ customer }: SeasonGridRowProps) {
    return (
        <div className="grid grid-cols-[200px_repeat(19,minmax(48px,1fr))] border-b last:border-b-0 hover:bg-muted/20 transition-colors">
            <div className="sticky left-0 z-10 bg-background flex items-center px-4 py-1.5">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate text-sm font-medium max-w-[180px]" title={customer.customer_name}>
                                {customer.customer_name}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            {customer.customer_name}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {customer.weeks.map((cell, index) => (
                <SeasonGridCell
                    key={index}
                    data={cell}
                    weekNumber={index}
                />
            ))}
        </div>
    );
}
