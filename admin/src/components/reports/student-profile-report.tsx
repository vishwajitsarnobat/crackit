'use client'

import { useMemo, useState } from 'react'
import { Download, Search, UserSquare2 } from 'lucide-react'

import { SelectField } from '@/components/shared/form/select-field'
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
  class_level: number
  is_active: boolean
}

export function StudentProfileReport({ role }: { role: AppRole }) {
  const [centreId, setCentreId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [query, setQuery] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  const filtersQuery = useScopedFilters()
  const studentsQuery = useReportStudents<StudentResult>({
    endpoint: '/api/reports/student-profile',
    query,
    centreId,
    batchId,
  })

  useQueryErrorToast(filtersQuery.error, 'Failed to load report filters')

  const centres = useMemo(() => filtersQuery.data?.centres ?? [], [filtersQuery.data?.centres])
  const batches = useMemo(() => filtersQuery.data?.batches ?? [], [filtersQuery.data?.batches])
  const students = studentsQuery.data?.students ?? []
  const loading = studentsQuery.isPending || studentsQuery.isFetching

  const visibleBatches = useMemo(
    () => batches.filter((batch) => !centreId || batch.centre_id === centreId),
    [batches, centreId],
  )

  useQueryErrorToast(studentsQuery.error, 'Search failed')

  function downloadReport(studentId: string) {
    setDownloading(studentId)
    const params = new URLSearchParams({ student_id: studentId, format: 'pdf' })
    window.open(`/api/reports/student-profile?${params.toString()}`, '_blank')
    setTimeout(() => setDownloading(null), 1500)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-900/45 px-8 py-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <Badge variant="outline" className="border-sky-400/30 bg-sky-400/10 text-sky-300">Reports</Badge>
        <div className="mt-4 max-w-3xl">
          <h1 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">Student Profile Reports</h1>
          <p className="mt-3 text-base text-slate-300">Browse student cards immediately, narrow them with centre or batch filters, and generate a complete student profile PDF directly from each card.</p>
        </div>
      </section>

      <Card className="gap-0 overflow-hidden border-white/10 bg-slate-900/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="border-b bg-slate-950/35 px-5 py-3.5">
          <CardTitle className="text-white">Report Filters</CardTitle>
          <CardDescription className="text-slate-400">Student cards load immediately. CEO can filter by centre and batch, while centre head stays scoped to their centre.</CardDescription>
        </div>
        <div className="grid gap-4 px-5 py-5 md:grid-cols-[220px_240px_1fr]">
          {role === 'ceo' && (
            <SelectField id="student-profile-report-centre" label="Centre" value={centreId || 'all'} onChange={(value) => { setCentreId(value === 'all' ? '' : value); setBatchId('') }} options={[{ value: 'all', label: 'All centres' }, ...centres.map((centre) => ({ value: centre.id, label: centre.centre_name }))]} placeholder="All centres" />
          )}

          <SelectField id="student-profile-report-batch" label="Batch" value={batchId || 'all'} onChange={(value) => setBatchId(value === 'all' ? '' : value)} options={[{ value: 'all', label: 'All batches' }, ...visibleBatches.map((batch) => ({ value: batch.id, label: batch.batch_name }))]} placeholder="All batches" />

          <div className="space-y-2">
            <Label htmlFor="student-report-search">Search Student</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="student-report-search" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Student name or code" />
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
                  <UserSquare2 className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={student.is_active ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-red-400/20 bg-red-500/10 text-red-300'}>
                  {student.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="px-6 pb-6 pt-4">
                <div className="text-xl font-semibold text-white">{student.student_name}</div>
                <div className="mt-1 font-mono text-xs text-slate-400">{student.student_code || 'No code assigned'}</div>
                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Class level</span>
                    <span className="font-medium text-white">{student.class_level}</span>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={() => downloadReport(student.id)} disabled={downloading === student.id}>
                    <Download className="mr-2 h-4 w-4" />{downloading === student.id ? 'Preparing...' : 'Download PDF'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-white/10 bg-slate-900/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="p-10 text-center text-sm text-slate-400">{loading ? 'Loading student report cards...' : 'No student cards match the current filters.'}</div>
        </Card>
      )}
    </div>
  )
}
