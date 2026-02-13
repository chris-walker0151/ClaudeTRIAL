"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LogOut } from "lucide-react";

export function Topbar() {
    const router = useRouter();
    const supabase = createClient();

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }

    return (
        <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1" />
            <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground"
            >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
            </Button>
        </header>
    );
}
