"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CalendarDays,
    Package,
    Users,
    UserCog,
    Truck,
    Plane,
    BarChart3,
    Upload,
    Settings,
} from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
} from "@/components/ui/sidebar";

const iconMap = {
    CalendarDays,
    Package,
    Users,
    UserCog,
    Truck,
    Plane,
    BarChart3,
    Upload,
    Settings,
} as const;

const navItems = [
    { label: "Weekly Planner", href: "/weekly-planner", icon: "CalendarDays" as const },
    { label: "Assets", href: "/assets", icon: "Package" as const },
    { label: "Customers", href: "/customers", icon: "Users" as const },
    { label: "Personnel", href: "/personnel", icon: "UserCog" as const },
    { label: "Fleet", href: "/fleet", icon: "Truck" as const },
    { label: "Travel", href: "/travel", icon: "Plane" as const },
    { label: "Season Overview", href: "/season-overview", icon: "BarChart3" as const },
    { label: "Import", href: "/import", icon: "Upload" as const },
    { label: "Settings", href: "/settings", icon: "Settings" as const },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar>
            <SidebarHeader className="border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
                        DS
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Dragon Seats</p>
                        <p className="text-xs text-muted-foreground">Control Tower</p>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Operations</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.slice(0, 7).map((item) => {
                                const Icon = iconMap[item.icon];
                                const isActive = pathname === item.href;
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                        >
                                            <Link href={item.href}>
                                                <Icon className="h-4 w-4" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>System</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.slice(7).map((item) => {
                                const Icon = iconMap[item.icon];
                                const isActive = pathname === item.href;
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                        >
                                            <Link href={item.href}>
                                                <Icon className="h-4 w-4" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                <p className="text-xs text-muted-foreground">
                    2025 Season
                </p>
            </SidebarFooter>
        </Sidebar>
    );
}
