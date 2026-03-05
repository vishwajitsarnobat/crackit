import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { LogoutButton } from '@/components/logout-button'
import { getCurrentUserContext } from '@/lib/auth/current-user'
import { getVisibleMainNav } from '@/lib/navigation/main-nav'
import { NavLinks } from '@/components/nav-links'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext()

  if (!context || !context.isActive) {
    redirect('/login')
  }

  const navItems = getVisibleMainNav(context.role)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-serif text-xl tracking-tight">
              Crack<span className="text-primary">It</span>
            </Link>
            <NavLinks items={navItems} />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        {/* Accent strip */}
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
