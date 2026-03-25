/**
 * Auth Layout
 * Provides the centered layout wrapper for authentication pages (Login, Signup, Reset Password).
 */

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground lg:grid lg:grid-cols-[1fr_1.1fr]">
      <div className="pointer-events-none absolute inset-0 bg-[url('/obsidian-academic-bg.svg')] bg-cover bg-center opacity-[0.04] dark:opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.26),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(4,231,254,0.08),transparent_20%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(4,231,254,0.08),transparent_16%)]" />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="relative hidden border-r border-secondary/10 bg-white/30 p-10 backdrop-blur-2xl dark:bg-black/12 lg:flex lg:flex-col lg:justify-between">
        <div>
          <Link href="/login" className="font-serif text-3xl tracking-tight text-secondary dark:text-primary">
            Crack<span className="text-primary">It</span>
          </Link>
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">Institute Access</p>
        </div>

        <div className="space-y-8">
          <div className="glass-panel rounded-[32px] p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Management Interface</p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-secondary dark:text-primary">Welcome to your institute workspace</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">Access the admin system used for attendance, batches, fee collection, reports, and daily coaching operations.</p>
          </div>
          <div className="grid gap-3">
            <div className="glass-panel rounded-2xl px-4 py-4 text-sm text-muted-foreground">Role-based access keeps teachers, centre heads, accountants, and leadership focused on the right work.</div>
            <div className="glass-panel rounded-2xl px-4 py-4 text-sm text-muted-foreground">Consistent light and dark themes support long daily use across analytics, tasks, and management screens.</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CrackIt Institute</p>
      </div>

      <div className="relative flex min-h-screen flex-col">
        <div className="flex items-center px-6 pt-6 lg:hidden">
          <Link href="/login" className="font-serif text-2xl tracking-tight text-secondary dark:text-primary">
            Crack<span className="text-primary">It</span>
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
