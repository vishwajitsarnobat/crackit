import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, CalendarCheck, ShieldCheck, ArrowRight, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const QUICK_LINKS = [
  { label: 'Performance', description: 'Analyze exam scores & trends', href: '/analytics/performance', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Attendance', description: 'Track student attendance', href: '/analytics/attendance', icon: CalendarCheck, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
  { label: 'Financials', description: 'Monitor revenue & expenses', href: '/analytics/financial', icon: Wallet, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Approvals', description: 'Review pending requests', href: '/approvals', icon: ShieldCheck, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome section */}
      <div className="rounded-2xl border bg-primary p-8 text-primary-foreground">
        <p className="text-sm font-medium text-white/70">Welcome back</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">{firstName} 👋</h1>
        <p className="mt-2 text-sm text-white/60">Here&apos;s your coaching institute at a glance.</p>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map(action => (
            <Link key={action.href} href={action.href}>
              <Card className="group cursor-pointer border transition-all hover:shadow-lg hover:-translate-y-1">
                <CardContent className="flex items-start gap-4 px-5 py-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.bg}`}>
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{action.label}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
