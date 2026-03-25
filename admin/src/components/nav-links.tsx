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
        <nav className="flex flex-col items-stretch gap-1.5">
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
                                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all outline-none ${
                                         isActive
                                            ? "border border-sky-400/20 bg-sky-500/12 text-sky-300 shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_12px_24px_rgba(2,132,199,0.12)]"
                                            : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100"
                                     }`}
                                 >
                                     {Icon && <Icon className="h-4 w-4" />}
                                     {item.label}
                                    <ChevronDown className="ml-auto h-3 w-3 opacity-50" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 border-white/10 bg-slate-950/95 p-2 text-slate-200 backdrop-blur-xl" align="start">
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
                                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                                                    isSubActive
                                                        ? "bg-sky-500/12 text-sky-300 font-medium"
                                                        : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
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
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                            active
                                ? "border border-sky-400/20 bg-sky-500/12 text-sky-300 shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_12px_24px_rgba(2,132,199,0.12)]"
                                : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100"
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
