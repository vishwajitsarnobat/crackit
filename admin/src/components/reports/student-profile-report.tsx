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
      <section className="glass-panel soft-ring rounded-[32px] px-8 py-8">
        <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Reports</Badge>
        <div className="mt-4 max-w-3xl">
          <h1 className="font-serif text-4xl tracking-tight text-secondary dark:text-primary sm:text-5xl">Student Profile Reports</h1>
          <p className="mt-3 text-base text-muted-foreground">Browse student cards immediately, narrow them with centre or batch filters, and generate a complete student profile PDF directly from each card.</p>
        </div>
      </section>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
          <CardTitle className="text-secondary dark:text-primary">Report Filters</CardTitle>
          <CardDescription>Student cards load immediately. CEO can filter by centre and batch, while centre head stays scoped to their centre.</CardDescription>
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
            <Card key={student.id} className="py-0">
              <div className="flex items-start justify-between gap-4 px-6 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-secondary/10 bg-white/70 text-secondary dark:bg-white/[0.05] dark:text-primary">
                  <UserSquare2 className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={student.is_active ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-red-400/20 bg-red-500/10 text-red-300'}>
                  {student.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="px-6 pb-6 pt-4">
                <div className="text-xl font-semibold text-secondary dark:text-foreground">{student.student_name}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{student.student_code || 'No code assigned'}</div>
                <div className="mt-4 rounded-[24px] border border-secondary/10 bg-white/60 p-4 text-sm text-muted-foreground dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span>Class level</span>
                    <span className="font-medium text-secondary dark:text-foreground">{student.class_level}</span>
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
        <Card>
          <div className="p-10 text-center text-sm text-muted-foreground">{loading ? 'Loading student report cards...' : 'No student cards match the current filters.'}</div>
        </Card>
      )}
    </div>
  )
}
