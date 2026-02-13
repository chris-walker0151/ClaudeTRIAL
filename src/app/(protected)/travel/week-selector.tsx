"use client";

import { useRouter } from "next/navigation";
import { WEEKS_IN_SEASON } from "@/lib/constants";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface WeekSelectorProps {
    weekNumber: number;
}

export function WeekSelector({ weekNumber }: WeekSelectorProps) {
    const router = useRouter();

    const handleWeekChange = (value: string) => {
        router.push("/travel?week=" + value);
    };

    return (
        <div className="flex items-center gap-3">
            <Label htmlFor="week-select" className="text-sm font-medium">
                Week
            </Label>
            <Select
                value={String(weekNumber)}
                onValueChange={handleWeekChange}
            >
                <SelectTrigger id="week-select" className="w-36">
                    <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                    {Array.from({ length: WEEKS_IN_SEASON + 1 }, (_, i) => i).map(
                        (w) => (
                            <SelectItem key={w} value={String(w)}>
                                {w === 0 ? "Pre-Season" : `Week ${w}`}
                            </SelectItem>
                        ),
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
