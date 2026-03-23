'use client'

/**
 * Staff Attendance Dashboard Component
 * Data visualization for daily staff attendance across centres.
 * Features: Summary KPIs, daily trend line chart, status donut chart, and teacher breakdown table.
 */

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { UserCheck, Clock, UserX, UserMinus, Percent } from 'lucide-react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

import { StatCard } from '@/components/analytics/shared/stat-card'
import { FilterBar, SelectFilter, DateFilter, type FilterOption } from '@/components/analytics/shared/filter-bar'
import { EmptyState } from '@/components/analytics/shared/empty-state'
import { DonutChart } from '@/components/analytics/shared/donut-chart'

/* ── Types ───────────────────────────────────────── */

type StaffAttendancePayload = {
    filters: {
        centres: { id: string; centre_name: string }[]
        teachers: { id: string; full_name: string }[]
        selectedTeacherId: string | null
    }
    summary: { totalDays: number; presentCount: number; absentCount: number; partialCount: number; attendancePercent: number | null }
    dailyTrend: { date: string; present: number; absent: number; partial: number }[]
    teacherBreakdown: { user_id: string; teacher_name: string; present: number; absent: number; partial: number; total: number; percent: number | null }[]
}

/* ── Helpers ──────────────────────────────────────── */

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function pctLabel(v: number | null) { return v === null ? '-' : `${v.toFixed(1)}%` }

