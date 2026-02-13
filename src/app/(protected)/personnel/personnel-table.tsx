"use client";

import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { PERSONNEL_ROLE_LABELS } from "@/lib/weekly-planner/constants";
import { ROLE_COLORS } from "@/lib/personnel/constants";
import type { PersonnelListItem } from "@/lib/personnel/types";

interface PersonnelTableProps {
    personnel: PersonnelListItem[];
    onSelectPerson: (id: string) => void;
}

export function PersonnelTable({ personnel, onSelectPerson }: PersonnelTableProps) {
    if (personnel.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No personnel found matching your filters.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Hub</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {personnel.map((person) => (
                    <TableRow
                        key={person.id}
                        className="cursor-pointer"
                        onClick={() => onSelectPerson(person.id)}
                    >
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell>
                            <Badge
                                variant="secondary"
                                className={ROLE_COLORS[person.role]}
                            >
                                {PERSONNEL_ROLE_LABELS[person.role] ?? person.role}
                            </Badge>
                        </TableCell>
                        <TableCell>{person.home_hub_name}</TableCell>
                        <TableCell>{person.phone ?? "—"}</TableCell>
                        <TableCell>{person.email ?? "—"}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
