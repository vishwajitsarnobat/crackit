import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { LogoutButton } from '@/components/logout-button'
import { getCurrentUserContext } from '@/lib/auth/current-user'
import { getVisibleMainNav } from '@/lib/navigation/main-nav'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext()

  if (!context || !context.isActive) {
    redirect('/login')
  }

  const navItems = getVisibleMainNav(context.role)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-serif text-xl tracking-tight">
              Crack<span className="text-accent">It</span>
            </Link>
            <nav className="flex items-center gap-4 font-serif text-xl tracking-tight text-muted-foreground">
              {navItems.map(item => (
                <Link key={item.href} href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
