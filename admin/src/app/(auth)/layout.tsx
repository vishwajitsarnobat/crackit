/**
 * Auth Layout
 * Provides the centered layout wrapper for authentication pages (Login, Signup, Reset Password).
 */

import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 lg:grid lg:grid-cols-[1fr_1.1fr]">
      <div className="pointer-events-none absolute inset-0 bg-[url('/obsidian-academic-bg.svg')] bg-cover bg-center opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.08),transparent_24%)]" />

      <div className="relative hidden border-r border-white/10 bg-slate-950/45 p-10 backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
        <div>
          <Link href="/login" className="font-serif text-3xl tracking-tight text-white">
            Crack<span className="text-sky-300">It</span>
          </Link>
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">Luminous Void Access</p>
        </div>

        <div className="space-y-8">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/45 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Management Interface</p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-white">Enter the CrackIt workspace</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">Continue into the academic operations shell used for dashboards, analytics, enrollments, tasks, reports, and finance workflows.</p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/35 px-4 py-4 text-sm text-slate-300">Role-aware access control with approvals and scoped operations.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/35 px-4 py-4 text-sm text-slate-300">Unified dark-glass workspace across admin, analytics, tasks, and reports.</div>
          </div>
        </div>

        <p className="text-xs text-slate-500">© {new Date().getFullYear()} CrackIt Institute</p>
      </div>

      <div className="relative flex min-h-screen flex-col">
        <div className="flex items-center px-6 pt-6 lg:hidden">
          <Link href="/login" className="font-serif text-2xl tracking-tight text-white">
            Crack<span className="text-sky-300">It</span>
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
