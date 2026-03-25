'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth, subDays } from 'date-fns'
import { CalendarDays, CalendarCheck2, CalendarX2, Percent, Search } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

import { fetchJson } from '@/lib/http/fetch-json'
import { DonutChart } from '@/components/analytics/shared/donut-chart'
import { EmptyState } from '@/components/analytics/shared/empty-state'
import { FilterBar, SelectFilter, type FilterOption } from '@/components/analytics/shared/filter-bar'
import { SectionCard } from '@/components/analytics/shared/section-card'
import { StatCard } from '@/components/analytics/shared/stat-card'
import { DatePickerField } from '@/components/shared/form/date-picker-field'
import { SelectField } from '@/components/shared/form/select-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAttendanceAnalyticsFilterStore } from '@/lib/stores/attendance-analytics-filters'

type AttendancePayload = {
  filters: {
    centres: { id: string; centre_name: string }[]
    batches: { id: string; batch_name: string; centre_id: string }[]
    students: { id: string; display_name: string; student_code: string | null }[]
  }
  summary: {
    totalDays: number
    presentCount: number
    absentCount: number
    attendancePercent: number | null
    presentDays: number
    absentDays: number
  }
  dailyTrend: { date: string; present: number; absent: number }[]
  monthlyTrend: { month: string; present: number; absent: number }[]
  yearlyTrend: { month: string; present: number; absent: number; percent: number | null }[]
  studentBreakdown: {
    student_id: string
    student_name: string
    student_code: string | null
    present: number
    absent: number
    total: number
    percent: number | null
  }[]
}

type AppliedAttendanceFilters = {
  centreId: string
  batchId: string
  studentId: string
  month: string
  from: string
  to: string
  year: string
}

const chartConfig = {
  present: { label: 'Present', color: '#38bdf8' },
  absent: { label: 'Absent', color: '#fb7185' },
  percent: { label: 'Attendance %', color: '#34d399' },
} satisfies ChartConfig

function fmtPercent(value: number | null) {
  return value === null ? '-' : `${value.toFixed(1)}%`
}

function prettyMonth(value: string) {
  return format(new Date(`${value}-01T00:00:00`), 'MMM')
}

function prettyDate(value: string) {
  return format(new Date(`${value}T00:00:00`), 'dd MMM')
}

function buildAttendanceQueryString(filters: AppliedAttendanceFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return params.toString()
}

function YearlyChart({ data, mode }: { data: AttendancePayload['yearlyTrend']; mode: 'present' | 'absent' | 'both' }) {
  if (!data.length) return <EmptyState title="No yearly trend" message="No yearly attendance records are available for the current filters." />

  const chartData = data.map((item) => ({
    ...item,
    monthLabel: prettyMonth(item.month),
    value: mode === 'absent' ? item.absent : item.present,
  }))

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full aspect-auto">
      <ComposedChart data={chartData}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
        <YAxis yAxisId="count" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis yAxisId="percent" orientation="right" tickLine={false} axisLine={false} domain={[0, 100]} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {mode !== 'absent' && <Bar yAxisId="count" dataKey="present" fill="var(--color-present)" radius={[6, 6, 0, 0]} />}
        {mode !== 'present' && <Bar yAxisId="count" dataKey="absent" fill="var(--color-absent)" radius={[6, 6, 0, 0]} />}
        <Line yAxisId="percent" type="monotone" dataKey="percent" stroke="var(--color-percent)" strokeWidth={3} dot={{ r: 4 }} />
      </ComposedChart>
    </ChartContainer>
  )
}

