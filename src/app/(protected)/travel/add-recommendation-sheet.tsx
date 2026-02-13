"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TravelRecommendationWithDetails } from "@/lib/travel/types";
import { addTravelRecommendation } from "./actions";
import { toast } from "sonner";

interface AddRecommendationSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recommendations: TravelRecommendationWithDetails[];
    weekNumber: number;
}

export function AddRecommendationSheet({ open, onOpenChange, recommendations, weekNumber }: AddRecommendationSheetProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [type, setType] = useState("hotel");
    const [tripId, setTripId] = useState("");
    const [providerName, setProviderName] = useState("");
    const [price, setPrice] = useState("");
    const [rating, setRating] = useState("");
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [bookingUrl, setBookingUrl] = useState("");
    const [notes, setNotes] = useState("");

    const tripIds = [...new Set(recommendations.map((r) => r.trip_id))];

    const resetForm = () => {
        setType("hotel"); setTripId(""); setProviderName("");
        setPrice(""); setRating(""); setOrigin("");
        setDestination(""); setBookingUrl(""); setNotes("");
    };

    const handleSubmit = async () => {
        if (!tripId || !providerName) { toast.error("Trip and provider name are required"); return; }
        setIsSubmitting(true);
        const result = await addTravelRecommendation({
            trip_id: tripId, type, provider_name: providerName,
            price_estimate: price ? Number(price) : undefined,
            rating: rating ? Number(rating) : undefined,
            origin: origin || undefined, destination: destination || undefined,
            booking_url: bookingUrl || undefined, notes: notes || undefined,
        });
        if (result.success) {
            toast.success("Recommendation added");
            resetForm();
            onOpenChange(false);
            router.refresh();
        } else {
            toast.error(result.error ?? "Failed to add recommendation");
        }
        setIsSubmitting(false);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Add Recommendation</SheetTitle>
                    <SheetDescription>Add a new hotel or flight recommendation for week {weekNumber}.</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 p-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="hotel">Hotel</SelectItem>
                                <SelectItem value="flight">Flight</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="trip">Trip</Label>
                        <Select value={tripId} onValueChange={setTripId}>
                            <SelectTrigger id="trip"><SelectValue placeholder="Select trip" /></SelectTrigger>
                            <SelectContent>
                                {tripIds.map((id) => (<SelectItem key={id} value={id}>{id.slice(0, 8)}...</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="provider">Provider Name</Label>
                        <Input id="provider" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="e.g. Marriott, Delta" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price">Price Estimate</Label>
                        <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    {type === "hotel" && (
                        <div className="space-y-2">
                            <Label htmlFor="rating">Rating (1-5)</Label>
                            <Input id="rating" type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
                        </div>
                    )}
                    {type === "flight" && (<>
                        <div className="space-y-2">
                            <Label htmlFor="origin">Origin Airport</Label>
                            <Input id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. LAX" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dest">Destination Airport</Label>
                            <Input id="dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. DFW" />
                        </div>
                    </>)}
                    <div className="space-y-2">
                        <Label htmlFor="url">Booking URL</Label>
                        <Input id="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <textarea id="notes" className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                </div>
                <SheetFooter>
                    <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Recommendation"}</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
