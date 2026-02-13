"use client";

import { useState, useMemo, useCallback } from "react";
import { CustomerFilters } from "./customer-filters";
import { CustomerTable } from "./customer-table";
import { CustomerDetailSheet } from "./customer-detail-sheet";
import type { CustomerListItem, SportFilter } from "@/lib/customers/types";

interface CustomersShellProps {
    customers: CustomerListItem[];
}

export function CustomersShell({ customers }: CustomersShellProps) {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [sportFilter, setSportFilter] = useState<SportFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCustomers = useMemo(() => {
        let result = customers;

        if (sportFilter !== "all") {
            result = result.filter((c) => c.sport_type === sportFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    (c.primary_contact?.toLowerCase().includes(q) ?? false) ||
                    (c.contact_email?.toLowerCase().includes(q) ?? false),
            );
        }

        return result;
    }, [customers, sportFilter, searchQuery]);

    const handleSelectCustomer = useCallback((id: string) => {
        setSelectedCustomerId(id);
    }, []);

    return (
        <div className="space-y-4">
            <CustomerFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sportFilter={sportFilter}
                onSportFilterChange={setSportFilter}
            />

            <div className="text-sm text-muted-foreground">
                {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}
            </div>

            <CustomerTable
                customers={filteredCustomers}
                onSelectCustomer={handleSelectCustomer}
            />

            <CustomerDetailSheet
                customerId={selectedCustomerId}
                open={selectedCustomerId !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedCustomerId(null);
                }}
            />
        </div>
    );
}
