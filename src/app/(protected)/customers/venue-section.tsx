"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { addVenue, deleteVenue } from "./actions";
import type { VenueRow } from "@/lib/customers/types";

interface VenueSectionProps {
    venues: VenueRow[];
    customerId: string;
}

export function VenueSection({ venues, customerId }: VenueSectionProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCity, setNewCity] = useState("");
    const [newState, setNewState] = useState("");
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        await addVenue(customerId, {
            name: newName.trim(),
            city: newCity.trim() || undefined,
            state: newState.trim() || undefined,
        });
        setNewName("");
        setNewCity("");
        setNewState("");
        setShowAdd(false);
        setSaving(false);
    };

    const handleDelete = async (venueId: string) => {
        await deleteVenue(venueId);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Venues ({venues.length})
                </h3>
                <Button variant="ghost" size="xs" onClick={() => setShowAdd(!showAdd)}>
                    <Plus className="h-3 w-3" /> Add
                </Button>
            </div>

            {showAdd && (
                <div className="flex gap-2 items-end">
                    <Input placeholder="Venue name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    <Input placeholder="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} className="w-24" />
                    <Input placeholder="ST" value={newState} onChange={(e) => setNewState(e.target.value)} className="w-16" />
                    <Button size="sm" onClick={handleAdd} disabled={saving}>Save</Button>
                </div>
            )}

            {venues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No venues added yet.</p>
            ) : (
                <div className="space-y-2">
                    {venues.map((venue) => (
                        <div
                            key={venue.id}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                            <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <div>
                                    <span className="text-sm font-medium">{venue.name}</span>
                                    {venue.city && (
                                        <span className="text-sm text-muted-foreground ml-2">
                                            {venue.city}{venue.state ? ", " + venue.state : ""}
                                        </span>
                                    )}
                                </div>
                                {venue.is_primary && <Badge variant="outline" className="ml-2">Primary</Badge>}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDelete(venue.id)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
