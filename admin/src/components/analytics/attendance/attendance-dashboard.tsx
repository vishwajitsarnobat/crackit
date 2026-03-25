'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth, subDays } from 'date-fns'
import { CalendarDays, CalendarCheck2, CalendarX2, Percent, Search } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

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
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

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

const MONTH_OPTIONS = [
  { value: 'all', label: 'All months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const

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

  useQueryErrorToast(error, 'Failed to load attendance analytics')

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
      <section className="relative overflow-hidden glass-panel soft-ring rounded-[32px] px-8 py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.34),transparent_32%),radial-gradient(circle_at_right,rgba(4,231,254,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.16))] dark:bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.18),transparent_28%),radial-gradient(circle_at_right,rgba(4,231,254,0.08),transparent_22%),linear-gradient(180deg,rgba(24,35,28,0.34),rgba(10,16,12,0.16))]" />
        <div className="relative space-y-4">
          <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Analytics</Badge>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="max-w-[13ch] font-serif text-4xl leading-[1.03] tracking-[-0.03em] text-secondary dark:text-primary sm:text-5xl">Attendance Analysis</h1>
              <p className="mt-3 max-w-[58ch] text-[15px] leading-7 text-muted-foreground">Explore student, batch, or centre attendance with day-wise, month-wise, and year-wise views plus a detailed student breakdown.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex min-h-[96px] flex-col justify-between rounded-[24px] border border-secondary/10 bg-white/55 px-4 py-4 dark:bg-white/[0.04]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Date range</div>
                <div className="mt-3 text-lg font-semibold leading-6 text-secondary dark:text-foreground">{fromDate} {'->'} {toDate}</div>
              </div>
              <div className="flex min-h-[96px] flex-col justify-between rounded-[24px] border border-secondary/10 bg-white/55 px-4 py-4 dark:bg-white/[0.04]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Year focus</div>
                <div className="mt-3 text-lg font-semibold leading-6 text-secondary dark:text-foreground">{year}</div>
              </div>
              <div className="flex min-h-[96px] flex-col justify-between rounded-[24px] border border-secondary/10 bg-white/55 px-4 py-4 dark:bg-white/[0.04]">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Student scope</div>
                <div className="mt-3 text-lg font-semibold leading-6 text-secondary dark:text-foreground">{studentId ? 'Selected student' : 'Batch / centre view'}</div>
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
        <SelectField
          id="attendance-month"
          label="Month"
          value={month ? month.slice(5, 7) : 'all'}
          options={MONTH_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          onChange={(value) => {
            if (value === 'all') {
              patchFilters({ month: '', fromDate: '', toDate: '' })
              return
            }

            const nextMonth = `${year}-${value}`
            const monthStart = format(startOfMonth(new Date(`${nextMonth}-01T00:00:00`)), 'yyyy-MM-dd')
            const monthEnd = format(endOfMonth(new Date(`${nextMonth}-01T00:00:00`)), 'yyyy-MM-dd')
            patchFilters({ month: nextMonth, fromDate: monthStart, toDate: monthEnd })
          }}
        />
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
            <div className="w-full max-w-[220px]">
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
          <div className="overflow-hidden rounded-[24px] border border-secondary/10">
            <Table>
              <TableHeader className="bg-primary/8 dark:bg-white/[0.03]">
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
                  <TableRow key={row.student_id} className="hover:bg-primary/8 dark:hover:bg-white/[0.03]">
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.student_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.student_code || '-'}</div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-300">{row.present}</TableCell>
                    <TableCell className="text-center tabular-nums text-rose-400">{row.absent}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.total}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">{fmtPercent(row.percent)}</Badge>
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
