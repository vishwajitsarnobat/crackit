'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PerformancePayload = {
  filters: {
    centres: Array<{ id: string; centre_name: string }>
    batches: Array<{ id: string; batch_name: string; centre_id: string }>
    students: Array<{
      id: string
      full_name: string | null
      student_code: string | null
      display_name?: string
    }>
    selectedStudentId: string | null
  }
  summary: {
    examsCount: number
    marksEntries: number
    absentCount: number
    averagePercentage: number | null
    topPercentage: number | null
  }
  trendMode: 'batch' | 'student'
  trend: Array<{
    exam_id: string
    exam_name: string
    exam_date: string
    percentage: number | null
  }>
  batchComparison: Array<{
    student_id: string
    student_name: string | null
    average_percentage: number
    exam_count: number
    consistency_score: number
    score_deviation: number
  }>
  marks: Array<{
    exam_id: string
    exam_name: string
    exam_date: string
    batch_name: string
    student_id: string
    student_name: string | null
    student_code: string | null
    marks_obtained: number
    total_marks: number
    is_absent: boolean
    percentage: number | null
  }>
}

function DateFilterField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className="h-10 w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'dd MMM yyyy') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function formatPercent(value: number | null) {
  if (value === null) return '-'
  return `${value.toFixed(2)}%`
}

function formatDate(dateText: string) {
  return new Date(dateText).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getPerformanceTone(score: number) {
  if (score >= 75) {
    return {
      bar: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'Strong',
    }
  }

  if (score >= 50) {
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Moderate',
    }
  }

  return {
    bar: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-400',
    label: 'Needs attention',
  }
}

