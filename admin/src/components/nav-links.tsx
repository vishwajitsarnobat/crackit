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
    Gift,
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
    Gift,
};

export function NavLinks({items}: {items: MainNavItem[]}) {
    const pathname = usePathname();

    return (
        <nav className="flex flex-col items-stretch gap-2">
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
                                    className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-sm font-medium transition-all outline-none ${
                                          isActive
                                             ? "border border-primary/25 bg-primary/20 text-secondary shadow-[0_12px_30px_rgba(74,106,71,0.10)] dark:text-primary"
                                             : "border border-transparent text-muted-foreground hover:border-secondary/10 hover:bg-white/50 hover:text-secondary dark:hover:bg-white/5 dark:hover:text-foreground"
                                      }`}
                                  >
                                      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isActive ? 'bg-white/70 text-secondary dark:bg-black/20 dark:text-primary' : 'bg-white/55 text-secondary/80 dark:bg-white/5 dark:text-muted-foreground'}`}>
                                        {Icon && <Icon className="h-4 w-4" />}
                                      </span>
                                      {item.label}
                                     <ChevronDown className="ml-auto h-3 w-3 opacity-50" />
                                 </button>
                             </PopoverTrigger>
                             <PopoverContent className="w-60 border-secondary/10 bg-white/90 p-2 text-foreground shadow-[0_22px_44px_rgba(74,106,71,0.14)] backdrop-blur-xl dark:bg-[#131b15]/95 dark:text-foreground" align="start">
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
                                                 className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                                                     isSubActive
                                                         ? "bg-primary/18 text-secondary font-medium dark:text-primary"
                                                         : "text-muted-foreground hover:bg-primary/10 hover:text-secondary dark:hover:text-foreground"
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
                    className={`flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-sm font-medium transition-all ${
                             active
                                ? "border border-primary/25 bg-primary/20 text-secondary shadow-[0_12px_30px_rgba(74,106,71,0.10)] dark:text-primary"
                                : "border border-transparent text-muted-foreground hover:border-secondary/10 hover:bg-white/50 hover:text-secondary dark:hover:bg-white/5 dark:hover:text-foreground"
                         }`}
                    >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? 'bg-white/70 text-secondary dark:bg-black/20 dark:text-primary' : 'bg-white/55 text-secondary/80 dark:bg-white/5 dark:text-muted-foreground'}`}>
                            {Icon && <Icon className="h-4 w-4" />}
                        </span>
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
