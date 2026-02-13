import { Users } from "lucide-react";
import { fetchCustomersList } from "@/lib/customers/queries";
import { CustomersShell } from "./customers-shell";

export default async function CustomersPage() {
    const customers = await fetchCustomersList();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Customers</h1>
                    <p className="text-muted-foreground">
                        Manage customer accounts, venues, and contracts
                    </p>
                </div>
            </div>
            <CustomersShell customers={customers} />
        </div>
    );
}
