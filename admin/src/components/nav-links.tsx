'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, TrendingUp, CalendarCheck, ShieldCheck } from 'lucide-react'

type NavItem = { label: string; href: string; icon: string }

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    LayoutDashboard,
    TrendingUp,
    CalendarCheck,
    ShieldCheck,
}

export function NavLinks({ items }: { items: NavItem[] }) {
    const pathname = usePathname()

    return (
        <nav className="flex items-center gap-1">
            {items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = ICON_MAP[item.icon]
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${active
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                    >
                        {Icon && <Icon className="h-4 w-4" />}
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}
