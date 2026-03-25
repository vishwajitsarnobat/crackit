import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  ClipboardList,
  FileText,
  Gift,
  Layers3,
  ShieldCheck,
  Wallet,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getVisibleMainNav } from '@/lib/navigation/main-nav'
import { getCurrentUserContext, type AppRole } from '@/lib/auth/current-user'

type QuickAction = {
  href: string
  label: string
  description: string
  icon: typeof BarChart3
  accent: string
}

const ROLE_COPY: Record<Exclude<AppRole, 'student'>, { title: string; subtitle: string; stats: { label: string; value: string }[] }> = {
  ceo: {
    title: 'Executive command centre',
    subtitle: 'Track approvals, centre operations, analytics, and system-wide momentum from one place.',
    stats: [
      { label: 'Visibility', value: 'All centres' },
      { label: 'Control', value: 'Rules + governance' },
      { label: 'Focus', value: 'Approvals and reports' },
    ],
  },
  centre_head: {
    title: 'Centre operations cockpit',
    subtitle: 'Manage batches, enrollments, finance tasks, and staff operations for your centre without context switching.',
    stats: [
      { label: 'Scope', value: 'Own centre' },
      { label: 'Control', value: 'Batches + enrollments' },
      { label: 'Focus', value: 'Fees, salary, staff' },
    ],
  },
  teacher: {
    title: 'Teaching workflow hub',
    subtitle: 'Jump into attendance, marks, and content work for assigned batches, then review student performance.',
    stats: [
      { label: 'Scope', value: 'Assigned batches' },
      { label: 'Control', value: 'Tasks only' },
      { label: 'Focus', value: 'Attendance + marks' },
    ],
  },
  accountant: {
    title: 'Finance operations desk',
    subtitle: 'Move quickly between expenses, fees, salary records, and centre financial analytics.',
    stats: [
      { label: 'Scope', value: 'Own centre' },
      { label: 'Control', value: 'Expense + payment flows' },
      { label: 'Focus', value: 'Collections and payouts' },
    ],
  },
}

