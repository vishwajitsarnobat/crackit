'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { BarChart3, BookOpen, TrendingUp, UserX, Trophy } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
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

type SubjectBreakdown = { subject: string; average: number; top: number; examCount: number }

type PerformancePayload = {
  filters: {
    centres: { id: string; centre_name: string }[]
    batches: { id: string; batch_name: string; centre_id: string }[]
    students: { id: string; full_name: string | null; student_code: string | null; display_name?: string }[]
    subjects: string[]
    selectedStudentId: string | null
  }
  summary: { examsCount: number; marksEntries: number; absentCount: number; averagePercentage: number | null; topPercentage: number | null }
  trendMode: 'batch' | 'student'
  trend: { exam_id: string; exam_name: string; exam_date: string; percentage: number | null }[]
  batchComparison: { student_id: string; student_name: string | null; average_percentage: number; exam_count: number; consistency_score: number; score_deviation: number }[]
  subjectBreakdown: SubjectBreakdown[]
  marks: { exam_id: string; exam_name: string; exam_date: string; batch_name: string; student_id: string; student_name: string | null; student_code: string | null; marks_obtained: number; total_marks: number; is_absent: boolean; percentage: number | null; subject: string | null }[]
}

/* ── Helpers ───────────────────────────────────────── */

const fmt = (v: number | null) => v === null ? '-' : `${v.toFixed(1)}%`

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function tone(score: number) {
  if (score >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Strong' }
  if (score >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Moderate' }
  return { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', label: 'Needs attention' }
}

/* ── Trend Chart ──────────────────────────────────── */

function TrendChart({ points }: { points: PerformancePayload['trend'] }) {
  type DotProps = { cx?: number; cy?: number; index?: number }

  const plotted = useMemo(() =>
    points.filter(p => p.percentage !== null).map(p => {
      const words = p.exam_name.trim().split(/\s+/)
      const short = words.length <= 2 ? p.exam_name : `${words[0]} ${words[1]}`
      return { exam: p.exam_name, examDate: fmtDate(p.exam_date), xLabel: `${short} • ${format(new Date(p.exam_date), 'dd MMM')}`, percentage: Number(p.percentage) }
    }), [points])

  if (plotted.length < 2) return <EmptyState title="Not enough data" message="At least 2 exams needed for a trend chart." />

  const UP = '#16a34a', DOWN = '#dc2626', FIRST = '#2563eb'
  const chartData = plotted.map(p => ({ exam: p.exam, examDate: p.examDate, xLabel: p.xLabel, percentage: p.percentage }))
  const segments = plotted.slice(1).map((p, i) => ({ from: plotted[i], to: p, color: p.percentage >= plotted[i].percentage ? UP : DOWN }))
  const config = { percentage: { label: 'Percentage', color: 'var(--primary)' } } satisfies ChartConfig

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Y-axis: Score %</span><span>X-axis: Exam + Date</span>
      </div>
      <ScrollArea className="w-full pb-1">
        <div style={{ width: `${chartData.length * 160}px` }}>
          <ChartContainer config={config} className="h-[300px] w-full aspect-auto">
            <LineChart data={chartData} margin={{ left: 28, right: 36, top: 12, bottom: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <ReferenceArea y1={0} y2={50} fill="hsl(var(--destructive))" fillOpacity={0.04} />
              <ReferenceArea y1={50} y2={75} fill="hsl(var(--chart-4))" fillOpacity={0.05} />
              <ReferenceArea y1={75} y2={100} fill="hsl(var(--chart-2))" fillOpacity={0.05} />
              <XAxis dataKey="xLabel" tickLine={false} axisLine={false} tickMargin={10} interval={0} padding={{ left: 24, right: 24 }} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={34} />
              <ChartTooltip cursor={false} content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { exam?: string; examDate?: string } | undefined
                    return row?.exam ? `${row.exam} (${row.examDate ?? ''})` : ''
                  }}
                  formatter={(value, _, item) => {
                    const idx = item?.payload ? chartData.findIndex(r => r.exam === item.payload.exam) : -1
                    if (idx <= 0) return [fmt(Number(value)), 'Score']
                    const prev = Number(chartData[idx - 1].percentage)
                    const delta = Number(value) - prev
                    return [`${fmt(Number(value))} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)`, 'Score']
                  }}
                />
              } />
              {segments.map((s, i) => (
                <ReferenceLine key={`seg-${i}`} segment={[{ x: s.from.xLabel, y: s.from.percentage }, { x: s.to.xLabel, y: s.to.percentage }]} stroke={s.color} strokeWidth={3} ifOverflow="visible" />
              ))}
              <Line type="linear" dataKey="percentage" stroke="transparent" strokeWidth={0}
                dot={(p: DotProps) => {
                  const i = p.index ?? 0
                  const fill = i === 0 ? FIRST : plotted[i].percentage >= plotted[i - 1].percentage ? UP : DOWN
                  return <circle key={`d-${i}`} cx={p.cx} cy={p.cy} r={4.5} fill={fill} />
                }}
                activeDot={(p: DotProps) => {
                  const i = p.index ?? 0
                  const fill = i === 0 ? FIRST : plotted[i].percentage >= plotted[i - 1].percentage ? UP : DOWN
                  return <circle key={`ad-${i}`} cx={p.cx} cy={p.cy} r={6} fill={fill} />
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

/* ── Comparison Bars ──────────────────────────────── */

function ComparisonBars({ rows }: { rows: PerformancePayload['batchComparison'] }) {
  const [mode, setMode] = useState<'average' | 'consistency'>('average')
  const sorted = useMemo(() => {
    const arr = [...rows]
    return mode === 'average' ? arr.sort((a, b) => b.average_percentage - a.average_percentage) : arr.sort((a, b) => b.consistency_score - a.consistency_score)
  }, [rows, mode])

  if (!rows.length) return <EmptyState title="No comparison data" message="Marks are needed to compare students." />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant={mode === 'average' ? 'default' : 'outline'} onClick={() => setMode('average')}>Rank by Average</Button>
        <Button size="sm" variant={mode === 'consistency' ? 'default' : 'outline'} onClick={() => setMode('consistency')}>Rank by Consistency</Button>
      </div>
      <div className="rounded-lg border bg-background/60">
        <ScrollArea className="h-[270px]">
          <div className="space-y-2 p-2.5 pr-3">
            {sorted.map((r, i) => {
              const score = Number(mode === 'average' ? r.average_percentage.toFixed(2) : r.consistency_score.toFixed(2))
              const t = tone(score)
              return (
                <div key={r.student_id} className="rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted/30">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {(r.student_name ?? 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="truncate text-sm font-medium">{r.student_name ?? 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Position {i + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${t.text}`}>{fmt(score)}</p>
                      <p className="text-xs text-muted-foreground">{mode === 'average' ? `${r.exam_count} exams` : `σ ${r.score_deviation.toFixed(1)}`}</p>
                      <p className={`text-[11px] ${t.text}`}>{t.label}</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className={`${t.bar} h-2 rounded-full transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  )
}

/* ── Subject Breakdown Chart ──────────────────────── */

function SubjectChart({ data }: { data: SubjectBreakdown[] }) {
  if (!data.length) return <EmptyState title="No subject data" message="Exams need a subject assigned to show this chart." />

  const config = {
    average: { label: 'Average %', color: 'hsl(var(--accent))' },
    top: { label: 'Top %', color: 'hsl(var(--primary))' },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="mx-auto aspect-[4/3] max-h-[300px]">
      <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <PolarGrid className="stroke-muted/30" />
        <PolarAngleAxis dataKey="subject" className="text-xs font-medium" tick={{ fill: "currentColor" }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <ChartTooltip cursor={false} content={
          <ChartTooltipContent formatter={(value, name) => [fmt(Number(value)), name === 'average' ? 'Avg' : 'Top']} />
        } />
        <Radar dataKey="top" stroke="var(--color-top)" fill="var(--color-top)" fillOpacity={0.2} strokeWidth={2} />
        <Radar dataKey="average" stroke="var(--color-average)" fill="var(--color-average)" fillOpacity={0.5} strokeWidth={2} />
      </RadarChart>
    </ChartContainer>
  )
}

/* ── Section Card ─────────────────────────────────── */

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

/* ── Main Dashboard ───────────────────────────────── */

export function PerformanceDashboard({ initialData }: { initialData: PerformancePayload }) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [centreId, setCentreId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [subject, setSubject] = useState('')
  const [fromDate, setFromDate] = useState<Date | undefined>()
  const [toDate, setToDate] = useState<Date | undefined>()

  const visibleBatches = useMemo(() =>
    centreId ? data.filters.batches.filter(b => b.centre_id === centreId) : data.filters.batches,
    [centreId, data.filters.batches])

  function buildParams(overrides?: Record<string, string>) {
    const p = new URLSearchParams()
    const vals = { centreId, batchId, studentId, subject, from: fromDate ? format(fromDate, 'yyyy-MM-dd') : '', to: toDate ? format(toDate, 'yyyy-MM-dd') : '', ...overrides }
    for (const [k, v] of Object.entries(vals)) { if (v) p.set(k, v) }
    return p
  }

  async function loadData(params?: URLSearchParams) {
    setLoading(true)
    const q = params ? `?${params}` : ''
    const res = await fetch(`/api/analytics/performance${q}`, { cache: 'no-store' })
    const payload = await res.json().catch(() => null)
    setLoading(false)
    if (!res.ok || !payload) { toast.error(payload?.error ?? 'Failed to load performance data.'); return }
    setData(payload as PerformancePayload)
    if (!params) { setCentreId(payload.filters.centres[0]?.id ?? ''); setBatchId(payload.filters.batches[0]?.id ?? ''); setStudentId(''); setSubject('') }
  }

  function resetScopedFilters(nextCentreId: string) {
    setCentreId(nextCentreId)
    const first = nextCentreId === '' ? data.filters.batches[0] : data.filters.batches.find(b => b.centre_id === nextCentreId)
    setBatchId(first?.id ?? ''); setStudentId(''); setSubject('')
  }

  async function handleBatchChange(next: string) {
    setBatchId(next); setStudentId(''); setSubject('')
    await loadData(buildParams({ batchId: next, studentId: '', subject: '' }))
  }

  async function applyFilters() { await loadData(buildParams()) }

  useEffect(() => { loadData() }, [])

  // ── Filter options ──
  const centreOpts: FilterOption[] = [{ value: 'all', label: 'All centres' }, ...data.filters.centres.map(c => ({ value: c.id, label: c.centre_name }))]
  const batchOpts: FilterOption[] = visibleBatches.map(b => ({ value: b.id, label: b.batch_name }))
  const studentOpts: FilterOption[] = [{ value: 'all', label: 'All students (batch trend)' }, ...data.filters.students.map(s => ({ value: s.id, label: `${s.display_name ?? s.full_name ?? 'Unknown'}${s.student_code ? ` (${s.student_code})` : ''}` }))]
  const subjectOpts: FilterOption[] = [{ value: 'all', label: 'All subjects' }, ...data.filters.subjects.map(s => ({ value: s, label: s }))]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Student Performance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Analyze marks by student, batch, and subject. Results filtered by your role.</p>
      </div>

      {/* Filters */}
      <FilterBar gridClass="md:grid-cols-4 lg:grid-cols-4" description="Refine by centre, batch, student, subject, and date range." actions={
        <>
          <Button onClick={applyFilters} disabled={loading}>{loading ? 'Loading…' : 'Apply filters'}</Button>
          <Button variant="outline" onClick={() => { setFromDate(undefined); setToDate(undefined) }}>Clear dates</Button>
        </>
      }>
        <SelectFilter id="f-centre" label="Centre" value={centreId || 'all'} options={centreOpts} onChange={v => resetScopedFilters(v === 'all' ? '' : v)} />
        <SelectFilter id="f-batch" label="Batch" value={batchId} options={batchOpts} placeholder="Select batch" onChange={handleBatchChange} />
        <SelectFilter id="f-student" label="Student" value={studentId || 'all'} options={studentOpts} onChange={v => setStudentId(v === 'all' ? '' : v)} />
        <SelectFilter id="f-subject" label="Subject" value={subject || 'all'} options={subjectOpts} onChange={v => setSubject(v === 'all' ? '' : v)} />
        <DateFilter id="f-from" label="From" value={fromDate} onChange={setFromDate} />
        <DateFilter id="f-to" label="To" value={toDate} onChange={setToDate} />
      </FilterBar>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Exams" value={data.summary.examsCount} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Mark entries" value={data.summary.marksEntries} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard label="Average %" value={fmt(data.summary.averagePercentage)} icon={<TrendingUp className="h-5 w-5" />} accent={data.summary.averagePercentage !== null ? (data.summary.averagePercentage >= 75 ? 'success' : data.summary.averagePercentage >= 50 ? 'warning' : 'danger') : 'default'} />
        <StatCard label="Top %" value={fmt(data.summary.topPercentage)} icon={<Trophy className="h-5 w-5" />} accent="success" />
        <StatCard label="Absent entries" value={data.summary.absentCount} icon={<UserX className="h-5 w-5" />} accent={data.summary.absentCount > 0 ? 'danger' : 'default'} />
      </div>

      {/* Trend + Comparison */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <SectionCard title={data.trendMode === 'batch' ? 'Batch Trend' : 'Individual Trend'} description={data.trendMode === 'batch' ? 'Exam-wise average % for the selected batch.' : 'Exam-wise trend for the selected student.'}>
          <TrendChart points={data.trend} />
        </SectionCard>

        <SectionCard title="Batch Comparison" description="Student rankings in the current scope.">
          <ComparisonBars rows={data.batchComparison} />
        </SectionCard>
      </div>

      {/* Subject-Wise Analysis */}
      {data.subjectBreakdown.length > 0 && (
        <SectionCard title="Subject-Wise Analysis" description="Average and top percentages per subject.">
          <SubjectChart data={data.subjectBreakdown} />
        </SectionCard>
      )}

      {/* Detailed Marks Table */}
      <SectionCard title="Detailed Marks" description="Row-level exam scores for current filters.">
        {data.marks.length === 0 ? <EmptyState title="No marks" message="No marks found for the selected filters." /> : (
          <div className="overflow-hidden rounded-lg border">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
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
                {data.marks.map((r, i) => (
                  <TableRow key={`${r.exam_id}-${r.student_id}`} className={`transition-colors hover:bg-muted/30 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                    <TableCell>{fmtDate(r.exam_date)}</TableCell>
                    <TableCell>{r.exam_name}</TableCell>
                    <TableCell>{r.subject ?? <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{r.batch_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {(r.student_name ?? 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium leading-none">{r.student_name ?? 'Unknown'}</p>
                          {r.student_code && <p className="text-xs text-muted-foreground mt-1">{r.student_code}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {r.is_absent ? <Badge variant="destructive">Absent</Badge> : `${r.marks_obtained}/${r.total_marks}`}
                    </TableCell>
                    <TableCell>
                      {r.percentage === null ? (
                        <span className="text-muted-foreground text-right block w-full">-</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                            <div className={`h-full ${tone(r.percentage).bar} transition-all`} style={{ width: `${r.percentage}%` }} />
                          </div>
                          <Badge variant="outline" className={`${tone(r.percentage).text} min-w-[4rem] justify-center`}>{fmt(r.percentage)}</Badge>
                        </div>
                      )}
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
