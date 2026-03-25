'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Medal, Percent, Search, TrendingUp, UserRoundCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { format } from 'date-fns';

import { fetchJson } from '@/lib/http/fetch-json'
import { EmptyState } from '@/components/analytics/shared/empty-state'
import { FilterBar, SelectFilter, type FilterOption } from '@/components/analytics/shared/filter-bar'
import { SectionCard } from '@/components/analytics/shared/section-card'
import { StatCard } from '@/components/analytics/shared/stat-card'
import { DatePickerField } from '@/components/shared/form/date-picker-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PerformancePayload = {
  filters: {
    batches: { id: string; batch_name: string; centre_id: string }[]
    students: { id: string; display_name: string; student_code: string | null }[]
    subjects: string[]
  }
  summary: { examsCount: number; marksEntries: number; absentCount: number; averagePercentage: number | null; topPercentage: number | null }
  overallTrend: { exam_name: string; exam_date: string; average_percentage: number | null }[]
  subjectTrend: { subject: string; average_percentage: number; top_percentage: number }[]
  comparison: { student_id: string; student_name: string; average_percentage: number; consistency_score: number; exam_count: number; score_deviation: number; rank_position: number; consistency_rank: number | null }[]
  marks: { exam_id: string; exam_name: string; exam_date: string; batch_name: string; student_id: string; student_name: string; student_code: string | null; marks_obtained: number; total_marks: number; is_absent: boolean; percentage: number | null; subject: string | null }[]
}

const chartConfig = {
  average: { label: 'Average %', color: '#38bdf8' },
  top: { label: 'Top %', color: '#34d399' },
  consistency: { label: 'Consistency', color: '#a78bfa' },
} satisfies ChartConfig

const fmt = (value: number | null) => value === null ? '-' : `${value.toFixed(1)}%`

type AppliedPerformanceFilters = {
  batchId: string
  studentId: string
  subject: string
  from: string
  to: string
}

function buildPerformanceQueryString(filters: AppliedPerformanceFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return params.toString()
}