const ACTION_LIBRARY: Record<string, QuickAction> = {
  '/approvals': {
    href: '/approvals',
    label: 'Approvals',
    description: 'Review pending, approved, and rejected requests.',
    icon: ShieldCheck,
    accent: 'from-sky-500/25 to-sky-400/5',
  },
  '/analytics/attendance': {
    href: '/analytics/attendance',
    label: 'Attendance Analytics',
    description: 'Explore day, month, and yearly attendance views.',
    icon: CalendarCheck2,
    accent: 'from-cyan-500/25 to-cyan-400/5',
  },
  '/analytics/performance': {
    href: '/analytics/performance',
    label: 'Performance Analytics',
    description: 'Compare marks, rank trends, and consistency.',
    icon: BarChart3,
    accent: 'from-emerald-500/25 to-emerald-400/5',
  },
  '/analytics/staff-attendance': {
    href: '/analytics/staff-attendance',
    label: 'Staff Attendance Analytics',
    description: 'Monitor present, absent, and partial teacher attendance.',
    icon: BriefcaseBusiness,
    accent: 'from-indigo-500/25 to-indigo-400/5',
  },
  '/analytics/financial': {
    href: '/analytics/financial',
    label: 'Financial Analytics',
    description: 'Track centre expenses, salary summaries, and fee summaries.',
    icon: Wallet,
    accent: 'from-amber-500/25 to-amber-400/5',
  },
  '/manage/centres': {
    href: '/manage/centres',
    label: 'Centre Management',
    description: 'Add, edit, activate, or deactivate centres.',
    icon: Building2,
    accent: 'from-fuchsia-500/25 to-fuchsia-400/5',
  },
  '/manage/batches': {
    href: '/manage/batches',
    label: 'Batch Management',
    description: 'Review and maintain active academic batches.',
    icon: Layers3,
    accent: 'from-violet-500/25 to-violet-400/5',
  },
  '/manage/enrollments': {
    href: '/manage/enrollments',
    label: 'Enrollment Management',
    description: 'Assign students and teachers with fee or salary setup.',
    icon: ClipboardList,
    accent: 'from-blue-500/25 to-blue-400/5',
  },
  '/manage/reward-points': {
    href: '/manage/reward-points',
    label: 'Reward Points',
    description: 'Define rules and adjust student reward balances.',
    icon: Gift,
    accent: 'from-rose-500/25 to-rose-400/5',
  },
  '/tasks/attendance': {
    href: '/tasks/attendance',
    label: 'Student Attendance Task',
    description: 'Mark daily attendance for assigned batches.',
    icon: CalendarCheck2,
    accent: 'from-sky-500/25 to-sky-400/5',
  },
  '/tasks/marks': {
    href: '/tasks/marks',
    label: 'Exam Marks Task',
    description: 'Create exams and enter marks in one sheet.',
    icon: FileText,
    accent: 'from-emerald-500/25 to-emerald-400/5',
  },
  '/tasks/content': {
    href: '/tasks/content',
    label: 'Content Library Task',
    description: 'Upload links, notes, and class content per batch.',
    icon: BookOpenCheck,
    accent: 'from-indigo-500/25 to-indigo-400/5',
  },
  '/tasks/expenses': {
    href: '/tasks/expenses',
    label: 'Expenses Task',
    description: 'Log append-only monthly expense entries.',
    icon: Wallet,
    accent: 'from-amber-500/25 to-amber-400/5',
  },
  '/tasks/salaries': {
    href: '/tasks/salaries',
    label: 'Salary Task',
    description: 'Review pending salaries and record payouts.',
    icon: BriefcaseBusiness,
    accent: 'from-violet-500/25 to-violet-400/5',
  },
  '/tasks/fees': {
    href: '/tasks/fees',
    label: 'Fees Task',
    description: 'Collect fee payments and apply reward offsets.',
    icon: Wallet,
    accent: 'from-cyan-500/25 to-cyan-400/5',
  },
  '/tasks/staff-attendance': {
    href: '/tasks/staff-attendance',
    label: 'Staff Attendance Task',
    description: 'Mark teacher present, absent, or partial attendance.',
    icon: BriefcaseBusiness,
    accent: 'from-rose-500/25 to-rose-400/5',
  },
  '/reports/student-profile': {
    href: '/reports/student-profile',
    label: 'Student Profile Reports',
    description: 'Generate PDF-ready student profile documents.',
    icon: FileText,
    accent: 'from-blue-500/25 to-blue-400/5',
  },
  '/reports/attendance': {
    href: '/reports/attendance',
    label: 'Attendance Reports',
    description: 'Export attendance summaries with analytics.',
    icon: CalendarCheck2,
    accent: 'from-cyan-500/25 to-cyan-400/5',
  },
  '/reports/performance': {
    href: '/reports/performance',
    label: 'Performance Reports',
    description: 'Export performance reports with comparative detail.',
    icon: BarChart3,
    accent: 'from-emerald-500/25 to-emerald-400/5',
  },
}

function pickPriorityActions(role: Exclude<AppRole, 'student'>, visibleHrefs: string[]) {
  const priorities: Record<Exclude<AppRole, 'student'>, string[]> = {
    ceo: ['/approvals', '/manage/centres', '/manage/reward-points', '/analytics/financial', '/reports/student-profile', '/manage/enrollments'],
    centre_head: ['/manage/enrollments', '/tasks/fees', '/tasks/salaries', '/tasks/staff-attendance', '/analytics/attendance', '/approvals'],
    teacher: ['/tasks/attendance', '/tasks/marks', '/tasks/content', '/analytics/performance', '/analytics/attendance', '/analytics/staff-attendance'],
    accountant: ['/tasks/fees', '/tasks/salaries', '/tasks/expenses', '/analytics/financial'],
  }

  return priorities[role]
    .filter((href) => visibleHrefs.includes(href))
    .map((href) => ACTION_LIBRARY[href])
}

