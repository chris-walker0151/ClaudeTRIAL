"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Sheet, SheetContent, SheetDescription,
    SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { PERSONNEL_ROLE_LABELS } from "@/lib/weekly-planner/constants";
import { ROLE_COLORS } from "@/lib/personnel/constants";
import type { PersonnelDetail } from "@/lib/personnel/types";
import { fetchPersonnelDetailAction, updatePersonnelNotes } from "./actions";

interface PersonnelDetailSheetProps {
    personId: string | null;
    onClose: () => void;
}

export function PersonnelDetailSheet({ personId, onClose }: PersonnelDetailSheetProps) {
    const [detail, setDetail] = useState<PersonnelDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!personId) { setDetail(null); return; }
        setLoading(true);
        fetchPersonnelDetailAction(personId).then((data) => {
            setDetail(data);
            setNotes(data?.notes ?? "");
            setLoading(false);
        });
    }, [personId]);

    const handleSaveNotes = async () => {
        if (!personId) return;
        setSaving(true);
        await updatePersonnelNotes(personId, notes);
        setSaving(false);
    };

    return (
        <Sheet open={!!personId} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>
                        {loading ? "Loading..." : detail?.name ?? "Personnel Detail"}
                    </SheetTitle>
                    <SheetDescription>
                        {detail && !loading
                            ? `${PERSONNEL_ROLE_LABELS[detail.role] ?? detail.role} at ${detail.home_hub_name}`
                            : "View personnel details"}
                    </SheetDescription>
                </SheetHeader>

                {detail && !loading && (
                    <div className="space-y-6 px-4 pb-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className={ROLE_COLORS[detail.role]}>
                                    {PERSONNEL_ROLE_LABELS[detail.role] ?? detail.role}
                                </Badge>
                                <span className="text-sm text-muted-foreground">{detail.home_hub_name}</span>
                            </div>
                            {detail.phone && <p className="text-sm"><span className="text-muted-foreground">Phone:</span> {detail.phone}</p>}
                            {detail.email && <p className="text-sm"><span className="text-muted-foreground">Email:</span> {detail.email}</p>}
                            <p className="text-sm"><span className="text-muted-foreground">Max Drive Hours:</span> {detail.max_drive_hrs}</p>
                            {detail.skills && detail.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    <span className="text-sm text-muted-foreground mr-1">Skills:</span>
                                    {detail.skills.map((skill) => (
                                        <Badge key={skill} variant="outline">{skill}</Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Separator />
                        <div>
                            <h3 className="text-sm font-semibold mb-2">Upcoming Trips</h3>
                            {detail.upcoming_trips.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No trips assigned</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Week</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Role</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detail.upcoming_trips.map((trip) => (
                                            <TableRow key={trip.id}>
                                                <TableCell>W{trip.week_number}</TableCell>
                                                <TableCell><Badge variant="outline">{trip.status}</Badge></TableCell>
                                                <TableCell>{trip.role_on_trip ?? "\u2014"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold">Notes</h3>
                            <textarea
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes..."
                            />
                            <Button size="sm" onClick={handleSaveNotes} disabled={saving}>
                                {saving ? "Saving..." : "Save Notes"}
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
