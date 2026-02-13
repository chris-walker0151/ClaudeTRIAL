"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SPORT_TYPE_LABELS, SPORT_TYPE_COLORS } from "@/lib/customers/constants";
import type { CustomerListItem } from "@/lib/customers/types";

interface CustomerTableProps {
    customers: CustomerListItem[];
    onSelectCustomer: (id: string) => void;
}

export function CustomerTable({ customers, onSelectCustomer }: CustomerTableProps) {
    if (customers.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No customers found.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Venues</TableHead>
                    <TableHead className="text-center">Contracts</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {customers.map((customer) => (
                    <TableRow
                        key={customer.id}
                        className="cursor-pointer"
                        onClick={() => onSelectCustomer(customer.id)}
                    >
                        <TableCell className="font-medium">
                            {customer.name}
                        </TableCell>
                        <TableCell>
                            <Badge
                                variant="secondary"
                                className={SPORT_TYPE_COLORS[customer.sport_type]}
                            >
                                {SPORT_TYPE_LABELS[customer.sport_type]}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {customer.primary_contact ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                            {customer.contact_email ?? ""}
                        </TableCell>
                        <TableCell className="text-center">
                            {customer.venue_count}
                        </TableCell>
                        <TableCell className="text-center">
                            {customer.contract_count}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
