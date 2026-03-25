'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarCheck, CheckSquare2, Search } from 'lucide-react'
import { toast } from 'sonner'

import { TaskBatchSelector } from '@/components/data-entry/shared/task-batch-selector'
import { DatePickerField } from '@/components/shared/form/date-picker-field'
import { fetchJson } from '@/lib/http/fetch-json'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTaskBatches } from '@/lib/hooks/use-task-batches'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

type StudentRow = {
  student_id: string
  student_name: string
  student_code: string | null
  status: 'present' | 'absent' | null
}

export function AttendancePage() {
  const queryClient = useQueryClient()
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [studentSearch, setStudentSearch] = useState('')
  const [draftState, setDraftState] = useState<{ key: string; statuses: Record<string, StudentRow['status']> }>({ key: '', statuses: {} })

  const batchesQuery = useTaskBatches('/api/data-entry/attendance', 'attendance')

  const batches = useMemo(() => batchesQuery.data?.batches ?? [], [batchesQuery.data?.batches])
  const effectiveSelectedBatchId = selectedBatchId || batches[0]?.id || ''

  const rosterQuery = useQuery({
    queryKey: ['task-attendance-roster', effectiveSelectedBatchId, selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams({ batch_id: effectiveSelectedBatchId, date: selectedDate })
      const json = await fetchJson<{ students: StudentRow[] }>(`/api/data-entry/attendance?${params.toString()}`, { errorPrefix: 'Load attendance roster' })

      return {
        students: (json.students ?? []).map((student) => ({
          ...student,
          status: student.status ?? 'absent',
        })),
      }
    },
    enabled: Boolean(effectiveSelectedBatchId && selectedDate),
    staleTime: 15_000,
  })

  const saveMutation = useMutation({
    mutationFn: (students: StudentRow[]) => fetchJson<{ count: number }>('/api/data-entry/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: effectiveSelectedBatchId,
        attendance_date: selectedDate,
        records: students.map((student) => ({
          student_id: student.student_id,
          status: student.status === 'present' ? 'present' : 'absent',
        })),
      }),
    }),
    onSuccess: async (json) => {
      toast.success(`Attendance saved for ${json.count} students`)
      await queryClient.invalidateQueries({ queryKey: ['task-attendance-roster', effectiveSelectedBatchId, selectedDate] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save attendance')
    },
  })

  useQueryErrorToast(batchesQuery.error, 'Failed to load batches')
  useQueryErrorToast(rosterQuery.error, 'Failed to load students')

  const draftKey = `${effectiveSelectedBatchId}:${selectedDate}`

  const rosterStudents = useMemo(() => rosterQuery.data?.students ?? [], [rosterQuery.data?.students])
  const students = useMemo(
    () => {
      const activeDraftStatuses = draftState.key === draftKey ? draftState.statuses : {}
      return rosterStudents.map((student) => ({
        ...student,
        status: activeDraftStatuses[student.student_id] ?? student.status,
      }))
    },
    [draftKey, draftState, rosterStudents],
  )

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === effectiveSelectedBatchId) ?? null,
    [batches, effectiveSelectedBatchId],
  )

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()
    if (!query) return students

    return students.filter((student) =>
      [student.student_name, student.student_code ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [studentSearch, students])

  const loadingBatches = batchesQuery.isPending || batchesQuery.isFetching
  const loadingStudents = rosterQuery.isPending || rosterQuery.isFetching
  const saving = saveMutation.isPending

  function togglePresent(studentId: string, checked: boolean) {
    setDraftState((previous) => ({
      key: draftKey,
      statuses: {
        ...(previous.key === draftKey ? previous.statuses : {}),
        [studentId]: checked ? 'present' : 'absent',
      },
    }))
  }

  async function handleSave() {
    if (!effectiveSelectedBatchId) {
      toast.error('Select a batch first.')
      return
    }

    await saveMutation.mutateAsync(students)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Task Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose an assigned batch, pick a date, and mark present students. Everyone else is treated as absent automatically.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <TaskBatchSelector
          title="Assigned Batches"
          description="Select a batch to load its student roster."
          batches={batches}
          selectedBatchId={effectiveSelectedBatchId}
          onSelect={setSelectedBatchId}
          loading={loadingBatches}
          emptyMessage="No assigned batches found."
          searchPlaceholder="Search assigned batches"
        />

        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b bg-muted/30 px-5 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                  <CalendarCheck className="h-4 w-4" />Attendance Roster
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {selectedBatch ? `Mark attendance for ${selectedBatch.batch_name}` : 'Select a batch to begin.'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[220px]">
                  <DatePickerField id="attendance-date" label="Date" value={selectedDate} onChange={setSelectedDate} max={format(new Date(), 'yyyy-MM-dd')} />
                </div>
                <Button onClick={handleSave} disabled={saving || !effectiveSelectedBatchId || students.length === 0}>
                  <CheckSquare2 className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </div>
          </div>

          {!effectiveSelectedBatchId ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
              <CalendarCheck className="mb-3 h-8 w-8 opacity-20" />
              Select a batch on the left, then choose a date to mark attendance.
            </div>
          ) : (
            <div className="space-y-4 px-5 py-5">
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                <div>
                  <div className="font-medium">{selectedBatch?.batch_name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Selected date: {selectedDate}</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-search">Search students</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="student-search"
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      className="w-[260px] pl-9"
                      placeholder="Search roster"
                    />
                  </div>
                </div>
              </div>

              {loadingStudents ? (
                <div className="h-56 animate-pulse rounded-xl bg-muted/20" />
              ) : filteredStudents.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                  No students found for this batch and search filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStudents.map((student, index) => {
                    const isPresent = student.status === 'present'

                    return (
                      <label
                        key={student.student_id}
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-background px-4 py-3 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-6 text-sm text-muted-foreground">{index + 1}</span>
                          <input
                            type="checkbox"
                            checked={isPresent}
                            onChange={(event) => togglePresent(student.student_id, event.target.checked)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <div>
                            <div className="font-medium">{student.student_name}</div>
                            <div className="font-mono text-xs text-muted-foreground">{student.student_code || '-'}</div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={isPresent ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}
                        >
                          {isPresent ? 'Present' : 'Absent'}
                        </Badge>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
