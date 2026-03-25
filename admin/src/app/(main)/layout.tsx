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
import { Badge } from '@/components/ui/badge'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext()

  if (!context || !context.isActive) {
    redirect('/login')
  }

  const navItems = getVisibleMainNav(context.role)
  const roleLabel = context.role.replace('_', ' ')

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/obsidian-academic-bg.svg')] bg-cover bg-center opacity-40" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.08),transparent_24%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[290px] shrink-0 border-r border-white/10 bg-slate-950/45 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
          <Link href="/dashboard" className="rounded-2xl border border-white/10 bg-slate-900/45 px-4 py-4 transition-colors hover:bg-white/5">
            <div className="font-serif text-3xl tracking-tight text-white">Crack<span className="text-sky-300">It</span></div>
            <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">Management Portal</div>
          </Link>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/35 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Logged in as</div>
            <div className="mt-2 text-lg font-semibold capitalize text-white">{roleLabel}</div>
            <Badge variant="outline" className="mt-3 border-sky-400/20 bg-sky-400/10 text-sky-300">Active workspace</Badge>
          </div>

          <div className="mt-6 flex-1">
            <NavLinks items={navItems} />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/35 p-4">
            <div className="text-sm font-medium text-white">Keep workflows tight</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">Use the role-aware shortcuts and analytics surfaces to move through the system without opening unrelated sections.</p>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/55 px-4 py-4 backdrop-blur-xl lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link href="/dashboard" className="font-serif text-2xl tracking-tight text-white lg:hidden">Crack<span className="text-sky-300">It</span></Link>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Luminous Void Workspace</p>
                <p className="mt-1 text-sm text-slate-300">Role-aware operations shell for analytics, tasks, and management.</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/profile" className="rounded-xl border border-white/10 bg-slate-900/45 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">
                  Profile
                </Link>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="relative flex-1 px-4 py-8 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
