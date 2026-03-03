import type { AppRole } from '@/lib/auth/current-user'

export type MainNavItem = {
  label: string
  href: string
  allowedRoles: AppRole[]
}

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    allowedRoles: ['ceo', 'centre_head', 'teacher', 'accountant'],
  },
  {
    label: 'Performance',
    href: '/analytics/performance',
    allowedRoles: ['ceo', 'centre_head', 'teacher'],
  },
  {
    label: 'Approvals',
    href: '/approvals',
    allowedRoles: ['ceo', 'centre_head'],
  },
]

export function getVisibleMainNav(role: AppRole | null) {
  if (!role) return []
  return MAIN_NAV_ITEMS.filter(item => item.allowedRoles.includes(role))
}