function attendanceTone(pct: number | null) {
    if (pct === null) return { bar: 'bg-muted', text: 'text-muted-foreground', label: '-' }
    if (pct >= 85) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Excellent' }
    if (pct >= 70) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Moderate' }
    return { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', label: 'Low' }
}

/* ── Section Card ────────────────────────────────── */

function SectionCard({ title, description, children, className = '' }: { title: string; description: string; children: React.ReactNode; className?: string }) {
    return (
        <Card className={`gap-0 py-0 overflow-hidden ${className}`}>
            <div className="border-b bg-muted/30 px-5 py-3.5">
                <CardTitle className="text-base tracking-tight">{title}</CardTitle>
                <CardDescription className="mt-0.5">{description}</CardDescription>
            </div>
            <CardContent className="px-5 py-5">
                {children}
            </CardContent>
        </Card>
    )
}

/* ── Charts ──────────────────────────────────────── */

const trendChartConfig = {
    present: { label: 'Present', color: '#10b981' },
    partial: { label: 'Partial', color: '#f59e0b' },
    absent: { label: 'Absent', color: '#ef4444' },
} satisfies ChartConfig

function AttendanceTrendChart({ data }: { data: StaffAttendancePayload['dailyTrend'] }) {
    if (!data.length) return <EmptyState title="No data" message="No trends available for this period." />

    const chartData = data.map(d => ({ date: fmtDate(d.date), present: d.present, partial: d.partial, absent: d.absent }))

    return (
        <ScrollArea className="w-full pb-1">
            <div style={{ width: `${Math.max(chartData.length * 48, 400)}px` }}>
                <ChartContainer config={trendChartConfig} className="h-[280px] w-full aspect-auto">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" interval={0} />
                        <YAxis tickLine={false} axisLine={false} className="text-xs" allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="present" stroke="var(--color-present)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="partial" stroke="var(--color-partial)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="absent" stroke="var(--color-absent)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
}

const donutConfig = {
    Present: { label: 'Present', color: '#10b981' },
    Partial: { label: 'Partial', color: '#f59e0b' },
    Absent: { label: 'Absent', color: '#ef4444' },
} satisfies ChartConfig

function StatusDonutChart({ summary }: { summary: StaffAttendancePayload['summary'] }) {
    const data = [
        { name: 'Present', value: summary.presentCount, fill: '#10b981' },
        { name: 'Partial', value: summary.partialCount, fill: '#f59e0b' },
        { name: 'Absent', value: summary.absentCount, fill: '#ef4444' },
    ]

    return <DonutChart data={data} config={donutConfig} emptyMessage="No attendance data available." />
}

/* ── Teacher Breakdown Table ─────────────────────── */

function TeacherBreakdownTable({ rows }: { rows: StaffAttendancePayload['teacherBreakdown'] }) {
    if (!rows.length) return <EmptyState title="No teachers" message="No teacher attendance data for the selected filters." />

    return (
        <div className="overflow-hidden rounded-lg border">
            <Table className="min-w-[600px]">
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead className="text-center tabular-nums text-emerald-600 dark:text-emerald-400">Present</TableHead>
                        <TableHead className="text-center tabular-nums text-amber-600 dark:text-amber-400">Partial</TableHead>
                        <TableHead className="text-center tabular-nums text-rose-600 dark:text-rose-400">Absent</TableHead>
                        <TableHead className="text-center tabular-nums">Total</TableHead>
                        <TableHead className="text-right">Attendance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((r, i) => {
                        const tone = attendanceTone(r.percent)
                        return (
                            <TableRow key={r.user_id} className="transition-colors hover:bg-muted/30">
                                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                                            {r.teacher_name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-medium">{r.teacher_name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-400">{r.present}</TableCell>
                                <TableCell className="text-center tabular-nums text-amber-600 dark:text-amber-400">{r.partial}</TableCell>
                                <TableCell className="text-center tabular-nums text-rose-600 dark:text-rose-400">{r.absent}</TableCell>
                                <TableCell className="text-center tabular-nums">{r.total}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="hidden sm:block w-20 h-2 rounded-full bg-muted overflow-hidden">
                                            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${r.percent ?? 0}%` }} />
                                        </div>
                                        <span className={`text-sm font-semibold tabular-nums ${tone.text}`}>{pctLabel(r.percent)}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

/* ── Main Component ──────────────────────────────── */

export function StaffAttendanceDashboard({ role }: { role: string }) {
    const [data, setData] = useState<StaffAttendancePayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [centreId, setCentreId] = useState('')
    const [teacherId, setTeacherId] = useState('')
    const [fromDate, setFromDate] = useState<Date | undefined>()
    const [toDate, setToDate] = useState<Date | undefined>()

    function buildParams(overrides?: Record<string, string>) {
        const p = new URLSearchParams()
        const vals = {
            centreId,
            teacherId,
            from: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
            to: toDate ? format(toDate, 'yyyy-MM-dd') : '',
            ...overrides
        }
        for (const [k, v] of Object.entries(vals)) { if (v) p.set(k, v) }
        return p
    }

    async function loadData(params?: URLSearchParams) {
        setLoading(true)
        const q = params ? `?${params}` : ''
        const res = await fetch(`/api/analytics/staff-attendance${q}`, { cache: 'no-store' })
        const payload = await res.json().catch(() => null)
        setLoading(false)
        if (!res.ok || !payload) { toast.error(payload?.error ?? 'Failed to load staff attendance.'); return }
        const d = payload as StaffAttendancePayload
        setData(d)
        if (!params) {
            setCentreId(d.filters.centres[0]?.id ?? '')
            setTeacherId('')
        }
    }

    function resetScopedFilters(nextCentreId: string) {
        setCentreId(nextCentreId)
        setTeacherId('')
    }

    async function applyFilters() { await loadData(buildParams()) }

    useEffect(() => { loadData() }, [])

    const centreOpts: FilterOption[] = [{ value: 'all', label: 'All centres' }, ...(data?.filters.centres.map(c => ({ value: c.id, label: c.centre_name })) ?? [])]
    const teacherOpts: FilterOption[] = [{ value: 'all', label: 'All teachers' }, ...(data?.filters.teachers.map(t => ({ value: t.id, label: t.full_name })) ?? [])]

    const summary = data?.summary ?? { totalDays: 0, presentCount: 0, absentCount: 0, partialCount: 0, attendancePercent: null }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <FilterBar description={role === 'teacher' ? "Filter your attendance by date range." : "Refine by centre, teacher, and date range."} actions={
                <>
                    <Button onClick={applyFilters} disabled={loading}>{loading ? 'Loading…' : 'Apply filters'}</Button>
                    <Button variant="outline" onClick={() => { setFromDate(undefined); setToDate(undefined) }}>Clear dates</Button>
                </>
            }>
                {role !== 'teacher' && (
                    <SelectFilter id="sa-centre" label="Centre" value={centreId || 'all'} options={centreOpts} onChange={v => resetScopedFilters(v === 'all' ? '' : v)} />
                )}
                {role !== 'teacher' && (
                    <SelectFilter id="sa-teacher" label="Teacher" value={teacherId || 'all'} options={teacherOpts} onChange={v => setTeacherId(v === 'all' ? '' : v)} />
                )}
                <DateFilter id="sa-from" label="From" value={fromDate} onChange={setFromDate} />
                <DateFilter id="sa-to" label="To" value={toDate} onChange={setToDate} />
            </FilterBar>

            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Days" value={summary.totalDays} icon={<Clock className="h-5 w-5" />} />
                <StatCard label="Present" value={summary.presentCount} icon={<UserCheck className="h-5 w-5" />} accent="success" />
                <StatCard label="Absent" value={summary.absentCount} icon={<UserX className="h-5 w-5" />} accent={summary.absentCount > 0 ? 'danger' : 'default'} />
                <StatCard label="Attendance %" value={pctLabel(summary.attendancePercent)} icon={<Percent className="h-5 w-5" />}
                    accent={summary.attendancePercent !== null ? (summary.attendancePercent >= 85 ? 'success' : summary.attendancePercent >= 70 ? 'warning' : 'danger') : 'default'} />
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
                <SectionCard title="Status Breakdown" description="Overall present vs partial vs absent ratio.">
                    <StatusDonutChart summary={summary} />
                </SectionCard>

                <SectionCard title="Daily Attendance Trend" className="lg:col-span-2" description="Line chart showing present, partial, and absent counts per day.">
                    <AttendanceTrendChart data={data?.dailyTrend ?? []} />
                </SectionCard>
            </div>

            {/* Teacher Breakdown */}
            <SectionCard title="Teacher Breakdown" description="Individual teacher attendance ranked by percentage.">
                <TeacherBreakdownTable rows={data?.teacherBreakdown ?? []} />
            </SectionCard>
        </div>
    )
}