export function PerformanceDashboard() {
  const [batchId, setBatchId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [subject, setSubject] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<AppliedPerformanceFilters>({
    batchId: '',
    studentId: '',
    subject: '',
    from: '',
    to: '',
  })
  const [comparisonMode, setComparisonMode] = useState<'rank' | 'consistency'>('rank')
  const [tableSearch, setTableSearch] = useState('')

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: ['analytics-performance', appliedFilters],
    queryFn: async () => {
      const payload = await fetchJson<PerformancePayload>(`/api/analytics/performance?${buildPerformanceQueryString(appliedFilters)}`, {
        cache: 'no-store',
        errorPrefix: 'Load performance analytics',
      })
      return payload
    },
    staleTime: 30_000,
    retry: false,
  })

  const loading = isPending || isFetching

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load performance analytics')
    }
  }, [error])

  function applyFilters() {
    setAppliedFilters({
      batchId,
      studentId,
      subject,
      from: fromDate,
      to: toDate,
    })
  }

  const batchOptions: FilterOption[] = [{ value: 'all', label: 'All batches' }, ...(data?.filters.batches.map((batch) => ({ value: batch.id, label: batch.batch_name })) ?? [])]
  const studentOptions: FilterOption[] = [{ value: 'all', label: 'All students' }, ...(data?.filters.students.map((student) => ({ value: student.id, label: `${student.display_name}${student.student_code ? ` (${student.student_code})` : ''}` })) ?? [])]
  const subjectOptions: FilterOption[] = [{ value: 'all', label: 'All subjects' }, ...(data?.filters.subjects.map((entry) => ({ value: entry, label: entry })) ?? [])]

  const overallTrendData = useMemo(
    () => (data?.overallTrend ?? []).map((item) => ({ label: item.exam_name, average: item.average_percentage })),
    [data?.overallTrend],
  )

  const comparisonData = useMemo(() => {
    const source = [...(data?.comparison ?? [])]
    return comparisonMode === 'rank'
      ? source.sort((left, right) => right.average_percentage - left.average_percentage)
      : source.sort((left, right) => right.consistency_score - left.consistency_score)
  }, [comparisonMode, data?.comparison])

  const marksRows = useMemo(() => {
    const query = tableSearch.trim().toLowerCase()
    return (data?.marks ?? []).filter((row) => {
      if (!query) return true
      return row.student_name.toLowerCase().includes(query) || (row.student_code ?? '').toLowerCase().includes(query) || row.exam_name.toLowerCase().includes(query)
    })
  }, [data?.marks, tableSearch])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/45 px-8 py-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_right,rgba(52,211,153,0.10),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.52),rgba(2,6,23,0.86))]" />
        <div className="relative space-y-4">
          <Badge variant="outline" className="border-sky-400/30 bg-sky-400/10 text-sky-300">Analytics</Badge>
          <div className="max-w-3xl">
            <h1 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">Performance Intelligence</h1>
            <p className="mt-3 text-base text-slate-300">Compare overall performance, subject-wise strength, rank position, and consistency for students within your allowed scope.</p>
          </div>
        </div>
      </section>

      <FilterBar title="Performance Filters" description="Subject filters stay batch-aware so comparisons remain academically meaningful, so there is no centre-level filter on this page." gridClass="md:grid-cols-3 xl:grid-cols-5" actions={<Button onClick={applyFilters} disabled={loading}>{loading ? 'Loading...' : 'Apply filters'}</Button>}>
        <SelectFilter id="perf-batch" label="Batch" value={batchId || 'all'} options={batchOptions} onChange={(value) => { setBatchId(value === 'all' ? '' : value); setStudentId(''); }} />
        <SelectFilter id="perf-student" label="Student" value={studentId || 'all'} options={studentOptions} onChange={(value) => setStudentId(value === 'all' ? '' : value)} />
        <SelectFilter id="perf-subject" label="Subject" value={subject || 'all'} options={subjectOptions} onChange={(value) => setSubject(value === 'all' ? '' : value)} />
        <DatePickerField id="perf-from" label="From" value={fromDate} onChange={setFromDate} max={toDate || undefined} />
        <DatePickerField id="perf-to" label="To" value={toDate} onChange={setToDate} min={fromDate || undefined} max={format(new Date(), 'yyyy-MM-dd')} />
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Exams" value={data?.summary.examsCount ?? 0} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Mark Entries" value={data?.summary.marksEntries ?? 0} icon={<UserRoundCheck className="h-5 w-5" />} />
        <StatCard label="Average %" value={fmt(data?.summary.averagePercentage ?? null)} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        <StatCard label="Top %" value={fmt(data?.summary.topPercentage ?? null)} icon={<Medal className="h-5 w-5" />} accent="warning" />
        <StatCard label="Absent Entries" value={data?.summary.absentCount ?? 0} icon={<Percent className="h-5 w-5" />} accent="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title="Overall Trend" description="Exam-wise performance trend for the selected batch or student.">
          {!overallTrendData.length ? (
            <EmptyState title="No performance trend" message="No exam data exists for the current filters." />
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full aspect-auto">
              <ComposedChart data={overallTrendData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="average" fill="var(--color-average)" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="average" stroke="var(--color-top)" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ChartContainer>
          )}
        </SectionCard>

        <SectionCard title="Subject-Wise View" description="Overall and subject-wise comparison without centre-level subject mixing.">
          {!data?.subjectTrend.length ? (
            <EmptyState title="No subject comparison" message="Subjects appear once exams include subject information." />
          ) : (
            <ChartContainer config={chartConfig} className="mx-auto aspect-[4/3] max-h-[320px]">
              <RadarChart data={data.subjectTrend}>
                <PolarGrid className="stroke-muted/30" />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Radar dataKey="average_percentage" stroke="var(--color-average)" fill="var(--color-average)" fillOpacity={0.35} />
                <Radar dataKey="top_percentage" stroke="var(--color-top)" fill="var(--color-top)" fillOpacity={0.12} />
              </RadarChart>
            </ChartContainer>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Comparison View" description="Switch between rank-wise and consistency-wise comparison for the selected group.">
        <div className="mb-4 flex gap-2">
          <Button size="sm" variant={comparisonMode === 'rank' ? 'default' : 'outline'} onClick={() => setComparisonMode('rank')}>Rank-wise</Button>
          <Button size="sm" variant={comparisonMode === 'consistency' ? 'default' : 'outline'} onClick={() => setComparisonMode('consistency')}>Consistency-wise</Button>
        </div>

        {!comparisonData.length ? (
          <EmptyState title="No comparison data" message="Marks are required before student comparison can be calculated." />
        ) : (
          <div className="space-y-4">
            <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
              <BarChart data={comparisonData.map((row) => ({ name: row.student_name, rank: row.average_percentage, consistency: row.consistency_score }))}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} minTickGap={16} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey={comparisonMode === 'rank' ? 'rank' : 'consistency'} fill={comparisonMode === 'rank' ? 'var(--color-average)' : 'var(--color-consistency)'} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {comparisonData.slice(0, 6).map((row) => (
                <div key={row.student_id} className="rounded-xl border border-white/10 bg-slate-950/25 p-4 text-sm">
                  <div className="font-medium">{row.student_name}</div>
                  <div className="mt-2 grid gap-1 text-muted-foreground">
                    <div>Rank position: <span className="font-medium text-foreground">#{row.rank_position}</span></div>
                    <div>Consistency rank: <span className="font-medium text-foreground">{row.consistency_rank ? `#${row.consistency_rank}` : '-'}</span></div>
                    <div>Average: <span className="font-medium text-foreground">{fmt(row.average_percentage)}</span></div>
                    <div>Consistency: <span className="font-medium text-foreground">{fmt(row.consistency_score)}</span></div>
                    <div>Exams used: <span className="font-medium text-foreground">{row.exam_count}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Detailed Marks Table" description="Useful when a group of students is selected and you need row-level marks for each subject.">
        <div className="mb-4 max-w-sm space-y-2">
          <Label htmlFor="marks-search">Search marks rows</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="marks-search" value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} className="pl-9" placeholder="Search student or exam" />
          </div>
        </div>

        {!marksRows.length ? (
          <EmptyState title="No marks table rows" message="No detailed marks match the current filters." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader className="bg-slate-950/35">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marksRows.map((row) => (
                  <TableRow key={`${row.exam_id}-${row.student_id}`} className="hover:bg-white/5">
                    <TableCell>{row.exam_date}</TableCell>
                    <TableCell>{row.exam_name}</TableCell>
                    <TableCell>{row.subject ?? '-'}</TableCell>
                    <TableCell>{row.batch_name}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.student_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.student_code || '-'}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.is_absent ? 'Absent' : `${row.marks_obtained}/${row.total_marks}`}</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-300">{fmt(row.percentage)}</Badge></TableCell>
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
