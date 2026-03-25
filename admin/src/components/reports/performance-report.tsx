'use client'

import { useMemo, useState } from 'react'
import { Download, Search, TrendingUp } from 'lucide-react'
import { format, subMonths } from 'date-fns'

import { DatePickerField } from '@/components/shared/form/date-picker-field'
import { SelectField } from '@/components/shared/form/select-field'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppRole } from '@/lib/types/entities'
import { useScopedFilters } from '@/lib/hooks/use-scoped-filters'
import { useReportStudents } from '@/lib/hooks/use-report-students'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

type StudentResult = {
  id: string
  student_code: string | null
  student_name: string
  exams_count: number
  average_percentage: number
  top_percentage: number
}

export function PerformanceReport({ role }: { role: AppRole }) {
  const [centreId, setCentreId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [fromDate, setFromDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const filtersQuery = useScopedFilters()
  const studentsQuery = useReportStudents<StudentResult>({
    endpoint: '/api/reports/performance',
    query,
    centreId,
    batchId,
    fromDate,
    toDate,
  })

  useQueryErrorToast(filtersQuery.error, 'Failed to load performance report filters')

  const centres = useMemo(() => filtersQuery.data?.centres ?? [], [filtersQuery.data?.centres])
  const batches = useMemo(() => filtersQuery.data?.batches ?? [], [filtersQuery.data?.batches])
  const students = studentsQuery.data?.students ?? []
  const loading = studentsQuery.isPending || studentsQuery.isFetching

  const visibleBatches = useMemo(
    () => batches.filter((batch) => !centreId || batch.centre_id === centreId),
    [batches, centreId],
  )

  useQueryErrorToast(studentsQuery.error, 'Search failed')

  function openDownloadPrompt(studentId: string) {
    setSelectedStudentId(studentId)
    setDialogOpen(true)
  }

  function downloadReport() {
    if (!selectedStudentId) return
    const params = new URLSearchParams({ student_id: selectedStudentId, from: fromDate, to: toDate, format: 'pdf' })
    window.open(`/api/reports/performance?${params.toString()}`, '_blank')
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-900/45 px-8 py-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <Badge variant="outline" className="border-sky-400/30 bg-sky-400/10 text-sky-300">Reports</Badge>
        <div className="mt-4 max-w-3xl">
          <h1 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">Performance Reports</h1>
          <p className="mt-3 text-base text-slate-300">Browse performance cards immediately, refine them with centre, batch, or search filters, and download a detailed academic report.</p>
        </div>
      </section>

      <Card className="gap-0 overflow-hidden border-white/10 bg-slate-900/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="border-b bg-slate-950/35 px-5 py-3.5">
          <CardTitle className="text-white">Report Filters</CardTitle>
          <CardDescription className="text-slate-400">Student cards load immediately for the selected date range, and the final date range is confirmed again before PDF download.</CardDescription>
        </div>
        <div className="grid gap-4 px-5 py-5 md:grid-cols-[220px_240px_180px_180px_1fr]">
          {role === 'ceo' && (
            <SelectField id="performance-report-centre" label="Centre" value={centreId || 'all'} onChange={(value) => { setCentreId(value === 'all' ? '' : value); setBatchId('') }} options={[{ value: 'all', label: 'All centres' }, ...centres.map((centre) => ({ value: centre.id, label: centre.centre_name }))]} placeholder="All centres" />
          )}

          <SelectField id="performance-report-batch" label="Batch" value={batchId || 'all'} onChange={(value) => setBatchId(value === 'all' ? '' : value)} options={[{ value: 'all', label: 'All batches' }, ...visibleBatches.map((batch) => ({ value: batch.id, label: batch.batch_name }))]} placeholder="All batches" />

          <DatePickerField id="performance-from" label="From" value={fromDate} onChange={setFromDate} max={toDate || undefined} />

          <DatePickerField id="performance-to" label="To" value={toDate} onChange={setToDate} min={fromDate || undefined} max={format(new Date(), 'yyyy-MM-dd')} />

          <div className="space-y-2">
            <Label htmlFor="performance-report-search">Search Student</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="performance-report-search" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Student name or code" />
            </div>
          </div>
        </div>
      </Card>

      {students.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <Card key={student.id} className="border-white/10 bg-slate-900/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4 px-6 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/15 bg-slate-950/55 text-sky-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-300">Avg {student.average_percentage.toFixed(1)}%</Badge>
              </div>
              <div className="px-6 pb-6 pt-4">
                <div className="text-xl font-semibold text-white">{student.student_name}</div>
                <div className="mt-1 font-mono text-xs text-slate-400">{student.student_code || 'No code assigned'}</div>
                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between"><span>Exams count</span><span className="font-medium text-white">{student.exams_count}</span></div>
                  <div className="mt-2 flex items-center justify-between"><span>Average %</span><span className="font-medium text-white">{student.average_percentage.toFixed(1)}%</span></div>
                  <div className="mt-2 flex items-center justify-between"><span>Top %</span><span className="font-medium text-white">{student.top_percentage.toFixed(1)}%</span></div>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={() => openDownloadPrompt(student.id)}>
                    <Download className="mr-2 h-4 w-4" />Download Report
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-white/10 bg-slate-900/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="p-10 text-center text-sm text-slate-400">{loading ? 'Loading performance report cards...' : 'No performance report cards match the current filters.'}</div>
        </Card>
      )}

      <ManageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Choose Report Date Range"
        description="Confirm the date range before downloading the performance report PDF."
        onSubmit={downloadReport}
        submitLabel="Download PDF"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <DatePickerField id="performance-dialog-from" label="From" value={fromDate} onChange={setFromDate} max={toDate || undefined} />
          <DatePickerField id="performance-dialog-to" label="To" value={toDate} onChange={setToDate} min={fromDate || undefined} max={format(new Date(), 'yyyy-MM-dd')} />
        </div>
      </ManageDialog>
    </div>
  )
}
