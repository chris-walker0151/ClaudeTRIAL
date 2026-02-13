"use client";

import { useState, useMemo } from "react";
import type { SeasonOverviewData, SportFilter, SeasonCustomerRow } from "@/lib/season-overview/types";
import { CELL_STATUS_COLORS, CELL_STATUS_LABELS } from "@/lib/season-overview/constants";
import type { CellStatus } from "@/lib/season-overview/types";
import { SeasonFilters } from "./season-filters";
import { SeasonGrid } from "./season-grid";

interface SeasonOverviewShellProps {
    data: SeasonOverviewData;
}

export function SeasonOverviewShell({ data }: SeasonOverviewShellProps) {
    const [sportFilter, setSportFilter] = useState<SportFilter>("all");

    // Filter customers by sport type
    const filteredCustomers = useMemo(() => {
        if (sportFilter === "all") return data.customers;
        return data.customers.filter((c) => c.sport_type === sportFilter);
    }, [data.customers, sportFilter]);

    // Group filtered customers by sport_type
    const groupedCustomers = useMemo(() => {
        const groups = new Map<string, SeasonCustomerRow[]>();
        for (const customer of filteredCustomers) {
            const existing = groups.get(customer.sport_type) ?? [];
            existing.push(customer);
            groups.set(customer.sport_type, existing);
        }
        return groups;
    }, [filteredCustomers]);

    const legendItems: { status: CellStatus; color: string; label: string }[] = [
        { status: "confirmed", color: CELL_STATUS_COLORS.confirmed, label: CELL_STATUS_LABELS.confirmed },
        { status: "recommended", color: CELL_STATUS_COLORS.recommended, label: CELL_STATUS_LABELS.recommended },
        { status: "draft", color: CELL_STATUS_COLORS.draft, label: CELL_STATUS_LABELS.draft },
        { status: "unassigned", color: CELL_STATUS_COLORS.unassigned, label: CELL_STATUS_LABELS.unassigned },
        { status: "no_game", color: CELL_STATUS_COLORS.no_game, label: CELL_STATUS_LABELS.no_game },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <SeasonFilters
                    sportFilter={sportFilter}
                    onSportFilterChange={setSportFilter}
                />
                <div className="flex flex-wrap items-center gap-3">
                    {legendItems.map((item) => (
                        <div key={item.status} className="flex items-center gap-1.5">
                            <div
                                className={`h-3 w-3 rounded-sm ${item.color}`}
                            />
                            <span className="text-xs text-muted-foreground">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <SeasonGrid
                groupedCustomers={groupedCustomers}
                summaries={data.summaries}
            />
        </div>
    );
}
