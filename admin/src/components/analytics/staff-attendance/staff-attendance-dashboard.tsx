'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Clock3, Percent, UserCheck, UserMinus, UserX } from 'lucide-react'
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
import { useStaffAttendanceAnalyticsFilterStore } from '@/lib/stores/staff-attendance-analytics-filters'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

type StaffAttendancePayload = {
  filters: {
    centres: { id: string; centre_name: string }[]
    batches: { id: string; batch_name: string; centre_id: string }[]
    teachers: { id: string; full_name: string }[]
  }
  summary: { totalDays: number; presentCount: number; absentCount: number; partialCount: number; attendancePercent: number | null }
  dailyTrend: { date: string; present: number; absent: number; partial: number }[]
  monthlyTrend: { month: string; present: number; absent: number; partial: number }[]
  yearlyTrend: { month: string; present: number; absent: number; partial: number; percent: number | null }[]
  teacherBreakdown: { user_id: string; teacher_name: string; present: number; absent: number; partial: number; total: number; percent: number | null }[]
}

type AppliedStaffAttendanceFilters = {
  centreId: string
  batchId: string
  teacherId: string
  from: string
  to: string
  year: string
}

const chartConfig = {
  present: { label: 'Present', color: '#38bdf8' },
  absent: { label: 'Absent', color: '#fb7185' },
  partial: { label: 'Partial', color: '#f59e0b' },
  percent: { label: 'Attendance %', color: '#34d399' },
} satisfies ChartConfig

const fmtPercent = (value: number | null) => value === null ? '-' : `${value.toFixed(1)}%`
const prettyMonth = (value: string) => format(new Date(`${value}-01T00:00:00`), 'MMM')
const prettyDate = (value: string) => format(new Date(`${value}T00:00:00`), 'dd MMM')

function buildStaffAttendanceQueryString(filters: AppliedStaffAttendanceFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return params.toString()
}

