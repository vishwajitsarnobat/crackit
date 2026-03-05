'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarCheck, CalendarX, CalendarDays, Percent } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { StatCard } from '@/components/analytics/shared/stat-card'
import { FilterBar, SelectFilter, DateFilter, type FilterOption } from '@/components/analytics/shared/filter-bar'
import { EmptyState } from '@/components/analytics/shared/empty-state'

/* ── Types ────────────────────────────────────────── */

type AttendancePayload = {
    filters: {
        centres: { id: string; centre_name: string }[]
        batches: { id: string; batch_name: string; centre_id: string }[]
        students: { id: string; display_name: string; student_code: string | null }[]
        selectedStudentId: string | null
    }
    summary: { totalDays: number; presentCount: number; absentCount: number; attendancePercent: number | null }
    dailyTrend: { date: string; present: number; absent: number }[]
    studentBreakdown: { student_id: string; student_name: string; student_code: string | null; present: number; absent: number; total: number; percent: number | null }[]
}

/* ── Helpers ───────────────────────────────────────── */

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function pctLabel(v: number | null) { return v === null ? '-' : `${v.toFixed(1)}%` }

function attendanceTone(pct: number | null) {
    if (pct === null) return { bar: 'bg-muted', text: 'text-muted-foreground', label: '-' }
    if (pct >= 85) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Excellent' }
    if (pct >= 70) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Moderate' }
    return { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', label: 'Low' }
}

/* ── Section Card ─────────────────────────────────── */

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <Card className="gap-0 py-0 overflow-hidden">
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

/* ── Daily Trend Chart ────────────────────────────── */

function DailyTrendChart({ data }: { data: AttendancePayload['dailyTrend'] }) {
    if (!data.length) return <EmptyState title="No attendance data" message="No records found for the selected filters." />

    const chartData = data.map(d => ({ date: fmtDate(d.date), present: d.present, absent: d.absent }))
    const config = {
        present: { label: 'Present', color: '#16a34a' },
        absent: { label: 'Absent', color: '#dc2626' },
    } satisfies ChartConfig
    const width = Math.max(chartData.length * 48, 400)

    return (
        <ScrollArea className="w-full pb-1">
            <div style={{ width: `${width}px` }}>
                <ChartContainer config={config} className="h-[280px] w-full aspect-auto">
                    <BarChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
                        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="present" stackId="a" fill="var(--color-present)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="absent" stackId="a" fill="var(--color-absent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
}

/* ── Student Breakdown ────────────────────────────── */

function StudentBreakdownTable({ rows }: { rows: AttendancePayload['studentBreakdown'] }) {
    if (!rows.length) return <EmptyState title="No students" message="No student attendance data available." />

    return (
        <div className="overflow-hidden rounded-lg border">
            <Table className="min-w-[600px]">
                <TableHeader>
                    <TableRow className="bg-muted/40">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-right">Attendance %</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((r, i) => {
                        const t = attendanceTone(r.percent)
                        return (
                            <TableRow key={r.student_id} className={`transition-colors hover:bg-muted/30 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                <TableCell>
                                    <span className="font-medium">{r.student_name}</span>
                                    {r.student_code && <span className="ml-1.5 text-xs text-muted-foreground">({r.student_code})</span>}
                                </TableCell>
                                <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-400">{r.present}</TableCell>
                                <TableCell className="text-center tabular-nums text-rose-600 dark:text-rose-400">{r.absent}</TableCell>
                                <TableCell className="text-center tabular-nums">{r.total}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="outline" className={t.text}>{pctLabel(r.percent)}</Badge>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

/* ── Main Dashboard ───────────────────────────────── */

export function AttendanceDashboard() {
    const [data, setData] = useState<AttendancePayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [centreId, setCentreId] = useState('')
    const [batchId, setBatchId] = useState('')
    const [studentId, setStudentId] = useState('')
    const [fromDate, setFromDate] = useState<Date | undefined>()
    const [toDate, setToDate] = useState<Date | undefined>()

    const visibleBatches = useMemo(() => {
        if (!data) return []
        return centreId ? data.filters.batches.filter(b => b.centre_id === centreId) : data.filters.batches
    }, [centreId, data])

    function buildParams(overrides?: Record<string, string>) {
        const p = new URLSearchParams()
        const vals = { centreId, batchId, studentId, from: fromDate ? format(fromDate, 'yyyy-MM-dd') : '', to: toDate ? format(toDate, 'yyyy-MM-dd') : '', ...overrides }
        for (const [k, v] of Object.entries(vals)) { if (v) p.set(k, v) }
        return p
    }

    async function loadData(params?: URLSearchParams) {
        setLoading(true)
        const q = params ? `?${params}` : ''
        const res = await fetch(`/api/analytics/attendance${q}`, { cache: 'no-store' })
        const payload = await res.json().catch(() => null)
        setLoading(false)
        if (!res.ok || !payload) { toast.error(payload?.error ?? 'Failed to load attendance data.'); return }
        const d = payload as AttendancePayload
        setData(d)
        if (!params) {
            setCentreId(d.filters.centres[0]?.id ?? '')
            setBatchId(d.filters.batches[0]?.id ?? '')
            setStudentId('')
        }
    }

    function resetScopedFilters(nextCentreId: string) {
        setCentreId(nextCentreId)
        if (!data) return
        const first = nextCentreId === '' ? data.filters.batches[0] : data.filters.batches.find(b => b.centre_id === nextCentreId)
        setBatchId(first?.id ?? ''); setStudentId('')
    }

    async function handleBatchChange(next: string) {
        setBatchId(next); setStudentId('')
        await loadData(buildParams({ batchId: next, studentId: '' }))
    }

    async function applyFilters() { await loadData(buildParams()) }

    useEffect(() => { loadData() }, [])

    const centreOpts: FilterOption[] = [{ value: 'all', label: 'All centres' }, ...(data?.filters.centres.map(c => ({ value: c.id, label: c.centre_name })) ?? [])]
    const batchOpts: FilterOption[] = visibleBatches.map(b => ({ value: b.id, label: b.batch_name }))
    const studentOpts: FilterOption[] = [{ value: 'all', label: 'All students' }, ...(data?.filters.students.map(s => ({ value: s.id, label: `${s.display_name}${s.student_code ? ` (${s.student_code})` : ''}` })) ?? [])]

    const summary = data?.summary ?? { totalDays: 0, presentCount: 0, absentCount: 0, attendancePercent: null }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Attendance Analytics</h1>
                <p className="mt-1 text-sm text-muted-foreground">Track student attendance across batches with daily trends and individual breakdowns.</p>
            </div>

            {/* Filters */}
            <FilterBar description="Refine by centre, batch, student, and date range." actions={
                <>
                    <Button onClick={applyFilters} disabled={loading}>{loading ? 'Loading…' : 'Apply filters'}</Button>
                    <Button variant="outline" onClick={() => { setFromDate(undefined); setToDate(undefined) }}>Clear dates</Button>
                </>
            }>
                <SelectFilter id="a-centre" label="Centre" value={centreId || 'all'} options={centreOpts} onChange={v => resetScopedFilters(v === 'all' ? '' : v)} />
                <SelectFilter id="a-batch" label="Batch" value={batchId} options={batchOpts} placeholder="Select batch" onChange={handleBatchChange} />
                <SelectFilter id="a-student" label="Student" value={studentId || 'all'} options={studentOpts} onChange={v => setStudentId(v === 'all' ? '' : v)} />
                <DateFilter id="a-from" label="From" value={fromDate} onChange={setFromDate} />
                <DateFilter id="a-to" label="To" value={toDate} onChange={setToDate} />
            </FilterBar>

            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Days" value={summary.totalDays} icon={<CalendarDays className="h-5 w-5" />} />
                <StatCard label="Present" value={summary.presentCount} icon={<CalendarCheck className="h-5 w-5" />} accent="success" />
                <StatCard label="Absent" value={summary.absentCount} icon={<CalendarX className="h-5 w-5" />} accent={summary.absentCount > 0 ? 'danger' : 'default'} />
                <StatCard label="Attendance %" value={pctLabel(summary.attendancePercent)} icon={<Percent className="h-5 w-5" />}
                    accent={summary.attendancePercent !== null ? (summary.attendancePercent >= 85 ? 'success' : summary.attendancePercent >= 70 ? 'warning' : 'danger') : 'default'} />
            </div>

            {/* Daily Trend */}
            <SectionCard title="Daily Attendance Trend" description="Stacked bar chart showing present and absent counts per day.">
                <DailyTrendChart data={data?.dailyTrend ?? []} />
            </SectionCard>

            {/* Student Breakdown */}
            <SectionCard title="Student Breakdown" description="Individual attendance ranked by percentage.">
                <StudentBreakdownTable rows={data?.studentBreakdown ?? []} />
            </SectionCard>
        </div>
    )
}
