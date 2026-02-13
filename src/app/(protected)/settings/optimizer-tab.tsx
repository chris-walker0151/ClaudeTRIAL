"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OptimizerSetting } from "@/lib/settings/types";

interface OptimizerTabProps {
    settings: OptimizerSetting[];
}

export function OptimizerTab({ settings }: OptimizerTabProps) {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Optimizer Configuration</CardTitle>
                    <CardDescription>
                        These settings control the route optimization engine.
                        Values are configured via environment variables.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {settings.map((setting, index) => (
                            <div key={setting.key}>
                                {index > 0 && <Separator />}
                                <div className="flex items-center justify-between py-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {setting.label}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {setting.description}
                                        </p>
                                    </div>
                                    <Badge variant="secondary">
                                        {String(setting.value)}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
                These values are derived from environment variables and cannot be
                edited from the UI. Contact your administrator to change optimizer
                settings.
            </p>
        </div>
    );
}

