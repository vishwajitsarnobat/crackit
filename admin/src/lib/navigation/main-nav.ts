import type { AppRole } from '@/lib/auth/current-user'

export type MainNavItem = {
  label: string
  href: string
  icon: string
  allowedRoles: AppRole[]
}

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    allowedRoles: ['ceo', 'centre_head', 'teacher', 'accountant'],
  },
  {
    label: 'Performance',
    href: '/analytics/performance',
    icon: 'TrendingUp',
    allowedRoles: ['ceo', 'centre_head', 'teacher'],
  },
  {
    label: 'Attendance',
    href: '/analytics/attendance',
    icon: 'CalendarCheck',
    allowedRoles: ['ceo', 'centre_head', 'teacher'],
  },
  {
    label: 'Staff Attendance',
    href: '/analytics/staff-attendance',
    icon: 'UserCheck',
    allowedRoles: ['ceo', 'centre_head', 'teacher'],
  },
  {
    label: 'Financials',
    href: '/analytics/financial',
    icon: 'Wallet',
    allowedRoles: ['ceo', 'centre_head', 'accountant'],
  },
  {
    label: 'Approvals',
    href: '/approvals',
    icon: 'ShieldCheck',
    allowedRoles: ['ceo', 'centre_head'],
  },
]

export function getVisibleMainNav(role: AppRole | null) {
  if (!role) return []
  return MAIN_NAV_ITEMS.filter(item => item.allowedRoles.includes(role))
}
