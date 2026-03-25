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
    title: 'Institute overview',
    subtitle: 'Review approvals, centre performance, student operations, and financial movement across the institute from one calm workspace.',
    stats: [
      { label: 'Visibility', value: 'All centres' },
      { label: 'Control', value: 'Rules + governance' },
      { label: 'Focus', value: 'Approvals and reports' },
    ],
  },
  centre_head: {
    title: 'Centre operations overview',
    subtitle: 'Manage batches, enrollments, attendance, fee collection, and staff records for your centre without jumping between disconnected screens.',
    stats: [
      { label: 'Scope', value: 'Own centre' },
      { label: 'Control', value: 'Batches + enrollments' },
      { label: 'Focus', value: 'Fees, salary, staff' },
    ],
  },
  teacher: {
    title: 'Teaching overview',
    subtitle: 'Move quickly from attendance to marks entry, content, and student progress for your assigned batches.',
    stats: [
      { label: 'Scope', value: 'Assigned batches' },
      { label: 'Control', value: 'Tasks only' },
      { label: 'Focus', value: 'Attendance + marks' },
    ],
  },
  accountant: {
    title: 'Finance overview',
    subtitle: 'Track collections, expenses, salary records, and financial summaries with clear daily priorities.',
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
    accent: 'from-primary/45 to-white/20 dark:from-primary/20 dark:to-white/[0.03]',
  },
  '/analytics/attendance': {
    href: '/analytics/attendance',
    label: 'Attendance Analysis',
    description: 'Explore day, month, and yearly attendance views.',
    icon: CalendarCheck2,
    accent: 'from-accent/30 to-white/20 dark:from-accent/16 dark:to-white/[0.03]',
  },
  '/analytics/performance': {
    href: '/analytics/performance',
    label: 'Performance Analysis',
    description: 'Compare marks, rank trends, and consistency.',
    icon: BarChart3,
    accent: 'from-secondary/22 to-white/20 dark:from-secondary/22 dark:to-white/[0.03]',
  },
  '/analytics/staff-attendance': {
    href: '/analytics/staff-attendance',
    label: 'Staff Attendance Analysis',
    description: 'Monitor present, absent, and partial teacher attendance.',
    icon: BriefcaseBusiness,
    accent: 'from-primary/30 to-accent/10 dark:from-primary/18 dark:to-accent/10',
  },
  '/analytics/financial': {
    href: '/analytics/financial',
    label: 'Fee Analysis',
    description: 'Track centre expenses, salary summaries, and fee summaries.',
    icon: Wallet,
    accent: 'from-secondary/28 to-primary/20 dark:from-secondary/20 dark:to-primary/10',
  },
  '/manage/centres': {
    href: '/manage/centres',
    label: 'Centre Management',
    description: 'Add, edit, activate, or deactivate centres.',
    icon: Building2,
    accent: 'from-primary/30 to-white/20 dark:from-primary/18 dark:to-white/[0.03]',
  },
  '/manage/batches': {
    href: '/manage/batches',
    label: 'Batch Management',
    description: 'Review and maintain active academic batches.',
    icon: Layers3,
    accent: 'from-secondary/24 to-white/20 dark:from-secondary/20 dark:to-white/[0.03]',
  },
  '/manage/enrollments': {
    href: '/manage/enrollments',
    label: 'Enrollment Management',
    description: 'Assign students and teachers with fee or salary setup.',
    icon: ClipboardList,
    accent: 'from-primary/35 to-white/20 dark:from-primary/18 dark:to-white/[0.03]',
  },
  '/manage/reward-points': {
    href: '/manage/reward-points',
    label: 'Reward Points',
    description: 'Define rules and adjust student reward balances.',
    icon: Gift,
    accent: 'from-accent/28 to-primary/15 dark:from-accent/12 dark:to-primary/10',
  },
  '/tasks/attendance': {
    href: '/tasks/attendance',
    label: 'Student Attendance',
    description: 'Mark daily attendance for assigned batches.',
    icon: CalendarCheck2,
    accent: 'from-primary/35 to-white/20 dark:from-primary/18 dark:to-white/[0.03]',
  },
  '/tasks/marks': {
    href: '/tasks/marks',
    label: 'Marks Entry',
    description: 'Create exams and enter marks in one sheet.',
    icon: FileText,
    accent: 'from-secondary/24 to-white/20 dark:from-secondary/20 dark:to-white/[0.03]',
  },
  '/tasks/content': {
    href: '/tasks/content',
    label: 'Content Library',
    description: 'Upload links, notes, and class content per batch.',
    icon: BookOpenCheck,
    accent: 'from-primary/28 to-accent/10 dark:from-primary/16 dark:to-accent/10',
  },
  '/tasks/expenses': {
    href: '/tasks/expenses',
    label: 'Expenses',
    description: 'Log append-only monthly expense entries.',
    icon: Wallet,
    accent: 'from-secondary/22 to-primary/15 dark:from-secondary/18 dark:to-primary/10',
  },
  '/tasks/salaries': {
    href: '/tasks/salaries',
    label: 'Salary Records',
    description: 'Review pending salaries and record payouts.',
    icon: BriefcaseBusiness,
    accent: 'from-primary/24 to-white/18 dark:from-primary/16 dark:to-white/[0.03]',
  },
  '/tasks/fees': {
    href: '/tasks/fees',
    label: 'Fee Collection',
    description: 'Collect fee payments and apply reward offsets.',
    icon: Wallet,
    accent: 'from-accent/30 to-white/18 dark:from-accent/14 dark:to-white/[0.03]',
  },
  '/tasks/staff-attendance': {
    href: '/tasks/staff-attendance',
    label: 'Staff Attendance',
    description: 'Mark teacher present, absent, or partial attendance.',
    icon: BriefcaseBusiness,
    accent: 'from-primary/28 to-secondary/14 dark:from-primary/16 dark:to-secondary/12',
  },
  '/reports/student-profile': {
    href: '/reports/student-profile',
    label: 'Student Profile Reports',
    description: 'Generate PDF-ready student profile documents.',
    icon: FileText,
    accent: 'from-primary/30 to-white/18 dark:from-primary/16 dark:to-white/[0.03]',
  },
  '/reports/attendance': {
    href: '/reports/attendance',
    label: 'Attendance Reports',
    description: 'Export attendance summaries with analytics.',
    icon: CalendarCheck2,
    accent: 'from-accent/28 to-white/18 dark:from-accent/14 dark:to-white/[0.03]',
  },
  '/reports/performance': {
    href: '/reports/performance',
    label: 'Performance Reports',
    description: 'Export performance reports with comparative detail.',
    icon: BarChart3,
    accent: 'from-secondary/24 to-white/18 dark:from-secondary/18 dark:to-white/[0.03]',
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
    <div className="space-y-7 lg:space-y-8">
      <section className="glass-panel relative overflow-hidden rounded-[32px] px-6 py-7 soft-ring sm:px-8 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.34),transparent_32%),radial-gradient(circle_at_right,rgba(4,231,254,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.16))] dark:bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.18),transparent_28%),radial-gradient(circle_at_right,rgba(4,231,254,0.08),transparent_24%),linear-gradient(180deg,rgba(24,35,28,0.34),rgba(10,16,12,0.16))]" />
        <div className="absolute inset-y-0 right-0 w-[46%] bg-[linear-gradient(120deg,transparent,rgba(45,75,42,0.06))] dark:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.03))]" />
        <div className="relative space-y-7">
          <div className="flex flex-wrap items-start justify-between gap-5 xl:items-start">
            <div className="max-w-2xl space-y-3">
                <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Dashboard</Badge>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Welcome back</p>
                  <h1 className="mt-2 max-w-[14ch] font-serif text-4xl leading-[1.02] tracking-[-0.03em] text-secondary dark:text-primary sm:text-5xl">{firstName}, {roleCopy.title}</h1>
                  <p className="mt-3 max-w-[60ch] text-[15px] leading-7 text-muted-foreground">{roleCopy.subtitle}</p>
                </div>
             </div>

            <div className="grid min-w-[280px] gap-3 sm:grid-cols-3 xl:min-w-[420px] xl:self-start">
              {roleCopy.stats.map((stat) => (
                 <div key={stat.label} className="flex min-h-[102px] flex-col justify-between rounded-[24px] border border-secondary/10 bg-white/55 px-4 py-4 backdrop-blur-md dark:bg-white/[0.04]">
                   <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{stat.label}</div>
                   <div className="mt-3 text-lg font-semibold tracking-[-0.01em] text-secondary dark:text-foreground">{stat.value}</div>
                 </div>
               ))}
             </div>
          </div>

          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.slice(0, 3).map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href} className="group h-full">
                   <div className={`h-full rounded-[28px] border border-secondary/10 bg-gradient-to-br ${action.accent} p-[1px] shadow-[0_16px_36px_rgba(74,106,71,0.12)] transition-all duration-300 hover:-translate-y-1`}>
                     <div className="flex h-full min-h-[188px] flex-col rounded-[27px] bg-white/72 p-5 backdrop-blur-xl dark:bg-[#131b15]/80">
                       <div className="flex items-start justify-between gap-4">
                         <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-secondary/10 bg-white/75 text-secondary dark:bg-white/[0.05] dark:text-primary">
                           <Icon className="h-5 w-5" />
                         </div>
                         <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-secondary dark:group-hover:text-primary" />
                       </div>
                         <div className="mt-5 flex flex-1 flex-col justify-end">
                           <div className="text-[1.05rem] font-semibold leading-6 text-secondary dark:text-foreground">{action.label}</div>
                           <p className="mt-2 max-w-[28ch] text-sm leading-6 text-muted-foreground">{action.description}</p>
                         </div>
                     </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-secondary dark:text-primary">Quick Navigation</CardTitle>
            <CardDescription>Jump directly into the pages that matter most for your role today.</CardDescription>
          </CardHeader>
          <CardContent className="grid flex-1 gap-3 md:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                 <Link key={action.href} href={action.href} className="group flex h-full rounded-[24px] border border-secondary/10 bg-white/55 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/75 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-secondary/10 bg-white/75 text-secondary dark:bg-white/[0.05] dark:text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-secondary dark:text-foreground">{action.label}</p>
                          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-secondary dark:group-hover:text-primary" />
                        </div>
                        <p className="mt-1 max-w-[30ch] text-sm leading-6 text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-secondary dark:text-primary">Role Snapshot</CardTitle>
            <CardDescription>Your available sections reflect the permissions assigned to this account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {visibleNav.map((item) => (
              <div key={item.label} className="flex h-full flex-col rounded-[24px] border border-secondary/10 bg-white/55 p-4 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-secondary dark:text-foreground">{item.label}</div>
                  <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">
                    {item.subItems?.length ?? (item.href ? 1 : 0)} area{(item.subItems?.length ?? (item.href ? 1 : 0)) === 1 ? '' : 's'}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(item.subItems ?? [{ label: item.label, href: item.href ?? '/dashboard', icon: item.icon, allowedRoles: item.allowedRoles }]).map((subItem) => (
                    <Link key={subItem.href} href={subItem.href}>
                      <span className="inline-flex rounded-full border border-secondary/10 bg-white/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-300 hover:border-secondary/20 hover:text-secondary dark:bg-white/[0.05] dark:hover:text-foreground">{subItem.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

        <section className="grid items-stretch gap-4 lg:grid-cols-3">
        <Card className="h-full lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-secondary dark:text-primary">Top Priorities</CardTitle>
            <CardDescription>Use these shortcuts to complete the highest-value work without scanning every section.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {quickActions.slice(0, 3).map((action, index) => (
              <div key={action.href} className="flex h-full flex-col rounded-[24px] border border-secondary/10 bg-white/55 p-4 dark:bg-white/[0.04]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Priority {index + 1}</div>
                <div className="mt-3 font-semibold text-secondary dark:text-foreground">{action.label}</div>
                <p className="mt-2 flex-1 max-w-[26ch] text-sm leading-6 text-muted-foreground">{action.description}</p>
                <div className="mt-4 pt-1">
                  <Button asChild variant="outline">
                    <Link href={action.href}>Open</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-secondary dark:text-primary">Workspace Access</CardTitle>
            <CardDescription>This dashboard changes by role so the shortcuts here always match your approved access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[24px] border border-secondary/10 bg-white/55 p-4 dark:bg-white/[0.04]">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Current role</div>
              <div className="mt-2 text-lg font-semibold capitalize text-secondary dark:text-foreground">{context.role.replace('_', ' ')}</div>
            </div>
            <div className="rounded-[24px] border border-secondary/10 bg-white/55 p-4 dark:bg-white/[0.04]">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Visible pages</div>
              <div className="mt-2 text-lg font-semibold text-secondary dark:text-foreground">{visibleLinks.length} destination{visibleLinks.length === 1 ? '' : 's'}</div>
            </div>
            <div className="rounded-[24px] border border-secondary/10 bg-white/55 p-4 dark:bg-white/[0.04]">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Recommended starting point</div>
              <div className="mt-2 text-lg font-semibold text-secondary dark:text-foreground">{quickActions[0]?.label ?? 'Dashboard'}</div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
