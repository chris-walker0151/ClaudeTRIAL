import { Upload } from "lucide-react";
import { ImportWizard } from "./import-wizard";

export default function ImportPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Upload className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Import Data</h1>
                    <p className="text-muted-foreground">
                        Upload CSV files for customers, assets, schedules, and
                        more
                    </p>
                </div>
            </div>
            <ImportWizard />
        </div>
    );
}
