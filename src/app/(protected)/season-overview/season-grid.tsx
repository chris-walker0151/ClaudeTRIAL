"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { SeasonCustomerRow, WeekSummary, SportType } from "@/lib/season-overview/types";
import { SPORT_TYPE_LABELS } from "@/lib/season-overview/constants";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SeasonGridHeader } from "./season-grid-header";
import { SeasonGridRow } from "./season-grid-row";
import { SeasonSummaryRow } from "./season-summary-row";

interface SeasonGridProps {
    groupedCustomers: Map<string, SeasonCustomerRow[]>;
    summaries: WeekSummary[];
}

export function SeasonGrid({ groupedCustomers, summaries }: SeasonGridProps) {
    const groupEntries = Array.from(groupedCustomers.entries());

    return (
        <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                    <SeasonGridHeader />

                    {groupEntries.map(([sportType, customers]) => (
                        <SportGroup
                            key={sportType}
                            sportType={sportType as SportType}
                            customers={customers}
                        />
                    ))}

                    <SeasonSummaryRow summaries={summaries} />
                </div>
            </div>
        </div>
    );
}

interface SportGroupProps {
    sportType: SportType;
    customers: SeasonCustomerRow[];
}

function SportGroup({ sportType, customers }: SportGroupProps) {
    const [open, setOpen] = useState(true);

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 bg-muted/30 px-4 py-2 text-left text-sm font-semibold hover:bg-muted/50 transition-colors">
                <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                />
                {SPORT_TYPE_LABELS[sportType]}
                <span className="text-xs font-normal text-muted-foreground">
                    ({customers.length})
                </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
                {customers.map((customer) => (
                    <SeasonGridRow
                        key={customer.customer_id}
                        customer={customer}
                    />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}