function TrendChart({ points }: { points: PerformancePayload['trend'] }) {
  type DotProps = { cx?: number; cy?: number; index?: number }

  const toShortExamLabel = (examName: string) => {
    const words = examName.trim().split(/\s+/)
    if (words.length <= 2) return examName
    return `${words[0]} ${words[1]}`
  }

  const plotted = useMemo(
    () =>
      points
        .filter(point => point.percentage !== null)
        .map(point => ({
          exam: point.exam_name,
          examDate: formatDate(point.exam_date),
          xLabel: `${toShortExamLabel(point.exam_name)} • ${format(new Date(point.exam_date), 'dd MMM')}`,
          percentage: Number(point.percentage),
        })),
    [points]
  )

  if (plotted.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough data for trend chart.</p>
  }

  const UP_COLOR = '#16a34a'
  const DOWN_COLOR = '#dc2626'
  const NEUTRAL_COLOR = '#2563eb'

  const chartData = plotted.map(point => ({
    exam: point.exam,
    examDate: point.examDate,
    xLabel: point.xLabel,
    percentage: point.percentage,
  }))

  const pointSlotWidth = 160
  const chartWidth = chartData.length * pointSlotWidth

  const lineSegments = plotted.slice(1).map((point, index) => {
    const previous = plotted[index]
    return {
      from: previous,
      to: point,
      color: point.percentage >= previous.percentage ? UP_COLOR : DOWN_COLOR,
    }
  })

  const chartConfig = {
    percentage: {
      label: 'Percentage',
      color: 'var(--primary)',
    },
  } satisfies ChartConfig

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Y-axis: Score %</span>
        <span>X-axis: Exam + Date</span>
      </div>
      <ScrollArea className="w-full pb-1">
        <div style={{ width: `${chartWidth}px` }}>
          <ChartContainer config={chartConfig} className="h-[330px] w-full aspect-auto">
            <LineChart data={chartData} margin={{ left: 28, right: 36, top: 12, bottom: 8 }}>
              <CartesianGrid vertical={false} />
              <ReferenceArea y1={0} y2={50} fill="hsl(var(--destructive))" fillOpacity={0.05} />
              <ReferenceArea y1={50} y2={75} fill="hsl(var(--chart-4))" fillOpacity={0.06} />
              <ReferenceArea y1={75} y2={100} fill="hsl(var(--chart-2))" fillOpacity={0.06} />
              <XAxis
                dataKey="xLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                interval={0}
                padding={{ left: 24, right: 24 }}
              />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={34} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { exam?: string; examDate?: string } | undefined
                      if (!row?.exam) return ''
                      return `${row.exam} (${row.examDate ?? ''})`
                    }}
                    formatter={(value, _, item) => {
                      const index = item?.payload
                        ? chartData.findIndex(row => row.exam === item.payload.exam)
                        : -1
                      if (index <= 0) {
                        return [formatPercent(Number(value)), 'Score']
                      }

                      const previous = Number(chartData[index - 1].percentage)
                      const current = Number(value)
                      const delta = Number((current - previous).toFixed(2))
                      const trend = delta >= 0 ? `+${delta.toFixed(2)}%` : `${delta.toFixed(2)}%`

                      return [`${formatPercent(current)} (${trend})`, 'Score']
                    }}
                  />
                }
              />
              {lineSegments.map((segment, index) => (
                <ReferenceLine
                  key={`${segment.from.exam}-${segment.to.exam}-${index}`}
                  segment={[
                    { x: segment.from.xLabel, y: segment.from.percentage },
                    { x: segment.to.xLabel, y: segment.to.percentage },
                  ]}
                  stroke={segment.color}
                  strokeWidth={3}
                  ifOverflow="visible"
                />
              ))}
              <Line
                type="linear"
                dataKey="percentage"
                stroke="transparent"
                strokeWidth={0}
                dot={(props: DotProps) => {
                  const idx = props.index ?? 0
                  const dotKey = `trend-dot-${idx}-${props.cx ?? 0}-${props.cy ?? 0}`
                  if (idx === 0) {
                    return <circle key={dotKey} cx={props.cx} cy={props.cy} r={4.5} fill={NEUTRAL_COLOR} />
                  }

                  const isUp = plotted[idx].percentage >= plotted[idx - 1].percentage
                  return (
                    <circle
                      key={dotKey}
                      cx={props.cx}
                      cy={props.cy}
                      r={4.5}
                      fill={isUp ? UP_COLOR : DOWN_COLOR}
                    />
                  )
                }}
                activeDot={(props: DotProps) => {
                  const idx = props.index ?? 0
                  const dotKey = `trend-active-dot-${idx}-${props.cx ?? 0}-${props.cy ?? 0}`
                  if (idx === 0) {
                    return <circle key={dotKey} cx={props.cx} cy={props.cy} r={6} fill={NEUTRAL_COLOR} />
                  }

                  const isUp = plotted[idx].percentage >= plotted[idx - 1].percentage
                  return (
                    <circle
                      key={dotKey}
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill={isUp ? UP_COLOR : DOWN_COLOR}
                    />
                  )
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

function ComparisonBars({ rows }: { rows: PerformancePayload['batchComparison'] }) {
  const [mode, setMode] = useState<'average' | 'consistency'>('average')

  const sortedRows = useMemo(() => {
    const next = [...rows]
    if (mode === 'average') {
      next.sort((a, b) => b.average_percentage - a.average_percentage)
    } else {
      next.sort((a, b) => b.consistency_score - a.consistency_score)
    }
    return next
  }, [rows, mode])

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No comparison data available.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={mode === 'average' ? 'default' : 'outline'}
          onClick={() => setMode('average')}
        >
          Rank by Average
        </Button>
        <Button
          size="sm"
          variant={mode === 'consistency' ? 'default' : 'outline'}
          onClick={() => setMode('consistency')}
        >
          Rank by Consistency
        </Button>
      </div>

      <div className="rounded-md border bg-background/60">
        <ScrollArea className="h-[305px]">
          <div className="space-y-2 p-2.5 pr-3">
          {sortedRows.map((row, index) => {
            const score = Number(
              mode === 'average' ? row.average_percentage.toFixed(2) : row.consistency_score.toFixed(2)
            )
            const tone = getPerformanceTone(score)

            return (
              <div key={row.student_id} className="rounded-md border bg-muted/20 p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-snug">{row.student_name ?? 'Unknown student'}</p>
                    <p className="text-xs text-muted-foreground">Position {index + 1}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tone.text}`}>{formatPercent(score)}</p>
                    <p className="text-xs text-muted-foreground">
                      {mode === 'average'
                        ? `${row.exam_count} exams`
                        : `Deviation: ${row.score_deviation.toFixed(2)}`}
                    </p>
                    <p className={`text-[11px] ${tone.text}`}>{tone.label}</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className={`${tone.bar} h-2 rounded-full`} style={{ width: `${Math.min(score, 100)}%` }} />
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

export function PerformanceDashboard({ initialData }: { initialData: PerformancePayload }) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)

  const [centreId, setCentreId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [fromDate, setFromDate] = useState<Date | undefined>()
  const [toDate, setToDate] = useState<Date | undefined>()

  const visibleBatches = useMemo(() => {
    if (!centreId) return data.filters.batches
    return data.filters.batches.filter(batch => batch.centre_id === centreId)
  }, [centreId, data.filters.batches])

  function resetScopedFilters(nextCentreId: string) {
    setCentreId(nextCentreId)
    const firstBatch =
      nextCentreId === ''
        ? data.filters.batches[0]
        : data.filters.batches.find(batch => batch.centre_id === nextCentreId)
    setBatchId(firstBatch?.id ?? '')
    setStudentId('')
  }

  async function handleBatchChange(nextBatchId: string) {
    setBatchId(nextBatchId)
    setStudentId('')

    const params = new URLSearchParams()
    if (centreId) params.set('centreId', centreId)
    if (nextBatchId) params.set('batchId', nextBatchId)
    if (fromDate) params.set('from', format(fromDate, 'yyyy-MM-dd'))
    if (toDate) params.set('to', format(toDate, 'yyyy-MM-dd'))

    await loadData(params)
  }

  async function loadData(params?: URLSearchParams) {
    setLoading(true)

    const query = params ? `?${params.toString()}` : ''
    const response = await fetch(`/api/analytics/performance${query}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    setLoading(false)

    if (!response.ok || !payload) {
      toast.error(payload?.error ?? 'Failed to load performance data.')
      return
    }

    const nextData = payload as PerformancePayload
    setData(nextData)

    if (!params) {
      setCentreId(nextData.filters.centres[0]?.id ?? '')
      setBatchId(nextData.filters.batches[0]?.id ?? '')
      setStudentId('')
    }
  }

  async function applyFilters() {
    const params = new URLSearchParams()
    if (centreId) params.set('centreId', centreId)
    if (batchId) params.set('batchId', batchId)
    if (studentId) params.set('studentId', studentId)
    if (fromDate) params.set('from', format(fromDate, 'yyyy-MM-dd'))
    if (toDate) params.set('to', format(toDate, 'yyyy-MM-dd'))
    await loadData(params)
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Student Performance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Analyze marks by student and batch. Results are filtered automatically by RLS.
        </p>
      </div>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base tracking-tight">Filters</CardTitle>
          <CardDescription>Refine by centre, batch, student and date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 px-5 md:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="filter-centre">Centre</Label>
            <Select value={centreId || 'all'} onValueChange={value => resetScopedFilters(value === 'all' ? '' : value)}>
              <SelectTrigger id="filter-centre" className="h-10 w-full">
                <SelectValue placeholder="All centres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All centres</SelectItem>
                {data.filters.centres.map(centre => (
                  <SelectItem key={centre.id} value={centre.id}>
                    {centre.centre_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-batch">Batch</Label>
            <Select value={batchId} onValueChange={handleBatchChange}>
              <SelectTrigger id="filter-batch" className="h-10 w-full">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {visibleBatches.map(batch => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.batch_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-student">Student</Label>
            <Select value={studentId || 'all'} onValueChange={value => setStudentId(value === 'all' ? '' : value)}>
              <SelectTrigger id="filter-student" className="h-10 w-full">
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students (batch trend)</SelectItem>
                {data.filters.students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.display_name ?? student.full_name ?? 'Unknown student'}
                    {student.student_code ? ` (${student.student_code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DateFilterField id="filter-from" label="From" value={fromDate} onChange={setFromDate} />

          <DateFilterField id="filter-to" label="To" value={toDate} onChange={setToDate} />

          <div className="md:col-span-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={applyFilters} disabled={loading}>
                {loading ? 'Loading...' : 'Apply filters'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFromDate(undefined)
                  setToDate(undefined)
                }}
              >
                Clear dates
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          { label: 'Exams', value: data.summary.examsCount },
          { label: 'Mark entries', value: data.summary.marksEntries },
          { label: 'Average %', value: formatPercent(data.summary.averagePercentage) },
          { label: 'Top %', value: formatPercent(data.summary.topPercentage) },
          { label: 'Absent entries', value: data.summary.absentCount },
        ].map(item => (
          <Card key={item.label} className="gap-2 py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="h-[460px] gap-0 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base tracking-tight">
              {data.trendMode === 'batch' ? 'Batch Trend' : 'Individual Trend'}
            </CardTitle>
            <CardDescription>
              {data.trendMode === 'batch'
                ? 'Exam-wise average percentage for the selected batch.'
                : 'Exam-wise trend for the selected student.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden px-4">
            <TrendChart points={data.trend} />
          </CardContent>
        </Card>

        <Card className="h-[460px] gap-0 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base tracking-tight">Batch Comparison</CardTitle>
            <CardDescription>Top average percentages in current scope.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden px-4 pt-2">
            <ComparisonBars rows={data.batchComparison} />
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base tracking-tight">Detailed Marks</CardTitle>
          <CardDescription>Row-level exam scores for current filters.</CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="overflow-hidden rounded-lg border">
            <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="bg-muted/40 text-muted-foreground">
                <TableHead>Date</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Marks</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.marks.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={6}>
                    No marks found for selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                data.marks.map((row, index) => (
                  <TableRow
                    key={`${row.exam_id}-${row.student_id}`}
                    className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                  >
                    <TableCell>{formatDate(row.exam_date)}</TableCell>
                    <TableCell>{row.exam_name}</TableCell>
                    <TableCell>{row.batch_name}</TableCell>
                    <TableCell>
                      {row.student_name ?? 'Unknown'}
                      {row.student_code ? ` (${row.student_code})` : ''}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.is_absent ? (
                        <Badge variant="destructive">Absent</Badge>
                      ) : (
                        `${row.marks_obtained}/${row.total_marks}`
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.percentage === null ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <Badge variant="outline">{formatPercent(row.percentage)}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
