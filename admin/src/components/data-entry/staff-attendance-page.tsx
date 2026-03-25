'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Clock, Search, Users } from 'lucide-react'
import { toast } from 'sonner'

import { DatePickerField } from '@/components/shared/form/date-picker-field'
import { SelectField } from '@/components/shared/form/select-field'
import { fetchJson } from '@/lib/http/fetch-json'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Batch } from '@/lib/types/entities'
import { useScopedFilters } from '@/lib/hooks/use-scoped-filters'
import { useTaskCentres } from '@/lib/hooks/use-task-centres'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

type BatchOption = Pick<Batch, 'id' | 'batch_name' | 'centre_id'>
type StaffRow = {
  user_id: string
  staff_name: string
  role: string
  status: 'present' | 'absent' | 'partial' | null
  in_time: string | null
  out_time: string | null
  previous_day_status: 'present' | 'absent' | 'partial' | null
  previous_day_in_time: string | null
  previous_day_out_time: string | null
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  { value: 'absent', label: 'Absent', color: 'bg-red-500/10 text-red-600 border-red-200' },
  { value: 'partial', label: 'Partial', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
] as const

export function StaffAttendancePage() {
  const queryClient = useQueryClient()
  const [selectedCentre, setSelectedCentre] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('all')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [teacherSearch, setTeacherSearch] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [draftTeacherEdits, setDraftTeacherEdits] = useState<{
    scopeKey: string
    edits: Record<string, Pick<StaffRow, 'status' | 'in_time' | 'out_time'>>
  }>({ scopeKey: '', edits: {} })
  const scopedFiltersQuery = useScopedFilters()

  const centresQuery = useTaskCentres('/api/data-entry/staff-attendance', 'staff-attendance')

  const centres = useMemo(() => centresQuery.data?.centres ?? [], [centresQuery.data?.centres])
  const batches = useMemo(() => (scopedFiltersQuery.data?.batches ?? []) as BatchOption[], [scopedFiltersQuery.data?.batches])
  const effectiveSelectedCentre = selectedCentre || centres[0]?.id || ''
  const attendanceScopeKey = `${effectiveSelectedCentre}:${selectedBatch}:${selectedDate}`

  const teachersQuery = useQuery({
    queryKey: ['task-staff-attendance-teachers', effectiveSelectedCentre, selectedDate, selectedBatch],
    queryFn: () => {
      const params = new URLSearchParams({ centre_id: effectiveSelectedCentre, date: selectedDate })
      if (selectedBatch && selectedBatch !== 'all') params.set('batch_id', selectedBatch)
      return fetchJson<{ staff: StaffRow[] }>(`/api/data-entry/staff-attendance?${params.toString()}`, { errorPrefix: 'Load teacher attendance roster' })
    },
    enabled: Boolean(effectiveSelectedCentre && selectedDate),
    staleTime: 15_000,
  })

  const saveMutation = useMutation({
    mutationFn: (teacher: StaffRow) => fetchJson('/api/data-entry/staff-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centre_id: effectiveSelectedCentre,
        attendance_date: selectedDate,
        records: [{
          user_id: teacher.user_id,
          status: teacher.status,
          in_time: teacher.in_time,
          out_time: teacher.out_time,
        }],
      }),
    }),
    onSuccess: async () => {
      toast.success('Staff attendance saved')
      await queryClient.invalidateQueries({ queryKey: ['task-staff-attendance-teachers', effectiveSelectedCentre, selectedDate, selectedBatch] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save staff attendance')
    },
  })

  useQueryErrorToast(centresQuery.error, 'Failed to load centres')
  useQueryErrorToast(scopedFiltersQuery.error, 'Failed to load staff-attendance batches')
  useQueryErrorToast(teachersQuery.error, 'Failed to load teacher attendance')

  const teachers = useMemo(
    () => (teachersQuery.data?.staff ?? []).map((teacher) => ({
      ...teacher,
      ...(draftTeacherEdits.scopeKey === attendanceScopeKey ? draftTeacherEdits.edits[teacher.user_id] : undefined),
    })),
    [attendanceScopeKey, draftTeacherEdits, teachersQuery.data?.staff],
  )
  const loadingCentres = centresQuery.isPending || centresQuery.isFetching
  const loadingTeachers = teachersQuery.isPending || teachersQuery.isFetching
  const saving = saveMutation.isPending

  const visibleBatches = useMemo(
    () => batches.filter((batch) => !selectedCentre || batch.centre_id === selectedCentre),
    [batches, selectedCentre],
  )
  const effectiveSelectedBatch = selectedBatch !== 'all' && !visibleBatches.some((batch) => batch.id === selectedBatch)
    ? 'all'
    : selectedBatch

  const filteredTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase()
    if (!query) return teachers
    return teachers.filter((teacher) => teacher.staff_name.toLowerCase().includes(query))
  }, [teacherSearch, teachers])

  const effectiveSelectedTeacherId = selectedTeacherId && filteredTeachers.some((teacher) => teacher.user_id === selectedTeacherId)
    ? selectedTeacherId
    : (filteredTeachers[0]?.user_id ?? '')

  const selectedTeacher = useMemo(
    () => filteredTeachers.find((teacher) => teacher.user_id === effectiveSelectedTeacherId) ?? filteredTeachers[0] ?? null,
    [effectiveSelectedTeacherId, filteredTeachers],
  )

  const previousDaySummary = useMemo(() => {
    const previousDate = format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd')
    return `Previous-day reference: choose ${previousDate} to inspect or edit that day's saved status.`
  }, [selectedDate])

  function updateTeacher(field: 'status' | 'in_time' | 'out_time', value: string) {
    if (!selectedTeacher) return

    setDraftTeacherEdits((previous) => {
      const scopedEdits = previous.scopeKey === attendanceScopeKey ? previous.edits : {}
      const current = scopedEdits[selectedTeacher.user_id] ?? {
        status: selectedTeacher.status,
        in_time: selectedTeacher.in_time,
        out_time: selectedTeacher.out_time,
      }

      if (field === 'status') {
        const status = value as StaffRow['status']
        return {
          scopeKey: attendanceScopeKey,
          edits: {
            ...scopedEdits,
            [selectedTeacher.user_id]: {
              ...current,
              status,
              in_time: status === 'partial' ? current.in_time : null,
              out_time: status === 'partial' ? current.out_time : null,
            },
          },
        }
      }

      return {
        scopeKey: attendanceScopeKey,
        edits: {
          ...scopedEdits,
          [selectedTeacher.user_id]: {
            ...current,
            [field]: value || null,
          },
        },
      }
    })
  }

  async function handleSave() {
    if (!selectedTeacher || !effectiveSelectedCentre) return
    await saveMutation.mutateAsync(selectedTeacher)
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel soft-ring rounded-[32px] px-8 py-8">
        <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Tasks</Badge>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-secondary dark:text-primary">Staff Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select a teacher card, choose a date, and mark present, absent, or partial attendance with mandatory timing for partial days.</p>
      </div>

      <div className="grid gap-4 rounded-[28px] border border-secondary/10 bg-white/45 p-5 dark:bg-white/[0.03] md:grid-cols-[240px_220px_180px_1fr]">
        <SelectField
          id="staff-attendance-centre"
          label="Centre"
          value={effectiveSelectedCentre}
          onChange={(value) => {
            setSelectedCentre(value)
            setSelectedBatch('all')
            setSelectedTeacherId('')
          }}
          options={centres.map((centre) => ({ value: centre.id, label: centre.centre_name }))}
          placeholder={loadingCentres ? 'Loading centres...' : 'Select centre'}
        />
        <SelectField
          id="staff-attendance-batch"
          label="Batch"
          value={effectiveSelectedBatch}
          onChange={setSelectedBatch}
          options={[{ value: 'all', label: 'All batches' }, ...visibleBatches.map((batch) => ({ value: batch.id, label: batch.batch_name }))]}
          placeholder="All batches"
        />
        <DatePickerField id="staff-attendance-date" label="Date" value={selectedDate} onChange={setSelectedDate} max={format(new Date(), 'yyyy-MM-dd')} />
        <div className="space-y-2">
          <Label htmlFor="teacher-search">Search Teacher</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="teacher-search" value={teacherSearch} onChange={(event) => setTeacherSearch(event.target.value)} className="pl-9" placeholder="Search teacher name" />
          </div>
        </div>
      </div>

      {effectiveSelectedCentre && (
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
              <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Teacher Cards</CardTitle>
              <CardDescription className="mt-0.5">Previous-day context is available by switching the date input above.</CardDescription>
            </div>
            <div className="max-h-[700px] overflow-y-auto">
              {loadingTeachers ? (
                <div className="h-56 animate-pulse bg-primary/10 dark:bg-white/[0.04]" />
              ) : filteredTeachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
                  <Users className="mb-3 h-8 w-8 opacity-20" />
                  No teachers found for this centre.
                </div>
              ) : (
                <div className="divide-y divide-secondary/10">
                  {filteredTeachers.map((teacher) => {
                    const statusConfig = STATUS_OPTIONS.find((option) => option.value === teacher.status)

                    return (
                      <button
                        key={teacher.user_id}
                        type="button"
                        onClick={() => setSelectedTeacherId(teacher.user_id)}
                      className={`w-full px-5 py-4 text-left transition-colors hover:bg-primary/8 dark:hover:bg-white/[0.03] ${effectiveSelectedTeacherId === teacher.user_id ? 'bg-primary/14 dark:bg-white/[0.06]' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-secondary dark:text-foreground">{teacher.staff_name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {teacher.previous_day_status
                                ? `Previous day: ${teacher.previous_day_status}${teacher.previous_day_status === 'partial' && teacher.previous_day_in_time && teacher.previous_day_out_time ? ` (${teacher.previous_day_in_time}-${teacher.previous_day_out_time})` : ''}`
                                : 'Previous day: no record saved'}
                            </div>
                          </div>
                          <Badge variant="outline" className={statusConfig?.color ?? 'bg-white/40 dark:bg-white/[0.03] text-muted-foreground'}>
                            {teacher.status ?? 'Not marked'}
                          </Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
              <CardTitle className="flex items-center gap-2 text-base tracking-tight text-secondary dark:text-primary">
                <Clock className="h-4 w-4" />Teacher Attendance Detail
              </CardTitle>
              <CardDescription className="mt-0.5">{previousDaySummary}</CardDescription>
            </div>

            {!selectedTeacher ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Select a teacher card to mark attendance for the chosen date.</div>
            ) : (
              <div className="space-y-5 px-5 py-5">
                <div className="rounded-[24px] border border-secondary/10 bg-white/55 p-4 dark:bg-white/[0.04]">
                  <div className="text-xl font-semibold text-secondary dark:text-foreground">{selectedTeacher.staff_name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Date: {selectedDate}</div>
                </div>

                <div className="max-w-[220px]">
                  <SelectField
                    id="staff-attendance-status"
                    label="Status"
                    value={selectedTeacher.status ?? ''}
                    onChange={(value) => updateTeacher('status', value)}
                    options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                    placeholder="Select attendance status"
                  />
                </div>

                {selectedTeacher.status === 'partial' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="in-time">Entry Time *</Label>
                      <Input id="in-time" type="time" value={selectedTeacher.in_time ?? ''} onChange={(event) => updateTeacher('in_time', event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="out-time">Exit Time *</Label>
                      <Input id="out-time" type="time" value={selectedTeacher.out_time ?? ''} onChange={(event) => updateTeacher('out_time', event.target.value)} />
                    </div>
                  </div>
                )}

                {selectedTeacher.status && (
                  <div className="rounded-2xl border border-secondary/10 bg-white/60 p-3 text-sm text-muted-foreground dark:bg-white/[0.04]">
                    {selectedTeacher.status === 'partial'
                      ? 'Partial attendance requires both entry and exit times.'
                      : 'If this date was marked earlier, the form opens with the last saved status so it can be updated safely.'}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving || !selectedTeacher.status}>
                    {saving ? 'Saving...' : 'Save Attendance'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
