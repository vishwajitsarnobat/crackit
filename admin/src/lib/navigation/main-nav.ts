/**
 * Navigation Configuration
 * - MainNavItem type           — shape for nav items with optional subItems
 * - MAIN_NAV_ITEMS             — full nav tree (Dashboard, Analytics, Manage, Tasks, Reports)
 * - getVisibleMainNav(role)    — filters nav items by the user's AppRole
 * Each item specifies allowedRoles and an icon key that maps to lucide-react in nav-links.tsx.
 */

import type {AppRole} from "@/lib/auth/current-user";

export type MainNavItem = {
    label: string;
    href?: string;
    icon: string;
    allowedRoles: AppRole[];
    subItems?: {
        label: string;
        href: string;
        icon: string;
        allowedRoles: AppRole[];
    }[];
};

export const MAIN_NAV_ITEMS: MainNavItem[] = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
        allowedRoles: ["ceo", "centre_head", "teacher", "accountant"],
    },
    {
        label: "Analytics",
        icon: "BarChart2",
        allowedRoles: ["ceo", "centre_head", "teacher", "accountant"],
        subItems: [
            {
                label: "Performance",
                href: "/analytics/performance",
                icon: "TrendingUp",
                allowedRoles: ["ceo", "centre_head", "teacher"],
            },
            {
                label: "Attendance",
                href: "/analytics/attendance",
                icon: "CalendarCheck",
                allowedRoles: ["ceo", "centre_head", "teacher"],
            },
            {
                label: "Staff Attendance",
                href: "/analytics/staff-attendance",
                icon: "UserCheck",
                allowedRoles: ["ceo", "centre_head", "teacher"],
            },
            {
                label: "Financials",
                href: "/analytics/financial",
                icon: "Wallet",
                allowedRoles: ["ceo", "centre_head", "accountant"],
            },
        ],
    },
    {
        label: "Manage",
        icon: "Settings",
        allowedRoles: ["ceo", "centre_head"],
        subItems: [
            {
                label: "Centres",
                href: "/manage/centres",
                icon: "Building",
                allowedRoles: ["ceo"],
            },
            {
                label: "Batches",
                href: "/manage/batches",
                icon: "Layers",
                allowedRoles: ["ceo", "centre_head"],
            },
            {
                label: "Enrollments",
                href: "/manage/enrollments",
                icon: "UserPlus",
                allowedRoles: ["ceo", "centre_head"],
            },
            {
                label: "Reward Points",
                href: "/manage/reward-points",
                icon: "Gift",
                allowedRoles: ["ceo", "centre_head"],
            },
        ],
    },
    {
        label: "Tasks",
        icon: "ClipboardEdit",
        allowedRoles: ["centre_head", "teacher", "accountant"],
        subItems: [
            {
                label: "Attendance",
                href: "/tasks/attendance",
                icon: "CalendarCheck",
                allowedRoles: ["teacher"],
            },
            {
                label: "Marks Entry",
                href: "/tasks/marks",
                icon: "FileCheck",
                allowedRoles: ["teacher"],
            },
            {
                label: "Content Library",
                href: "/tasks/content",
                icon: "Library",
                allowedRoles: ["teacher"],
            },
            {
                label: "Expenses",
                href: "/tasks/expenses",
                icon: "Receipt",
                allowedRoles: ["centre_head", "accountant"],
            },
            {
                label: "Salaries",
                href: "/tasks/salaries",
                icon: "Banknote",
                allowedRoles: ["centre_head", "accountant"],
            },
            {
                label: "Fee Management",
                href: "/tasks/fees",
                icon: "Wallet",
                allowedRoles: ["centre_head", "accountant"],
            },
            {
                label: "Staff Attendance",
                href: "/tasks/staff-attendance",
                icon: "UserCheck",
                allowedRoles: ["centre_head"],
            },
        ],
    },
    {
        label: "Reports",
        icon: "BarChart2",
        allowedRoles: ["ceo", "centre_head"],
        subItems: [
            {
                label: "Student Profile",
                href: "/reports/student-profile",
                icon: "UserCheck",
                allowedRoles: ["ceo", "centre_head"],
            },
            {
                label: "Attendance",
                href: "/reports/attendance",
                icon: "CalendarCheck",
                allowedRoles: ["ceo", "centre_head"],
            },
            {
                label: "Performance",
                href: "/reports/performance",
                icon: "TrendingUp",
                allowedRoles: ["ceo", "centre_head"],
            },
        ],
    },
    {
        label: "Approvals",
        href: "/approvals",
        icon: "ShieldCheck",
        allowedRoles: ["ceo", "centre_head"],
    },
];


export function getVisibleMainNav(role: AppRole | null) {
    if (!role) return []; // even if some non logged in user tries to get, we return nothing
    return MAIN_NAV_ITEMS.filter((item) =>
        item.allowedRoles.includes(role),
    ).map((item) => {
        if (item.subItems) {
            return {
                ...item, // copy item as it is
                subItems: item.subItems.filter((sub) =>
                    sub.allowedRoles.includes(role),
                ), // overwrite subItems
            };
        }
        return item;
    });
}
