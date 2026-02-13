"use client";

import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SPORT_TYPE_LABELS, SPORT_TYPE_COLORS } from "@/lib/customers/constants";
import { fetchCustomerDetailAction } from "./actions";
import { VenueSection } from "./venue-section";
import { ContractSection } from "./contract-section";
import { GameSection } from "./game-section";
import type { CustomerDetail } from "@/lib/customers/types";

interface CustomerDetailSheetProps {
    customerId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CustomerDetailSheet({
    customerId,
    open,
    onOpenChange,
}: CustomerDetailSheetProps) {
    const [detail, setDetail] = useState<CustomerDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!customerId || !open) {
            setDetail(null);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetchCustomerDetailAction(customerId).then((result) => {
            if (!cancelled) {
                setDetail(result.data);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [customerId, open]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>
                        {loading ? <Skeleton className="h-6 w-48" /> : (detail?.name ?? "Customer")}
                    </SheetTitle>
                    <SheetDescription>
                        {loading ? (
                            <Skeleton className="h-4 w-24" />
                        ) : detail ? (
                            <Badge
                                variant="secondary"
                                className={SPORT_TYPE_COLORS[detail.sport_type]}
                            >
                                {SPORT_TYPE_LABELS[detail.sport_type]}
                            </Badge>
                        ) : null}
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="space-y-4 p-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : detail ? (
                    <div className="space-y-6 px-4 pb-4">
                        {/* Contact info */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                Contact Information
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">Contact</div>
                                <div>{detail.primary_contact ?? "N/A"}</div>
                                <div className="text-muted-foreground">Email</div>
                                <div>{detail.contact_email ?? "N/A"}</div>
                                <div className="text-muted-foreground">Phone</div>
                                <div>{detail.contact_phone ?? "N/A"}</div>
                                <div className="text-muted-foreground">Timezone</div>
                                <div>{detail.timezone ?? "N/A"}</div>
                                <div className="text-muted-foreground">Assets</div>
                                <div>{detail.asset_count} assigned</div>
                            </div>
                        </div>

                        <Separator />
                        <VenueSection venues={detail.venues} customerId={detail.id} />

                        <Separator />
                        <ContractSection contracts={detail.contracts} />

                        <Separator />
                        <GameSection games={detail.upcoming_games} />

                        {detail.notes ? (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Notes
                                    </h3>
                                    <p className="text-sm">{detail.notes}</p>
                                </div>
                            </>
                        ) : null}
                    </div>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
