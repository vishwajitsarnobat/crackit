// returns which pages should be rendered based on the role

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
                allowedRoles: ["ceo", "centre_head"],
            },
            {
                label: "Courses",
                href: "/manage/courses",
                icon: "BookOpen",
                allowedRoles: ["ceo", "centre_head"],
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
                label: "Teachers",
                href: "/manage/teachers",
                icon: "UserCheck",
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