function SimpleTrendChart({
  title,
  data,
}: {
  title: string
  data: { label: string; present: number; absent: number }[]
}) {
  if (!data.length) return <EmptyState title={`No ${title.toLowerCase()}`} message="Try widening the date range or clearing student filters." />

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full aspect-auto">
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="present" fill="var(--color-present)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="absent" fill="var(--color-absent)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

export function AttendanceDashboard() {
  const {
    centreId,
    batchId,
    studentId,
    month,
    fromDate,
    toDate,
    year,
    yearMode,
    tableStatus,
    studentSearch,
    patchFilters,
    resetFilters,
    setFilter,
  } = useAttendanceAnalyticsFilterStore()
  const [appliedFilters, setAppliedFilters] = useState<AppliedAttendanceFilters>({
    centreId: '',
    batchId: '',
    studentId: '',
    month: '',
    from: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    year: String(new Date().getFullYear()),
  })

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: ['analytics-attendance', appliedFilters],
    queryFn: async () => {
      const payload = await fetchJson<AttendancePayload>(`/api/analytics/attendance?${buildAttendanceQueryString(appliedFilters)}`, {
        cache: 'no-store',
        errorPrefix: 'Load attendance analytics',
      })
      return payload
    },
    staleTime: 30_000,
    retry: false,
  })

  const loading = isPending || isFetching

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load attendance analytics')
    }
  }, [error])

  function applyFilters() {
    setAppliedFilters({
      centreId,
      batchId,
      studentId,
      month,
      from: fromDate,
      to: toDate,
      year,
    })
  }

  const visibleBatches = useMemo(() => {
    if (!data) return []
    return centreId ? data.filters.batches.filter((batch) => batch.centre_id === centreId) : data.filters.batches
  }, [centreId, data])

  const centreOptions: FilterOption[] = [{ value: 'all', label: 'All centres' }, ...(data?.filters.centres.map((centre) => ({ value: centre.id, label: centre.centre_name })) ?? [])]
  const batchOptions: FilterOption[] = [{ value: 'all', label: 'All batches' }, ...visibleBatches.map((batch) => ({ value: batch.id, label: batch.batch_name }))]
  const studentOptions: FilterOption[] = [{ value: 'all', label: 'All students' }, ...(data?.filters.students.map((student) => ({ value: student.id, label: `${student.display_name}${student.student_code ? ` (${student.student_code})` : ''}` })) ?? [])]

  const dailyTrend = useMemo(
    () => (data?.dailyTrend ?? []).map((item) => ({ label: prettyDate(item.date), present: item.present, absent: item.absent })),
    [data?.dailyTrend],
  )

  const monthlyTrend = useMemo(
    () => (data?.monthlyTrend ?? []).map((item) => ({ label: prettyMonth(item.month), present: item.present, absent: item.absent })),
    [data?.monthlyTrend],
  )

  const donutData = useMemo(
    () => [
      { name: 'present', value: data?.summary.presentCount ?? 0, fill: '#38bdf8' },
      { name: 'absent', value: data?.summary.absentCount ?? 0, fill: '#fb7185' },
    ],
    [data?.summary.absentCount, data?.summary.presentCount],
  )

  const breakdownRows = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()
    return (data?.studentBreakdown ?? [])
      .filter((row) => !query || row.student_name.toLowerCase().includes(query) || (row.student_code ?? '').toLowerCase().includes(query))
      .filter((row) => {
        if (tableStatus === 'present') return row.present > 0
        if (tableStatus === 'absent') return row.absent > 0
        return true
      })
  }, [data?.studentBreakdown, studentSearch, tableStatus])

  useEffect(() => {
    if (batchId && !visibleBatches.some((batch) => batch.id === batchId)) {
      patchFilters({ batchId: '', studentId: '' })
    }
  }, [batchId, patchFilters, visibleBatches])

  useEffect(() => {
    const studentIds = new Set((data?.filters.students ?? []).map((student) => student.id))
    if (studentId && !studentIds.has(studentId)) {
      setFilter('studentId', '')
    }
  }, [data?.filters.students, setFilter, studentId])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/45 px-8 py-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.20),transparent_32%),radial-gradient(circle_at_right,rgba(34,197,94,0.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.52),rgba(2,6,23,0.86))]" />
        <div className="relative space-y-4">
          <Badge variant="outline" className="border-sky-400/30 bg-sky-400/10 text-sky-300">Analytics</Badge>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">Attendance Intelligence</h1>
              <p className="mt-3 text-base text-slate-300">Explore student, batch, or centre attendance with day-wise, month-wise, and year-wise views plus a detailed student breakdown.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Date range</div>
                <div className="mt-2 text-lg font-semibold text-white">{fromDate} {'->'} {toDate}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Year focus</div>
                <div className="mt-2 text-lg font-semibold text-white">{year}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Student scope</div>
                <div className="mt-2 text-lg font-semibold text-white">{studentId ? 'Selected student' : 'Batch / centre view'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FilterBar
        title="Attendance Filters"
        description="Teacher scope is limited to assigned batches. Centre heads stay within their centre. CEO can view all centres."
        gridClass="md:grid-cols-3 xl:grid-cols-7"
        actions={
           <>
             <Button onClick={applyFilters} disabled={loading}>{loading ? 'Loading...' : 'Apply filters'}</Button>
             <Button variant="outline" onClick={() => {
               const defaultFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd')
               const defaultTo = format(new Date(), 'yyyy-MM-dd')
               const defaultYear = String(new Date().getFullYear())
               resetFilters()
                setAppliedFilters({ centreId: '', batchId: '', studentId: '', month: '', from: defaultFrom, to: defaultTo, year: defaultYear })
              }}>Reset range</Button>
            </>
          }
       >
        {data?.filters.centres && data.filters.centres.length > 1 && (
          <SelectFilter id="attendance-centre" label="Centre" value={centreId || 'all'} options={centreOptions} onChange={(value) => {
            const next = value === 'all' ? '' : value
            patchFilters({ centreId: next, batchId: '', studentId: '' })
          }} />
        )}
        <SelectFilter id="attendance-batch" label="Batch" value={batchId || 'all'} options={batchOptions} onChange={(value) => patchFilters({ batchId: value === 'all' ? '' : value, studentId: '' })} />
        <SelectFilter id="attendance-student" label="Student" value={studentId || 'all'} options={studentOptions} onChange={(value) => setFilter('studentId', value === 'all' ? '' : value)} />
        <div className="space-y-2">
          <Label htmlFor="attendance-month">Month</Label>
          <Input
            id="attendance-month"
            type="month"
            value={month}
            onChange={(event) => {
              const nextMonth = event.target.value
              if (!nextMonth) {
                setFilter('month', '')
                return
              }
              const monthStart = format(startOfMonth(new Date(`${nextMonth}-01T00:00:00`)), 'yyyy-MM-dd')
              const monthEnd = format(endOfMonth(new Date(`${nextMonth}-01T00:00:00`)), 'yyyy-MM-dd')
              patchFilters({ month: nextMonth, fromDate: monthStart, toDate: monthEnd, year: nextMonth.slice(0, 4) })
            }}
            max={format(new Date(), 'yyyy-MM')}
          />
        </div>
        <DatePickerField id="attendance-from" label="From" value={fromDate} onChange={(value) => patchFilters({ fromDate: value, month: '' })} max={toDate || undefined} />
        <DatePickerField id="attendance-to" label="To" value={toDate} onChange={(value) => patchFilters({ toDate: value, month: '' })} min={fromDate || undefined} max={format(new Date(), 'yyyy-MM-dd')} />
        <div className="space-y-2">
          <Label htmlFor="attendance-year">Year</Label>
          <Input id="attendance-year" type="number" value={year} onChange={(event) => setFilter('year', event.target.value)} min="2000" max="2100" />
        </div>
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tracked Days" value={data?.summary.totalDays ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard label="Present Records" value={data?.summary.presentCount ?? 0} icon={<CalendarCheck2 className="h-5 w-5" />} accent="success" />
        <StatCard label="Absent Records" value={data?.summary.absentCount ?? 0} icon={<CalendarX2 className="h-5 w-5" />} accent="danger" />
        <StatCard label="Attendance %" value={fmtPercent(data?.summary.attendancePercent ?? null)} icon={<Percent className="h-5 w-5" />} accent={(data?.summary.attendancePercent ?? 0) >= 85 ? 'success' : (data?.summary.attendancePercent ?? 0) >= 70 ? 'warning' : 'danger'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <SectionCard title="Total Breakdown" description="Present vs absent totals for the current filtered scope.">
          <DonutChart data={donutData} config={chartConfig} emptyMessage="No attendance records are available." />
        </SectionCard>
        <SectionCard title="Day-Wise Attendance" className="lg:col-span-2" description="Daily present and absent totals for the selected date range.">
          <SimpleTrendChart title="Day-Wise Attendance" data={dailyTrend} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <SectionCard title="Month-Wise Attendance" description="Monthly attendance totals for the selected date range.">
          <SimpleTrendChart title="Month-Wise Attendance" data={monthlyTrend} />
        </SectionCard>
        <SectionCard
          title="Yearly Attendance View"
          description="Month-wise bars with an attendance-percentage line. Use the mode filter to focus on present, absent, or both."
        >
          <div className="mb-4 flex justify-end">
            <div className="w-[220px]">
              <SelectField
                id="attendance-year-mode"
                label="Bar mode"
                value={yearMode}
                onChange={(value) => setFilter('yearMode', value as 'present' | 'absent' | 'both')}
                options={[
                  { value: 'both', label: 'Present + absent' },
                  { value: 'present', label: 'Present only' },
                  { value: 'absent', label: 'Absent only' },
                ]}
              />
            </div>
          </div>
          <YearlyChart data={data?.yearlyTrend ?? []} mode={yearMode} />
        </SectionCard>
      </div>

      <SectionCard title="Student Stats Table" description="Useful when a batch or centre is selected and you need an individual student attendance breakdown.">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-sm space-y-2">
            <Label htmlFor="attendance-student-search">Search students</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="attendance-student-search" value={studentSearch} onChange={(event) => setFilter('studentSearch', event.target.value)} className="pl-9" placeholder="Search by name or code" />
            </div>
          </div>
          <div className="w-[180px]">
            <SelectField
              id="attendance-table-status"
              label="Table filter"
              value={tableStatus}
              onChange={(value) => setFilter('tableStatus', value as 'all' | 'present' | 'absent')}
              options={[
                { value: 'all', label: 'All' },
                { value: 'present', label: 'Present only' },
                { value: 'absent', label: 'Absent only' },
              ]}
            />
          </div>
        </div>

        {breakdownRows.length === 0 ? (
          <EmptyState title="No student breakdown" message="No student attendance rows match the current filters." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader className="bg-slate-950/35">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-right">Attendance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdownRows.map((row, index) => (
                  <TableRow key={row.student_id} className="hover:bg-white/5">
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.student_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.student_code || '-'}</div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sky-400">{row.present}</TableCell>
                    <TableCell className="text-center tabular-nums text-rose-400">{row.absent}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.total}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-300">{fmtPercent(row.percent)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
