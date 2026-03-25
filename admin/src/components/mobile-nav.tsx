'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MainNavItem } from '@/lib/navigation/main-nav'

function flattenNav(items: MainNavItem[]) {
  return items.flatMap((item) => {
    if (item.href) return [{ label: item.label, href: item.href }]
    return (item.subItems ?? []).map((subItem) => ({ label: subItem.label, href: subItem.href }))
  })
}

export function MobileNav({ items }: { items: MainNavItem[] }) {
  const pathname = usePathname()
  const links = flattenNav(items)

  return (
    <div className="overflow-x-auto pb-1 lg:hidden">
      <nav className="flex min-w-max gap-2">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={active
                ? 'rounded-full border border-primary/30 bg-primary/18 px-4 py-2 text-sm font-medium text-secondary dark:text-primary'
                : 'rounded-full border border-secondary/10 bg-white/55 px-4 py-2 text-sm font-medium text-muted-foreground dark:bg-white/[0.04] dark:hover:text-foreground'}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