export default async function DashboardPage() {
  const context = await getCurrentUserContext()
  if (!context?.isActive || !context.role || context.role === 'student') redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('full_name').eq('id', user.id).single()
  const displayName = profile?.full_name || user.user_metadata?.full_name
  const firstName = displayName?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  const visibleNav = getVisibleMainNav(context.role)
  const visibleLinks = visibleNav.flatMap((item) => item.href ? [item.href] : item.subItems?.map((subItem) => subItem.href) ?? [])
  const quickActions = pickPriorityActions(context.role, visibleLinks)
  const roleCopy = ROLE_COPY[context.role]

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/55 px-8 py-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_32%),radial-gradient(circle_at_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.55),rgba(2,6,23,0.86))]" />
        <div className="absolute inset-y-0 right-0 w-[46%] bg-[linear-gradient(120deg,transparent,rgba(148,163,184,0.08))]" />
        <div className="relative space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl space-y-4">
              <Badge variant="outline" className="border-sky-400/30 bg-sky-400/10 text-sky-300">Dashboard</Badge>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Welcome back</p>
                <h1 className="mt-2 font-serif text-4xl tracking-tight text-white sm:text-5xl">{firstName}, {roleCopy.title}</h1>
                <p className="mt-3 max-w-2xl text-base text-slate-300">{roleCopy.subtitle}</p>
              </div>
            </div>

            <div className="grid min-w-[280px] gap-3 sm:grid-cols-3">
              {roleCopy.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4 backdrop-blur-md">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{stat.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.slice(0, 3).map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href} className="group">
                  <div className={`rounded-[24px] border border-white/10 bg-gradient-to-br ${action.accent} p-[1px] shadow-[0_12px_30px_rgba(2,6,23,0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-white/5`}>
                    <div className="flex h-full min-h-[168px] flex-col justify-between rounded-[23px] bg-slate-950/65 p-5 backdrop-blur-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/15 bg-slate-900/70 text-sky-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-sky-300" />
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-white">{action.label}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{action.description}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-white/10 bg-slate-900/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl hover:bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Quick Navigation</CardTitle>
            <CardDescription className="text-slate-400">Jump directly into the pages that matter for your role right now.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href} className="group rounded-2xl border border-white/10 bg-slate-950/45 p-4 transition-all duration-300 hover:bg-white/5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/15 bg-slate-900/70 text-sky-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">{action.label}</p>
                        <ArrowRight className="h-4 w-4 text-slate-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-sky-300" />
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{action.description}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl hover:bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Role Snapshot</CardTitle>
            <CardDescription className="text-slate-400">Your visible sections come directly from the final role access contract.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleNav.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{item.label}</div>
                  <Badge variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-300">
                    {item.subItems?.length ?? (item.href ? 1 : 0)} area{(item.subItems?.length ?? (item.href ? 1 : 0)) === 1 ? '' : 's'}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(item.subItems ?? [{ label: item.label, href: item.href ?? '/dashboard', icon: item.icon, allowedRoles: item.allowedRoles }]).map((subItem) => (
                    <Link key={subItem.href} href={subItem.href}>
                      <span className="inline-flex rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 transition-colors duration-300 hover:bg-white/5 hover:text-white">{subItem.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-slate-900/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl hover:bg-white/5 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">What To Do Next</CardTitle>
            <CardDescription className="text-slate-400">Use these cues to move faster through the system without hunting through the navigation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {quickActions.slice(0, 3).map((action, index) => (
              <div key={action.href} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Priority {index + 1}</div>
                <div className="mt-3 font-semibold text-white">{action.label}</div>
                <p className="mt-2 text-sm text-slate-400">{action.description}</p>
                <div className="mt-4">
                  <Button asChild variant="outline" className="border-white/10 bg-transparent text-slate-200 hover:bg-white/5 hover:text-white">
                    <Link href={action.href}>Open</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl hover:bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Scope Reminder</CardTitle>
            <CardDescription className="text-slate-400">This dashboard adapts by role, so every shortcut here is safe for your current access level.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Current role</div>
              <div className="mt-2 text-lg font-semibold capitalize text-white">{context.role.replace('_', ' ')}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Quick count</div>
              <div className="mt-2 text-lg font-semibold text-white">{visibleLinks.length} destination{visibleLinks.length === 1 ? '' : 's'}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Best starting point</div>
              <div className="mt-2 text-lg font-semibold text-white">{quickActions[0]?.label ?? 'Dashboard'}</div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
