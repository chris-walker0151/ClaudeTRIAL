import { Package } from "lucide-react";
import { fetchAssetsList } from "@/lib/assets/queries";
import { AssetsShell } from "./assets-shell";

export default async function AssetsPage() {
    const pageData = await fetchAssetsList();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Asset Tracker</h1>
                    <p className="text-muted-foreground">
                        Track {pageData.assets.length} assets across{" "}
                        {pageData.hubs.length} hubs
                    </p>
                </div>
            </div>
            <AssetsShell data={pageData} />
        </div>
    );
}