function TrendChart({ data }: { data: { label: string; present: number; absent: number; partial: number }[] }) {
  if (!data.length) return <EmptyState title="No trend data" message="Try widening the date range or clearing teacher filters." />

  return (
    <ChartContainer config={chartConfig} className="h-[290px] w-full aspect-auto">
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="present" fill="var(--color-present)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="partial" fill="var(--color-partial)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="absent" fill="var(--color-absent)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

function YearlyChart({ data, mode }: { data: StaffAttendancePayload['yearlyTrend']; mode: 'present' | 'absent' | 'partial' | 'all' }) {
  if (!data.length) return <EmptyState title="No yearly data" message="No yearly staff attendance records match the current filters." />

  const chartData = data.map((item) => ({ ...item, monthLabel: prettyMonth(item.month) }))

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full aspect-auto">
      <ComposedChart data={chartData}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
        <YAxis yAxisId="count" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis yAxisId="percent" orientation="right" tickLine={false} axisLine={false} domain={[0, 100]} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {(mode === 'all' || mode === 'present') && <Bar yAxisId="count" dataKey="present" fill="var(--color-present)" radius={[6, 6, 0, 0]} />}
        {(mode === 'all' || mode === 'partial') && <Bar yAxisId="count" dataKey="partial" fill="var(--color-partial)" radius={[6, 6, 0, 0]} />}
        {(mode === 'all' || mode === 'absent') && <Bar yAxisId="count" dataKey="absent" fill="var(--color-absent)" radius={[6, 6, 0, 0]} />}
        <Line yAxisId="percent" type="monotone" dataKey="percent" stroke="var(--color-percent)" strokeWidth={3} dot={{ r: 4 }} />
      </ComposedChart>
    </ChartContainer>
  )
}

export function StaffAttendanceDashboard({ role }: { role: string }) {
  const {
    centreId,
    batchId,
    teacherId,
    fromDate,
    toDate,
    year,
    yearMode,
    tableFilter,
    patchFilters,
    resetFilters,
    setFilter,
  } = useStaffAttendanceAnalyticsFilterStore()
  const [appliedFilters, setAppliedFilters] = useState<AppliedStaffAttendanceFilters>({
    centreId: '',
    batchId: '',
    teacherId: '',
    from: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    year: String(new Date().getFullYear()),
  })

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: ['analytics-staff-attendance', appliedFilters],
    queryFn: async () => {
      const payload = await fetchJson<StaffAttendancePayload>(`/api/analytics/staff-attendance?${buildStaffAttendanceQueryString(appliedFilters)}`, {
        cache: 'no-store',
        errorPrefix: 'Load staff attendance analytics',
      })
      return payload
    },
    staleTime: 30_000,
    retry: false,
  })

  const loading = isPending || isFetching

  useQueryErrorToast(error, 'Failed to load staff attendance analytics')

  function applyFilters() {
    setAppliedFilters({
      centreId,
      batchId,
      teacherId,
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
  const teacherOptions: FilterOption[] = [{ value: 'all', label: role === 'teacher' ? 'My attendance' : 'All teachers' }, ...(data?.filters.teachers.map((teacher) => ({ value: teacher.id, label: teacher.full_name })) ?? [])]

  const dailyTrend = useMemo(() => (data?.dailyTrend ?? []).map((item) => ({ label: prettyDate(item.date), present: item.present, absent: item.absent, partial: item.partial })), [data?.dailyTrend])
  const monthlyTrend = useMemo(() => (data?.monthlyTrend ?? []).map((item) => ({ label: prettyMonth(item.month), present: item.present, absent: item.absent, partial: item.partial })), [data?.monthlyTrend])
  const donutData = useMemo(() => [
    { name: 'present', value: data?.summary.presentCount ?? 0, fill: '#38bdf8' },
    { name: 'partial', value: data?.summary.partialCount ?? 0, fill: '#f59e0b' },
    { name: 'absent', value: data?.summary.absentCount ?? 0, fill: '#fb7185' },
  ], [data?.summary.absentCount, data?.summary.partialCount, data?.summary.presentCount])

  const breakdownRows = useMemo(() => (data?.teacherBreakdown ?? []).filter((row) => {
    if (tableFilter === 'present') return row.present > 0
    if (tableFilter === 'absent') return row.absent > 0
    if (tableFilter === 'partial') return row.partial > 0
    return true
  }), [data?.teacherBreakdown, tableFilter])

  useEffect(() => {
    if (batchId && !visibleBatches.some((batch) => batch.id === batchId)) {
      patchFilters({ batchId: '', teacherId: '' })
    }
  }, [batchId, patchFilters, visibleBatches])

  useEffect(() => {
    const teacherIds = new Set((data?.filters.teachers ?? []).map((teacher) => teacher.id))
    if (teacherId && !teacherIds.has(teacherId)) {
      setFilter('teacherId', '')
    }
  }, [data?.filters.teachers, setFilter, teacherId])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden glass-panel soft-ring rounded-[32px] px-8 py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.34),transparent_30%),radial-gradient(circle_at_right,rgba(4,231,254,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.16))] dark:bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.18),transparent_28%),radial-gradient(circle_at_right,rgba(4,231,254,0.08),transparent_22%),linear-gradient(180deg,rgba(24,35,28,0.34),rgba(10,16,12,0.16))]" />
        <div className="relative space-y-4">
          <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Analytics</Badge>
          <div className="max-w-3xl">
            <h1 className="font-serif text-4xl tracking-tight text-secondary dark:text-foreground sm:text-5xl">Staff Attendance Analysis</h1>
            <p className="mt-3 text-base text-muted-foreground">Track teacher attendance with present, absent, and partial categories, then compare daily, monthly, yearly, and individual teacher patterns.</p>
          </div>
        </div>
      </section>

      <FilterBar title="Staff Attendance Filters" description={role === 'teacher' ? 'Teacher view is self-only, so centre and batch filters are intentionally hidden.' : 'Use centre, batch, teacher, date range, and year filters to inspect staff attendance.'} gridClass={role === 'teacher' ? 'md:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-3 xl:grid-cols-6'} actions={<div className="flex gap-2"><Button onClick={applyFilters} disabled={loading}>{loading ? 'Loading...' : 'Apply filters'}</Button><Button variant="outline" onClick={() => { const defaultFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd'); const defaultTo = format(new Date(), 'yyyy-MM-dd'); const defaultYear = String(new Date().getFullYear()); resetFilters(); setAppliedFilters({ centreId: '', batchId: '', teacherId: '', from: defaultFrom, to: defaultTo, year: defaultYear }) }}>Reset range</Button></div>}>
        {role !== 'teacher' && data?.filters.centres && data.filters.centres.length > 0 && <SelectFilter id="staff-centre" label="Centre" value={centreId || 'all'} options={centreOptions} onChange={(value) => { patchFilters({ centreId: value === 'all' ? '' : value, batchId: '', teacherId: '' }) }} />}
        {role !== 'teacher' && <SelectFilter id="staff-batch" label="Batch" value={batchId || 'all'} options={batchOptions} onChange={(value) => setFilter('batchId', value === 'all' ? '' : value)} />}
        <SelectFilter id="staff-teacher" label={role === 'teacher' ? 'Teacher' : 'Teacher'} value={teacherId || 'all'} options={teacherOptions} onChange={(value) => setFilter('teacherId', value === 'all' ? '' : value)} />
        <DatePickerField id="staff-from" label="From" value={fromDate} onChange={(value) => setFilter('fromDate', value)} max={toDate || undefined} />
        <DatePickerField id="staff-to" label="To" value={toDate} onChange={(value) => setFilter('toDate', value)} min={fromDate || undefined} max={format(new Date(), 'yyyy-MM-dd')} />
        <div className="space-y-2"><Label htmlFor="staff-year">Year</Label><Input id="staff-year" type="number" value={year} onChange={(event) => setFilter('year', event.target.value)} min="2000" max="2100" /></div>
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Tracked Days" value={data?.summary.totalDays ?? 0} icon={<Clock3 className="h-5 w-5" />} />
        <StatCard label="Present" value={data?.summary.presentCount ?? 0} icon={<UserCheck className="h-5 w-5" />} accent="success" />
        <StatCard label="Partial" value={data?.summary.partialCount ?? 0} icon={<UserMinus className="h-5 w-5" />} accent="warning" />
        <StatCard label="Absent" value={data?.summary.absentCount ?? 0} icon={<UserX className="h-5 w-5" />} accent="danger" />
        <StatCard label="Attendance %" value={fmtPercent(data?.summary.attendancePercent ?? null)} icon={<Percent className="h-5 w-5" />} accent={(data?.summary.attendancePercent ?? 0) >= 85 ? 'success' : (data?.summary.attendancePercent ?? 0) >= 70 ? 'warning' : 'danger'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <SectionCard title="Total Breakdown" description="Present vs partial vs absent totals in the current scope.">
          <DonutChart data={donutData} config={chartConfig} emptyMessage="No staff attendance records are available." />
        </SectionCard>
        <SectionCard title="Day-Wise Attendance" className="lg:col-span-2" description="Daily present, partial, and absent staff attendance totals.">
          <TrendChart data={dailyTrend} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <SectionCard title="Month-Wise Attendance" description="Monthly staff attendance totals for the selected date range.">
          <TrendChart data={monthlyTrend} />
        </SectionCard>
        <SectionCard title="Yearly Attendance View" description="Month-wise bars with an attendance-percentage line and mode filter for present, absent, partial, or all.">
          <div className="mb-4 flex justify-end">
            <div className="w-full max-w-[220px]">
               <SelectField id="staff-year-mode" label="Bar mode" value={yearMode} onChange={(value) => setFilter('yearMode', value as 'present' | 'absent' | 'partial' | 'all')} options={[{ value: 'all', label: 'All statuses' }, { value: 'present', label: 'Present only' }, { value: 'partial', label: 'Partial only' }, { value: 'absent', label: 'Absent only' }]} />
            </div>
          </div>
          <YearlyChart data={data?.yearlyTrend ?? []} mode={yearMode} />
        </SectionCard>
      </div>

      <SectionCard title="Teacher Stats Table" description="Useful when centre or batch scope is selected and individual teacher attendance needs detailed review.">
          <div className="mb-4 flex justify-end">
          <div className="w-full max-w-[180px]">
             <SelectField id="teacher-table-filter" label="Table filter" value={tableFilter} onChange={(value) => setFilter('tableFilter', value as 'all' | 'present' | 'absent' | 'partial')} options={[{ value: 'all', label: 'All' }, { value: 'present', label: 'Present' }, { value: 'partial', label: 'Partial' }, { value: 'absent', label: 'Absent' }]} />
           </div>
         </div>

        {!breakdownRows.length ? (
          <EmptyState title="No teacher breakdown" message="No teacher attendance rows match the current filters." />
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-secondary/10">
            <Table>
              <TableHeader className="bg-primary/8 dark:bg-white/[0.03]">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Partial</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-right">Attendance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdownRows.map((row, index) => (
                  <TableRow key={row.user_id} className="hover:bg-primary/8 dark:hover:bg-white/[0.03]">
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.teacher_name}</TableCell>
                    <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-300">{row.present}</TableCell>
                    <TableCell className="text-center tabular-nums text-amber-400">{row.partial}</TableCell>
                    <TableCell className="text-center tabular-nums text-rose-400">{row.absent}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.total}</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">{fmtPercent(row.percent)}</Badge></TableCell>
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
