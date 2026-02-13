"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Send } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createManualTrip } from "./actions";
import { PERSONNEL_ROLE_LABELS } from "@/lib/weekly-planner/constants";
import type {
    VehicleInfo,
    HubInfo,
    VenueInfo,
    PersonnelInfo,
    FormData,
} from "@/lib/weekly-planner/types";

interface ManualTripSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    weekNumber: number;
    seasonYear: number;
    formData: FormData;
}

interface StopInput {
    venueId: string;
    action: string;
    arrivalTime: string;
    departTime: string;
}

interface PersonnelInput {
    personId: string;
    roleOnTrip: string;
}

export function ManualTripSheet({
    open,
    onOpenChange,
    weekNumber,
    seasonYear,
    formData,
}: ManualTripSheetProps) {
    const router = useRouter();
    const [vehicleId, setVehicleId] = useState("");
    const [originHubId, setOriginHubId] = useState("");
    const [departTime, setDepartTime] = useState("");
    const [notes, setNotes] = useState("");
    const [stops, setStops] = useState<StopInput[]>([
        { venueId: "", action: "deliver", arrivalTime: "", departTime: "" },
    ]);
    const [personnel, setPersonnel] = useState<PersonnelInput[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addStop = useCallback(() => {
        setStops((prev) => [
            ...prev,
            {
                venueId: "",
                action: "deliver",
                arrivalTime: "",
                departTime: "",
            },
        ]);
    }, []);

    const removeStop = useCallback((index: number) => {
        setStops((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updateStop = useCallback(
        (index: number, field: keyof StopInput, value: string) => {
            setStops((prev) =>
                prev.map((s, i) =>
                    i === index ? { ...s, [field]: value } : s,
                ),
            );
        },
        [],
    );

    const addPersonnel = useCallback(() => {
        setPersonnel((prev) => [...prev, { personId: "", roleOnTrip: "driver" }]);
    }, []);

    const removePersonnel = useCallback((index: number) => {
        setPersonnel((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updatePersonnel = useCallback(
        (index: number, field: keyof PersonnelInput, value: string) => {
            setPersonnel((prev) =>
                prev.map((p, i) =>
                    i === index ? { ...p, [field]: value } : p,
                ),
            );
        },
        [],
    );

    const resetForm = useCallback(() => {
        setVehicleId("");
        setOriginHubId("");
        setDepartTime("");
        setNotes("");
        setStops([
            { venueId: "", action: "deliver", arrivalTime: "", departTime: "" },
        ]);
        setPersonnel([]);
    }, []);

    const handleSubmit = useCallback(async () => {
        // Validate
        if (!vehicleId) {
            toast.error("Please select a vehicle");
            return;
        }
        if (!originHubId) {
            toast.error("Please select an origin hub");
            return;
        }
        const validStops = stops.filter((s) => s.venueId);
        if (validStops.length === 0) {
            toast.error("Please add at least one stop");
            return;
        }

        setIsSubmitting(true);

        const result = await createManualTrip({
            weekNumber,
            seasonYear,
            vehicleId,
            originHubId,
            departTime: departTime || undefined,
            notes: notes || undefined,
            stops: validStops.map((s, i) => ({
                venueId: s.venueId,
                stopOrder: i + 1,
                action: s.action,
                arrivalTime: s.arrivalTime || undefined,
                departTime: s.departTime || undefined,
            })),
            assetIds: [],
            personnelIds: personnel
                .filter((p) => p.personId)
                .map((p) => ({
                    personId: p.personId,
                    roleOnTrip: p.roleOnTrip,
                })),
        });

        setIsSubmitting(false);

        if (result.success) {
            toast.success("Manual trip created");
            resetForm();
            onOpenChange(false);
            router.refresh();
        } else {
            toast.error(result.error ?? "Failed to create trip");
        }
    }, [
        vehicleId,
        originHubId,
        departTime,
        notes,
        stops,
        personnel,
        weekNumber,
        seasonYear,
        resetForm,
        onOpenChange,
        router,
    ]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Create Manual Trip</SheetTitle>
                    <SheetDescription>
                        Week {weekNumber} · Create a new trip manually
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Trip Basics */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Trip Details</h3>

                        <div className="space-y-2">
                            <Label>Vehicle</Label>
                            <Select
                                value={vehicleId}
                                onValueChange={setVehicleId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {formData.vehicles.map((v: VehicleInfo) => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Origin Hub</Label>
                            <Select
                                value={originHubId}
                                onValueChange={setOriginHubId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select hub..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {formData.hubs.map((h: HubInfo) => (
                                        <SelectItem key={h.id} value={h.id}>
                                            {h.name} ({h.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Departure Time (optional)</Label>
                            <Input
                                type="datetime-local"
                                value={departTime}
                                onChange={(e) => setDepartTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Stops */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">
                                Stops ({stops.length})
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addStop}
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Add Stop
                            </Button>
                        </div>

                        {stops.map((stop, idx) => (
                            <div
                                key={idx}
                                className="space-y-2 rounded-lg border p-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Stop {idx + 1}
                                    </span>
                                    {stops.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => removeStop(idx)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>

                                <Select
                                    value={stop.venueId}
                                    onValueChange={(v) =>
                                        updateStop(idx, "venueId", v)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select venue..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formData.venues.map(
                                            (v: VenueInfo) => (
                                                <SelectItem
                                                    key={v.id}
                                                    value={v.id}
                                                >
                                                    {v.name}
                                                    {v.city
                                                        ? ` (${v.city})`
                                                        : ""}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={stop.action}
                                    onValueChange={(v) =>
                                        updateStop(idx, "action", v)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="deliver">
                                            Deliver
                                        </SelectItem>
                                        <SelectItem value="pickup">
                                            Pickup
                                        </SelectItem>
                                        <SelectItem value="both">
                                            Both
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* Personnel */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">
                                Personnel ({personnel.length})
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addPersonnel}
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Add Person
                            </Button>
                        </div>

                        {personnel.map((p, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2"
                            >
                                <Select
                                    value={p.personId}
                                    onValueChange={(v) =>
                                        updatePersonnel(idx, "personId", v)
                                    }
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Person..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formData.personnel.map(
                                            (person: PersonnelInfo) => (
                                                <SelectItem
                                                    key={person.id}
                                                    value={person.id}
                                                >
                                                    {person.name}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={p.roleOnTrip}
                                    onValueChange={(v) =>
                                        updatePersonnel(idx, "roleOnTrip", v)
                                    }
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(
                                            PERSONNEL_ROLE_LABELS,
                                        ).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => removePersonnel(idx)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes (optional)</Label>
                        <textarea
                            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-16 resize-y"
                            placeholder="Trip notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-2 pb-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            <Send className="mr-2 h-4 w-4" />
                            {isSubmitting
                                ? "Creating..."
                                : "Create Trip"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                onOpenChange(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
