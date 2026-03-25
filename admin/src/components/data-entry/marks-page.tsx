'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { FileCheck, Plus, Save, Search } from 'lucide-react'
import { toast } from 'sonner'

import { TaskBatchSelector } from '@/components/data-entry/shared/task-batch-selector'
import { DatePickerField } from '@/components/shared/form/date-picker-field'
import { fetchJson } from '@/lib/http/fetch-json'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Exam } from '@/lib/types/entities'
import { useTaskBatches } from '@/lib/hooks/use-task-batches'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

type MarkRow = {
  student_id: string
  student_name: string
  student_code: string | null
  marks_obtained: number
  is_absent: boolean
}

export function MarksPage() {
  const queryClient = useQueryClient()
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [examSearch, setExamSearch] = useState('')
  const [selectedExamId, setSelectedExamId] = useState('')
  const [draftMarks, setDraftMarks] = useState<Record<string, { marks_obtained: number; is_absent: boolean }>>({})

  const [examDialogOpen, setExamDialogOpen] = useState(false)
  const [examName, setExamName] = useState('')
  const [examSubject, setExamSubject] = useState('')
  const [examDate, setExamDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [totalMarks, setTotalMarks] = useState('')
  const [passingMarks, setPassingMarks] = useState('')

  const batchesQuery = useTaskBatches('/api/data-entry/marks', 'marks')

  const batches = useMemo(() => batchesQuery.data?.batches ?? [], [batchesQuery.data?.batches])
  const effectiveSelectedBatchId = selectedBatchId || batches[0]?.id || ''

  const examsQuery = useQuery({
    queryKey: ['task-marks-exams', effectiveSelectedBatchId],
    queryFn: () => fetchJson<{ exams: Exam[] }>(`/api/data-entry/marks?batch_id=${effectiveSelectedBatchId}`, { errorPrefix: 'Load exams' }),
    enabled: Boolean(effectiveSelectedBatchId),
    staleTime: 15_000,
  })

  const exams = useMemo(() => examsQuery.data?.exams ?? [], [examsQuery.data?.exams])
  const effectiveSelectedExamId = selectedExamId && exams.some((exam) => exam.id === selectedExamId)
    ? selectedExamId
    : ''
  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === effectiveSelectedExamId) ?? null,
    [effectiveSelectedExamId, exams],
  )

  const marksQuery = useQuery({
    queryKey: ['task-marks-sheet', effectiveSelectedBatchId, effectiveSelectedExamId],
    queryFn: () => {
      const params = new URLSearchParams({ batch_id: effectiveSelectedBatchId, exam_id: effectiveSelectedExamId })
      return fetchJson<{ students: MarkRow[] }>(`/api/data-entry/marks?${params.toString()}`, { errorPrefix: 'Load mark sheet' })
    },
    enabled: Boolean(effectiveSelectedBatchId && effectiveSelectedExamId),
    staleTime: 15_000,
  })

  const createExamMutation = useMutation({
    mutationFn: () => fetchJson('/api/data-entry/marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: effectiveSelectedBatchId,
        exam_name: examName,
        subject: examSubject || null,
        exam_date: examDate,
        total_marks: Number(totalMarks),
        passing_marks: passingMarks ? Number(passingMarks) : null,
      }),
    }),
    onSuccess: async () => {
      toast.success('Exam created')
      setExamDialogOpen(false)
      setExamName('')
      setExamSubject('')
      setExamDate(format(new Date(), 'yyyy-MM-dd'))
      setTotalMarks('')
      setPassingMarks('')
      await queryClient.invalidateQueries({ queryKey: ['task-marks-exams', effectiveSelectedBatchId] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create exam')
    },
  })

  const saveMarksMutation = useMutation({
    mutationFn: (marks: MarkRow[]) => fetchJson<{ count: number }>('/api/data-entry/marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exam_id: effectiveSelectedExamId,
        marks: marks.map((mark) => ({
          student_id: mark.student_id,
          marks_obtained: mark.is_absent ? 0 : mark.marks_obtained,
          is_absent: mark.is_absent,
        })),
      }),
    }),
    onSuccess: async (json) => {
      toast.success(`Marks saved for ${json.count} students`)
      await queryClient.invalidateQueries({ queryKey: ['task-marks-sheet', effectiveSelectedBatchId, effectiveSelectedExamId] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save marks')
    },
  })

  const togglePublishMutation = useMutation({
    mutationFn: (exam: Exam) => fetchJson('/api/data-entry/marks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: exam.id, results_published: !exam.results_published }),
    }),
    onSuccess: async (_, exam) => {
      toast.success(exam.results_published ? 'Results unpublished' : 'Results published')
      await queryClient.invalidateQueries({ queryKey: ['task-marks-exams', effectiveSelectedBatchId] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update publish status')
    },
  })

  useQueryErrorToast(batchesQuery.error, 'Failed to load batches')
  useQueryErrorToast(examsQuery.error, 'Failed to load exams')
  useQueryErrorToast(marksQuery.error, 'Failed to load mark sheet')

  const marksRows = useMemo(() => {
    const base = marksQuery.data?.students ?? []
    return base.map((mark) => ({
      ...mark,
      marks_obtained: draftMarks[mark.student_id]?.marks_obtained ?? mark.marks_obtained,
      is_absent: draftMarks[mark.student_id]?.is_absent ?? mark.is_absent,
    }))
  }, [draftMarks, marksQuery.data?.students])

  const filteredExams = useMemo(() => {
    const query = examSearch.trim().toLowerCase()
    if (!query) return exams
    return exams.filter((exam) =>
      [exam.exam_name, exam.subject ?? '', exam.exam_date].some((value) => value.toLowerCase().includes(query)),
    )
  }, [examSearch, exams])

  const loadingBatches = batchesQuery.isPending || batchesQuery.isFetching
  const loadingExams = examsQuery.isPending || examsQuery.isFetching
  const loadingMarks = marksQuery.isPending || marksQuery.isFetching
  const saving = createExamMutation.isPending || saveMarksMutation.isPending

  function updateMark(studentId: string, field: 'marks_obtained' | 'is_absent', value: number | boolean) {
    setDraftMarks((previous) => {
      const current = previous[studentId] ?? {
        marks_obtained: marksRows.find((mark) => mark.student_id === studentId)?.marks_obtained ?? 0,
        is_absent: marksRows.find((mark) => mark.student_id === studentId)?.is_absent ?? false,
      }

      if (field === 'is_absent') {
        const absent = value as boolean
        return {
          ...previous,
          [studentId]: { ...current, is_absent: absent, marks_obtained: absent ? 0 : current.marks_obtained },
        }
      }

      return {
        ...previous,
        [studentId]: { ...current, marks_obtained: value as number },
      }
    })
  }

  async function handleCreateExam() {
    await createExamMutation.mutateAsync()
  }

  async function handleSaveMarks() {
    if (!selectedExam) return
    await saveMarksMutation.mutateAsync(marksRows)
  }

  async function togglePublish(exam: Exam) {
    await togglePublishMutation.mutateAsync(exam)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Task Exam Marks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose an assigned batch, create or open an exam, and enter marks student by student in one sheet.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <TaskBatchSelector
          title="Assigned Batches"
          description="Pick a batch to view past and future exams."
          batches={batches}
          selectedBatchId={effectiveSelectedBatchId}
          onSelect={(value) => { setSelectedBatchId(value); setSelectedExamId(''); setDraftMarks({}) }}
          loading={loadingBatches}
          emptyMessage="No assigned batches found."
          searchPlaceholder="Search batches"
        />

        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b bg-muted/30 px-5 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                  <FileCheck className="h-4 w-4" />{selectedExam ? 'Marks Sheet' : 'Exams'}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {selectedExam ? `${selectedExam.exam_name} · Total ${selectedExam.total_marks}` : 'Create a new exam or open an existing one for mark entry.'}
                </CardDescription>
              </div>
              {effectiveSelectedBatchId && !selectedExam && (
                <Button onClick={() => setExamDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Create Exam
                </Button>
              )}
            </div>
          </div>

          {!effectiveSelectedBatchId ? (
            <div className="flex min-h-[420px] items-center justify-center p-10 text-center text-sm text-muted-foreground">
              Select a batch to view or create exams.
            </div>
          ) : !selectedExam ? (
            <div className="space-y-4 px-5 py-5">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={examSearch} onChange={(event) => setExamSearch(event.target.value)} className="pl-9" placeholder="Search exams" />
              </div>

              {loadingExams ? (
                <div className="h-56 animate-pulse rounded-xl bg-muted/20" />
              ) : filteredExams.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No exams created for this batch yet.</div>
              ) : (
                <div className="space-y-3">
                  {filteredExams.map((exam) => (
                    <div key={exam.id} className="rounded-xl border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{exam.exam_name}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{exam.subject || 'General'} · {exam.exam_date}</div>
                        </div>
                        <Badge variant="outline" className={exam.results_published ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-amber-500/10 text-amber-600 border-amber-200'}>
                          {exam.results_published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <div>Total marks: <span className="font-medium text-foreground">{exam.total_marks}</span></div>
                        <div>Passing marks: <span className="font-medium text-foreground">{exam.passing_marks ?? 'N/A'}</span></div>
                      </div>
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedExamId(exam.id); setDraftMarks({}) }}>Open Mark Sheet</Button>
                        <Button variant="outline" size="sm" onClick={() => void togglePublish(exam)}>{exam.results_published ? 'Unpublish' : 'Publish'}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 px-5 py-5">
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                <div>
                  <div className="font-medium">{selectedExam.exam_name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{selectedExam.subject || 'General'} · {selectedExam.exam_date}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSelectedExamId(''); setDraftMarks({}) }}>Back to Exams</Button>
                  <Button onClick={handleSaveMarks} disabled={saving || marksRows.length === 0}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Marks'}</Button>
                </div>
              </div>

              {loadingMarks ? (
                <div className="h-56 animate-pulse rounded-xl bg-muted/20" />
              ) : marksRows.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No students are available for this exam.</div>
              ) : (
                <div className="space-y-3">
                  {marksRows.map((mark, index) => (
                    <div key={mark.student_id} className="grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-[1fr_160px_120px] md:items-center">
                      <div>
                        <div className="font-medium">{index + 1}. {mark.student_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{mark.student_code || '-'}</div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`marks-${mark.student_id}`}>Marks</Label>
                        <Input id={`marks-${mark.student_id}`} type="number" min="0" max={selectedExam.total_marks} value={mark.is_absent ? 0 : mark.marks_obtained} onChange={(event) => updateMark(mark.student_id, 'marks_obtained', Number(event.target.value))} disabled={mark.is_absent} />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={mark.is_absent} onChange={(event) => updateMark(mark.student_id, 'is_absent', event.target.checked)} className="h-4 w-4 rounded border-input" />
                        Absent
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <ManageDialog
        open={examDialogOpen}
        onOpenChange={setExamDialogOpen}
        title="Create Exam"
        description="Create a batch exam for marks entry. Future dates are allowed."
        onSubmit={handleCreateExam}
        saving={createExamMutation.isPending}
        submitLabel="Create Exam"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="exam-name">Exam Name *</Label>
            <Input id="exam-name" value={examName} onChange={(event) => setExamName(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-subject">Subject</Label>
            <Input id="exam-subject" value={examSubject} onChange={(event) => setExamSubject(event.target.value)} />
          </div>
          <DatePickerField id="exam-date" label="Exam Date *" value={examDate} onChange={setExamDate} />
          <div className="space-y-2">
            <Label htmlFor="total-marks">Total Marks *</Label>
            <Input id="total-marks" type="number" min="1" value={totalMarks} onChange={(event) => setTotalMarks(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passing-marks">Passing Marks</Label>
            <Input id="passing-marks" type="number" min="0" value={passingMarks} onChange={(event) => setPassingMarks(event.target.value)} />
          </div>
        </div>
      </ManageDialog>
    </div>
  )
}
