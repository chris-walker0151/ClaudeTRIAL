"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { CONTRACT_TYPE_LABELS } from "@/lib/customers/constants";
import { ASSET_TYPE_LABELS } from "@/lib/weekly-planner/constants";
import type { ContractWithItems } from "@/lib/customers/types";
import type { AssetType } from "@/lib/weekly-planner/types";

interface ContractSectionProps {
    contracts: ContractWithItems[];
}

export function ContractSection({ contracts }: ContractSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggle = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contracts ({contracts.length})
            </h3>

            {contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contracts.</p>
            ) : (
                <div className="space-y-2">
                    {contracts.map((contract) => (
                        <div key={contract.id} className="rounded-md border">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 px-3 py-2 h-auto"
                                onClick={() => toggle(contract.id)}
                            >
                                {expandedId === contract.id ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                )}
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <div className="flex-1 text-left">
                                    <span className="text-sm font-medium">
                                        {CONTRACT_TYPE_LABELS[contract.contract_type] ?? contract.contract_type}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                        {contract.start_date} to {contract.end_date}
                                    </span>
                                </div>
                                <Badge variant={contract.status === "active" ? "default" : "secondary"}>
                                    {contract.status}
                                </Badge>
                            </Button>
                            {expandedId === contract.id && contract.items.length > 0 && (
                                <div className="border-t px-3 py-2 space-y-1">
                                    {contract.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between text-sm">
                                            <span>
                                                {ASSET_TYPE_LABELS[item.asset_type as AssetType] ?? item.asset_type}
                                                {item.model_version && (
                                                    <span className="text-muted-foreground ml-1">
                                                        ({item.model_version})
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-muted-foreground">
                                                qty: {item.quantity}
                                                {item.branding_spec && " | " + item.branding_spec}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
