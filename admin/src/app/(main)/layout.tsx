/**
 * Main Layout
 * The authenticated shell layout, including the sidebar navigation, header, and main content area.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'
import { getCurrentUserContext } from '@/lib/auth/current-user'
import { getVisibleMainNav } from '@/lib/navigation/main-nav'
import { NavLinks } from '@/components/nav-links'
import { MobileNav } from '@/components/mobile-nav'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext()

  if (!context || !context.isActive || !context.role) {
    redirect('/login')
  }

  const navItems = getVisibleMainNav(context.role)
  const roleLabel = context.role.replace('_', ' ')

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/obsidian-academic-bg.svg')] bg-cover bg-center opacity-[0.04] dark:opacity-[0.07]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(4,231,254,0.08),transparent_22%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(4,231,254,0.08),transparent_20%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[300px] shrink-0 border-r border-secondary/10 bg-white/35 px-5 py-6 backdrop-blur-2xl dark:bg-black/12 lg:flex lg:flex-col">
          <Link href="/dashboard" className="glass-panel soft-ring rounded-[28px] px-5 py-5 transition-transform hover:-translate-y-0.5">
            <div className="font-serif text-[2rem] leading-none tracking-[-0.03em] text-secondary dark:text-primary">Crack<span className="text-primary">It</span></div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.26em] text-muted-foreground">Institute Management</div>
          </Link>

          <div className="glass-panel mt-6 rounded-[24px] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Access level</div>
            <div className="mt-2 text-lg font-semibold capitalize text-secondary dark:text-foreground">{roleLabel}</div>
            <Badge variant="outline" className="mt-3 border-primary/30 bg-primary/15 text-secondary dark:text-primary">Active workspace</Badge>
          </div>

          <div className="mt-6 flex-1">
            <NavLinks items={navItems} />
          </div>

          <div className="glass-panel mt-6 rounded-[24px] p-5">
            <div className="text-sm font-medium text-secondary dark:text-foreground">Daily focus</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Review attendance, batches, and fee movement from one place, then move into detailed pages only when needed.</p>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-secondary/10 bg-white/45 px-4 py-4 backdrop-blur-2xl dark:bg-[#101712]/60 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-[46rem]">
                <Link href="/dashboard" className="font-serif text-2xl tracking-tight text-secondary dark:text-primary lg:hidden">Crack<span className="text-primary">It</span></Link>
                <p className="text-[15px] font-semibold tracking-[-0.01em] text-secondary dark:text-primary">Institute Workspace</p>
                <p className="mt-1 max-w-[42rem] text-sm leading-6 text-muted-foreground">Manage academics, attendance, operations, and finance with a consistent coaching-first workflow.</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggle />
                <Link href="/profile" className="inline-flex h-10 items-center rounded-full border border-secondary/10 bg-white/55 px-4 text-sm font-medium text-secondary shadow-[0_10px_30px_rgba(74,106,71,0.08)] transition-colors hover:border-secondary/20 hover:bg-white/75 dark:bg-white/5 dark:text-foreground dark:hover:bg-white/10">
                  Profile
                </Link>
                <LogoutButton />
              </div>
            </div>
            <div className="mt-4 lg:hidden">
              <MobileNav items={navItems} />
            </div>
          </header>

          <main className="relative flex-1 px-4 py-8 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
