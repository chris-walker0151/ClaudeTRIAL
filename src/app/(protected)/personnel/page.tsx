import { UserCog } from "lucide-react";
import { SEASON_YEAR } from "@/lib/constants";
import { fetchPersonnelData } from "@/lib/personnel/queries";
import { PersonnelShell } from "./personnel-shell";

export default async function PersonnelPage() {
    const data = await fetchPersonnelData(SEASON_YEAR);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <UserCog className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Personnel</h1>
                    <p className="text-muted-foreground">
                        Manage staff assignments, availability, and scheduling
                    </p>
                </div>
            </div>
            <PersonnelShell data={data} />
        </div>
    );
}
