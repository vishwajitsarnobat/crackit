"use client";

/**
 * Navigation Links Component
 * Determines and renders the sidebar navigation items based on the user's role.
 * Organizes links categorically (Dashboards, Manage, Reports, Roles, Settings).
 */

import Link from "next/link";
import {usePathname} from "next/navigation";
import {
    LayoutDashboard,
    TrendingUp,
    CalendarCheck,
    ShieldCheck,
    Wallet,
    UserCheck,
    Building,
    BookOpen,
    Layers,
    UserPlus,
    Settings,
    ChevronDown,
    BarChart2,
    ClipboardEdit,
    FileCheck,
    Library,
    Receipt,
    Banknote,
} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import type {MainNavItem} from "@/lib/navigation/main-nav";

const ICON_MAP: Record<string, React.ComponentType<{className?: string}>> = {
    LayoutDashboard,
    TrendingUp,
    CalendarCheck,
    ShieldCheck,
    Wallet,
    UserCheck,
    Building,
    BookOpen,
    Layers,
    UserPlus,
    Settings,
    BarChart2,
    ClipboardEdit,
    FileCheck,
    Library,
    Receipt,
    Banknote,
};

export function NavLinks({items}: {items: MainNavItem[]}) {
    const pathname = usePathname();

    return (
        <nav className="flex items-center gap-1">
            {items.map((item) => {
                const Icon = ICON_MAP[item.icon];

                if (item.subItems && item.subItems.length > 0) {
                    const isActive = item.subItems.some(
                        (sub) =>
                            pathname === sub.href ||
                            pathname.startsWith(sub.href + "/"),
                    );
                    return (
                        <Popover key={item.label}>
                            <PopoverTrigger asChild>
                                <button
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all outline-none ${
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    {Icon && <Icon className="h-4 w-4" />}
                                    {item.label}
                                    <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="start">
                                <div className="flex flex-col space-y-1">
                                    {item.subItems.map((subItem) => {
                                        const SubIcon = ICON_MAP[subItem.icon];
                                        const isSubActive =
                                            pathname === subItem.href ||
                                            pathname.startsWith(
                                                subItem.href + "/",
                                            );
                                        return (
                                            <Link
                                                key={subItem.href}
                                                href={subItem.href}
                                                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                                                    isSubActive
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                }`}
                                            >
                                                {SubIcon && (
                                                    <SubIcon className="h-4 w-4" />
                                                )}
                                                {subItem.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>
                    );
                }

                if (!item.href) return null;

                const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                            active
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                        {Icon && <Icon className="h-4 w-4" />}
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
