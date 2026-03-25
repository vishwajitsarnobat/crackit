'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, getDate, getDaysInMonth } from 'date-fns'
import { Plus, Power, UserRoundSearch, Users } from 'lucide-react'
import { toast } from 'sonner'
import { fetchJson } from '@/lib/http/fetch-json'
import { DatePickerField } from '@/components/shared/form/date-picker-field'
import { SelectField } from '@/components/shared/form/select-field'

import { ManageDialog } from '@/components/manage/manage-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type AppRole,
  type Batch,
  type Centre,
  type StudentEnrollmentProfile,
  type TeacherEnrollmentProfile,
} from '@/lib/types/entities'
import { useManageData } from '@/lib/hooks/use-manage-data'

type StudentPayload = {
  students: StudentEnrollmentProfile[]
  centres: Centre[]
  batches: Batch[]
}

type TeacherOption = { id: string; full_name: string }
type TeacherPayload = {
  teachers: TeacherEnrollmentProfile[]
  centres: Centre[]
  batches: Batch[]
  teacherOptions: TeacherOption[]
}

export function EnrollmentsPage({ role }: { role: AppRole }) {
  const [filterCentre, setFilterCentre] = useState('')
  const [filterBatch, setFilterBatch] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')

  const studentDataState = useManageData<StudentPayload>({
    endpoint: 'enrollments',
    initialFilters: { centreId: filterCentre, batchId: filterBatch, search },
  })
  const teacherDataState = useManageData<TeacherPayload>({
    endpoint: 'teachers',
    initialFilters: { centreId: filterCentre, batchId: filterBatch, search },
  })

  const students = useMemo(() => studentDataState.data?.students ?? [], [studentDataState.data?.students])
  const teachers = useMemo(() => teacherDataState.data?.teachers ?? [], [teacherDataState.data?.teachers])
  const centres = studentDataState.data?.centres ?? teacherDataState.data?.centres ?? []
  const studentBatches = useMemo(() => studentDataState.data?.batches ?? [], [studentDataState.data?.batches])
  const teacherBatches = useMemo(() => teacherDataState.data?.batches ?? [], [teacherDataState.data?.batches])
  const teacherOptions = teacherDataState.data?.teacherOptions ?? []

  const [studentDialogOpen, setStudentDialogOpen] = useState(false)
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [studentBatchId, setStudentBatchId] = useState('')
  const [enrollDate, setEnrollDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [monthlyFee, setMonthlyFee] = useState('')

  const [teacherId, setTeacherId] = useState('')
  const [teacherBatchId, setTeacherBatchId] = useState('')
  const [teacherSubject, setTeacherSubject] = useState('')
  const [teacherSalary, setTeacherSalary] = useState('')
  const [teacherStartDate, setTeacherStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null)
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [studentProfileDialogOpen, setStudentProfileDialogOpen] = useState(false)
  const [teacherProfileDialogOpen, setTeacherProfileDialogOpen] = useState(false)
  const [studentFullName, setStudentFullName] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [studentParentName, setStudentParentName] = useState('')
  const [studentParentPhone, setStudentParentPhone] = useState('')
  const [studentClassLevel, setStudentClassLevel] = useState('')
  const [teacherFullName, setTeacherFullName] = useState('')
  const [teacherPhone, setTeacherPhone] = useState('')

  const selectedStudent = useMemo(
    () => students.find((student) => student.student_id === selectedStudentId) ?? students[0] ?? null,
    [students, selectedStudentId],
  )
  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.teacher_id === selectedTeacherId) ?? teachers[0] ?? null,
    [teachers, selectedTeacherId],
  )

  useEffect(() => {
    if (!students.length) return setSelectedStudentId('')
    if (!selectedStudentId || !students.some((student) => student.student_id === selectedStudentId)) {
      setSelectedStudentId(students[0].student_id)
    }
  }, [students, selectedStudentId])

  useEffect(() => {
    if (!teachers.length) return setSelectedTeacherId('')
    if (!selectedTeacherId || !teachers.some((teacher) => teacher.teacher_id === selectedTeacherId)) {
      setSelectedTeacherId(teachers[0].teacher_id)
    }
  }, [teachers, selectedTeacherId])

  const availableStudentBatches = useMemo(() => {
    const assignedIds = new Set(selectedStudent?.assignments.map((assignment) => assignment.batch_id) ?? [])
    return studentBatches.filter((batch) => !assignedIds.has(batch.id) && (!filterCentre || batch.centre_id === filterCentre))
  }, [studentBatches, filterCentre, selectedStudent])

  const availableTeacherBatches = useMemo(
    () => teacherBatches.filter((batch) => !filterCentre || batch.centre_id === filterCentre),
    [teacherBatches, filterCentre],
  )

  const proratedEstimate = useMemo(() => {
    if (!enrollDate || !monthlyFee) return 0
    const dateValue = new Date(`${enrollDate}T00:00:00`)
    if (Number.isNaN(dateValue.getTime())) return 0
    const monthlyFeeValue = parseFloat(monthlyFee)
    if (Number.isNaN(monthlyFeeValue) || monthlyFeeValue < 0) return 0
    const daysInMonth = getDaysInMonth(dateValue)
    const currentDay = getDate(dateValue)
    const remainingDays = daysInMonth - currentDay + 1
    return Math.round(((monthlyFeeValue * remainingDays) / daysInMonth) * 100) / 100
  }, [enrollDate, monthlyFee])

  function reloadAll(next?: { centreId?: string; batchId?: string; searchValue?: string }) {
    const centreId = next?.centreId ?? filterCentre
    const batchId = next?.batchId ?? filterBatch
    const searchValue = next?.searchValue ?? search

    void studentDataState.reload({ centreId, batchId, search: searchValue })
    void teacherDataState.reload({ centreId, batchId, search: searchValue })
  }

  function handleCentreFilter(value: string) {
    const centreId = value === 'all' ? '' : value
    setFilterCentre(centreId)
    setFilterBatch('')
    reloadAll({ centreId, batchId: '' })
  }

  function handleBatchFilter(value: string) {
    const batchId = value === 'all' ? '' : value
    setFilterBatch(batchId)
    reloadAll({ batchId })
  }

  function handleSearch(value: string) {
    setSearch(value)
    reloadAll({ searchValue: value })
  }

  function openStudentAssignDialog() {
    if (role !== 'centre_head') return
    if (!selectedStudent) return toast.error('Select a student first.')
    if (availableStudentBatches.length === 0) return toast.error('No additional batches are available for this student.')
    setEditingEnrollmentId(null)
    setStudentBatchId(availableStudentBatches[0].id)
    setEnrollDate(format(new Date(), 'yyyy-MM-dd'))
    setMonthlyFee('')
    setStudentDialogOpen(true)
  }

  function openTeacherAssignDialog() {
    if (role !== 'centre_head') return
    const defaultTeacherId = selectedTeacher?.teacher_id ?? teacherOptions[0]?.id
    if (!defaultTeacherId) return toast.error('No teacher is available in your centre scope.')
    if (availableTeacherBatches.length === 0) return toast.error('No batches are available for assignment.')

    setEditingAssignmentId(null)
    setTeacherId(defaultTeacherId)
    setTeacherBatchId(availableTeacherBatches[0].id)
    setTeacherSubject('')
    setTeacherSalary('')
    setTeacherStartDate(format(new Date(), 'yyyy-MM-dd'))
    setTeacherDialogOpen(true)
  }

  function openEnrollmentEditDialog(enrollmentId: string, monthlyFeeValue: number, enrollmentDateValue: string) {
    setEditingEnrollmentId(enrollmentId)
    setMonthlyFee(String(monthlyFeeValue))
    setEnrollDate(enrollmentDateValue)
    setStudentDialogOpen(true)
  }

  function openStudentProfileDialog() {
    if (!selectedStudent) return
    setStudentFullName(selectedStudent.student_name)
    setStudentPhone(selectedStudent.phone ?? '')
    setStudentParentName(selectedStudent.parent_name ?? '')
    setStudentParentPhone(selectedStudent.parent_phone ?? '')
    setStudentClassLevel(selectedStudent.class_level ? String(selectedStudent.class_level) : '')
    setStudentProfileDialogOpen(true)
  }

  function openTeacherProfileDialog() {
    if (!selectedTeacher) return
    setTeacherFullName(selectedTeacher.teacher_name)
    setTeacherPhone(selectedTeacher.phone ?? '')
    setTeacherProfileDialogOpen(true)
  }

  function openTeacherEditDialog(assignmentId: string, assignment: TeacherEnrollmentProfile['assignments'][number]) {
    setEditingAssignmentId(assignmentId)
    setTeacherSubject(assignment.subject ?? '')
    setTeacherSalary(String(assignment.monthly_salary ?? 0))
    setTeacherStartDate(assignment.assignment_start_date ?? format(new Date(), 'yyyy-MM-dd'))
    setTeacherDialogOpen(true)
  }

  async function handleStudentAssign() {
    if (!selectedStudent) return
    setSaving(true)
    try {
      const payload = await fetchJson<{ amount_due?: number; first_invoice_amount_due?: number }>('/api/manage/enrollments', {
        method: editingEnrollmentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingEnrollmentId
            ? {
                id: editingEnrollmentId,
                action: 'update',
                enrollment_date: enrollDate,
                monthly_fee: monthlyFee,
              }
            : {
                student_id: selectedStudent.student_id,
                batch_id: studentBatchId,
                enrollment_date: enrollDate,
                monthly_fee: monthlyFee,
              },
        ),
      })
      toast.success(
        editingEnrollmentId
          ? `Enrollment updated. First invoice: Rs ${Number(payload.first_invoice_amount_due ?? 0).toFixed(2)}`
          : `Student assigned. First invoice: Rs ${Number(payload.amount_due).toFixed(2)}`,
      )
      setStudentDialogOpen(false)
      setEditingEnrollmentId(null)
      reloadAll()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : editingEnrollmentId ? 'Failed to update enrollment' : 'Failed to assign student')
    } finally {
      setSaving(false)
    }
  }

  async function handleTeacherAssign() {
    setSaving(true)
    try {
      await fetchJson('/api/manage/teachers', {
        method: editingAssignmentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingAssignmentId
            ? {
                id: editingAssignmentId,
                action: 'update',
                subject: teacherSubject || null,
                monthly_salary: teacherSalary,
                assignment_start_date: teacherStartDate,
              }
            : {
                user_id: teacherId,
                batch_id: teacherBatchId,
                subject: teacherSubject || null,
                monthly_salary: teacherSalary,
                assignment_start_date: teacherStartDate,
              },
        ),
      })
      toast.success(editingAssignmentId ? 'Teacher assignment updated.' : 'Teacher assignment added.')
      setTeacherDialogOpen(false)
      setEditingAssignmentId(null)
      reloadAll()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : editingAssignmentId ? 'Failed to update teacher assignment' : 'Failed to assign teacher')
    } finally {
      setSaving(false)
    }
  }

  async function handleStudentProfileSave() {
    if (!selectedStudent) return
    setSaving(true)
    try {
      await fetchJson('/api/manage/enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.student_id,
          action: 'update_profile',
          full_name: studentFullName,
          phone: studentPhone || null,
          parent_name: studentParentName || null,
          parent_phone: studentParentPhone || null,
          class_level: studentClassLevel,
        }),
      })
      toast.success('Student profile updated.')
      setStudentProfileDialogOpen(false)
      reloadAll()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update student profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleTeacherProfileSave() {
    if (!selectedTeacher) return
    setSaving(true)
    try {
      await fetchJson('/api/manage/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: selectedTeacher.teacher_id,
          action: 'update_profile',
          full_name: teacherFullName,
          phone: teacherPhone || null,
        }),
      })
      toast.success('Teacher profile updated.')
      setTeacherProfileDialogOpen(false)
      reloadAll()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update teacher profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleStudentWithdraw(enrollmentId: string, batchName: string) {
    if (role !== 'centre_head') return
    if (!confirm(`Withdraw this student from ${batchName}?`)) return
    try {
      await fetchJson('/api/manage/enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: enrollmentId, status: 'withdrawn' }),
      })
      toast.success('Enrollment withdrawn.')
      reloadAll()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to withdraw enrollment')
    }
  }

  async function handleTeacherWithdraw(assignmentId: string, batchName: string, subject: string | null) {
    if (role !== 'centre_head') return
    if (!confirm(`Remove this teacher assignment from ${batchName}${subject ? ` (${subject})` : ''}?`)) return
    try {
      await fetchJson('/api/manage/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignmentId, action: 'unassign' }),
      })
      toast.success('Teacher assignment withdrawn.')
      reloadAll()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to withdraw teacher assignment')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Enrollment Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage student and teacher profiles, assignments, and recurring financial values from one place.</p>
        </div>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
        </TabsList>

        <div className="grid gap-4 md:grid-cols-[1fr_220px_240px]">
          <div className="space-y-2">
            <Label htmlFor="entity-search">Search</Label>
            <Input id="entity-search" value={search} onChange={(event) => handleSearch(event.target.value)} placeholder="Search by name, code, batch, or subject" />
          </div>
          <SelectField id="enrollment-centre-filter" label="Centre" value={filterCentre || 'all'} onChange={handleCentreFilter} options={[{ value: 'all', label: 'All centres' }, ...centres.map((centre) => ({ value: centre.id, label: centre.centre_name }))]} placeholder="All centres" />
          <SelectField id="enrollment-batch-filter" label="Batch" value={filterBatch || 'all'} onChange={handleBatchFilter} options={[{ value: 'all', label: 'All batches' }, { value: 'unassigned', label: 'Unassigned' }, ...[...new Map([...studentBatches, ...teacherBatches].map((batch) => [batch.id, batch])).values()].filter((batch) => !filterCentre || batch.centre_id === filterCentre).map((batch) => ({ value: batch.id, label: batch.batch_name }))]} placeholder="All batches" />
        </div>

        <TabsContent value="students" className="space-y-4">
          <div className="flex justify-end">
            {role === 'centre_head' && <Button onClick={openStudentAssignDialog} disabled={!selectedStudent}><Plus className="mr-2 h-4 w-4" />Assign Student Batch</Button>}
          </div>

          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Card className="gap-0 overflow-hidden py-0">
              <div className="border-b bg-muted/30 px-5 py-3.5">
                <CardTitle className="text-base tracking-tight">Students</CardTitle>
                <CardDescription className="mt-0.5">{students.length} student profile(s)</CardDescription>
              </div>
              <div className="max-h-[680px] overflow-y-auto">
                {studentDataState.loading ? <div className="h-56 animate-pulse bg-muted/20" /> : students.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground"><UserRoundSearch className="mb-3 h-8 w-8 opacity-20" />No student profiles match the current filters.</div>
                ) : (
                  <div className="divide-y">
                    {students.map((student) => (
                      <button key={student.student_id} type="button" onClick={() => setSelectedStudentId(student.student_id)} className={`w-full px-5 py-4 text-left transition-colors hover:bg-muted/30 ${selectedStudent?.student_id === student.student_id ? 'bg-muted/40' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{student.student_name}</div>
                            <div className="font-mono text-xs text-muted-foreground">{student.student_code || '-'}</div>
                          </div>
                          <Badge variant="outline" className={student.status === 'assigned' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-muted/50 text-muted-foreground'}>{student.status === 'assigned' ? `${student.assignment_count} batch${student.assignment_count === 1 ? '' : 'es'}` : 'Unassigned'}</Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>Total monthly fee</span><span className="font-medium text-foreground">Rs {student.total_monthly_fee.toLocaleString('en-IN')}</span></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="gap-0 overflow-hidden py-0">
              <div className="border-b bg-muted/30 px-5 py-3.5">
                <CardTitle className="text-base tracking-tight">Student Profile</CardTitle>
                <CardDescription className="mt-0.5">Assignments, fees, and invoice impact</CardDescription>
              </div>
              {!selectedStudent ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground"><Users className="mb-3 h-8 w-8 opacity-20" />Select a student profile to view assignments.</div>
              ) : (
                <div className="space-y-5 px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                    <div><div className="text-xl font-semibold">{selectedStudent.student_name}</div><div className="mt-1 font-mono text-sm text-muted-foreground">{selectedStudent.student_code || '-'}</div><div className="mt-1 text-sm text-muted-foreground">Phone: {selectedStudent.phone || '-'} · Parent: {selectedStudent.parent_name || '-'} · Parent phone: {selectedStudent.parent_phone || '-'} · Class: {selectedStudent.class_level ?? '-'}</div></div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-lg border bg-background px-3 py-2"><div className="text-muted-foreground">Assigned batches</div><div className="font-medium">{selectedStudent.assignment_count}</div></div>
                      <div className="rounded-lg border bg-background px-3 py-2"><div className="text-muted-foreground">Recurring monthly fee</div><div className="font-medium">Rs {selectedStudent.total_monthly_fee.toLocaleString('en-IN')}</div></div>
                    </div>
                  </div>
                  {role === 'centre_head' && <div className="flex justify-end"><Button variant="outline" size="sm" onClick={openStudentProfileDialog}>Edit Student Profile</Button></div>}
                  {selectedStudent.assignments.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">This student has no active batch assignment yet. Add a batch assignment to begin monthly fee tracking and invoice generation.</div>
                  ) : (
                    <div className="space-y-3">
                      {selectedStudent.assignments.map((assignment) => (
                        <div key={assignment.enrollment_id} className="rounded-xl border bg-background p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{assignment.batch_name}</div><div className="mt-1 text-sm text-muted-foreground">{assignment.centre_name || 'Unknown centre'}</div></div><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge></div>
                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><div className="text-muted-foreground">Enrolled on</div><div className="font-medium">{assignment.enrollment_date}</div></div><div><div className="text-muted-foreground">Monthly fee</div><div className="font-medium">Rs {assignment.monthly_fee.toLocaleString('en-IN')}</div></div><div><div className="text-muted-foreground">Billing rule</div><div className="font-medium">Monthly invoices follow this assigned fee</div></div></div>
                          {role === 'centre_head' && (
                            <div className="mt-4 flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEnrollmentEditDialog(assignment.enrollment_id, assignment.monthly_fee, assignment.enrollment_date)}>Edit</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleStudentWithdraw(assignment.enrollment_id, assignment.batch_name)} className="text-red-500 hover:bg-red-500/10 hover:text-red-600"><Power className="mr-1.5 h-3.5 w-3.5" />Withdraw</Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <div className="flex justify-end">
            {role === 'centre_head' && <Button onClick={openTeacherAssignDialog} disabled={!teacherOptions.length}><Plus className="mr-2 h-4 w-4" />Assign Teacher Batch</Button>}
          </div>

          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Card className="gap-0 overflow-hidden py-0">
              <div className="border-b bg-muted/30 px-5 py-3.5"><CardTitle className="text-base tracking-tight">Teachers</CardTitle><CardDescription className="mt-0.5">{teachers.length} teacher profile(s)</CardDescription></div>
              <div className="max-h-[680px] overflow-y-auto">
                {teacherDataState.loading ? <div className="h-56 animate-pulse bg-muted/20" /> : teachers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground"><UserRoundSearch className="mb-3 h-8 w-8 opacity-20" />No teacher profiles match the current filters.</div>
                ) : (
                  <div className="divide-y">
                    {teachers.map((teacher) => (
                      <button key={teacher.teacher_id} type="button" onClick={() => setSelectedTeacherId(teacher.teacher_id)} className={`w-full px-5 py-4 text-left transition-colors hover:bg-muted/30 ${selectedTeacher?.teacher_id === teacher.teacher_id ? 'bg-muted/40' : ''}`}>
                        <div className="flex items-start justify-between gap-3"><div><div className="font-medium">{teacher.teacher_name}</div></div><Badge variant="outline" className={teacher.status === 'assigned' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-muted/50 text-muted-foreground'}>{teacher.status === 'assigned' ? `${teacher.assignment_count} assignment${teacher.assignment_count === 1 ? '' : 's'}` : 'Unassigned'}</Badge></div>
                        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>Total monthly salary</span><span className="font-medium text-foreground">Rs {teacher.total_monthly_salary.toLocaleString('en-IN')}</span></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="gap-0 overflow-hidden py-0">
              <div className="border-b bg-muted/30 px-5 py-3.5"><CardTitle className="text-base tracking-tight">Teacher Profile</CardTitle><CardDescription className="mt-0.5">Assignment breakdown and salary source details</CardDescription></div>
              {!selectedTeacher ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground"><Users className="mb-3 h-8 w-8 opacity-20" />Select a teacher profile to view assignments.</div>
              ) : (
                <div className="space-y-5 px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                    <div><div className="text-xl font-semibold">{selectedTeacher.teacher_name}</div><div className="mt-1 text-sm text-muted-foreground">Phone: {selectedTeacher.phone || '-'}</div></div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2"><div className="rounded-lg border bg-background px-3 py-2"><div className="text-muted-foreground">Assignments</div><div className="font-medium">{selectedTeacher.assignment_count}</div></div><div className="rounded-lg border bg-background px-3 py-2"><div className="text-muted-foreground">Recurring monthly salary</div><div className="font-medium">Rs {selectedTeacher.total_monthly_salary.toLocaleString('en-IN')}</div></div></div>
                  </div>
                  {role === 'centre_head' && <div className="flex justify-end"><Button variant="outline" size="sm" onClick={openTeacherProfileDialog}>Edit Teacher Profile</Button></div>}
                  {selectedTeacher.assignments.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">This teacher has no active assignments yet. Add a batch and optional subject assignment to include them in salary tracking.</div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTeacher.assignments.map((assignment) => (
                        <div key={assignment.assignment_id ?? `${assignment.teacher_id}-unassigned`} className="rounded-xl border bg-background p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{assignment.batch_name}</div><div className="mt-1 text-sm text-muted-foreground">{assignment.centre_name || 'Unknown centre'}{assignment.subject ? ` · ${assignment.subject}` : ''}</div></div><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge></div>
                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><div className="text-muted-foreground">Assignment start</div><div className="font-medium">{assignment.assignment_start_date || '-'}</div></div><div><div className="text-muted-foreground">Monthly salary</div><div className="font-medium">Rs {Number(assignment.monthly_salary ?? 0).toLocaleString('en-IN')}</div></div><div><div className="text-muted-foreground">Salary rule</div><div className="font-medium">This assignment amount is included in monthly salary records</div></div></div>
                          {role === 'centre_head' && assignment.assignment_id && (
                            <div className="mt-4 flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openTeacherEditDialog(assignment.assignment_id!, assignment)}>Edit</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleTeacherWithdraw(assignment.assignment_id!, assignment.batch_name, assignment.subject)} className="text-red-500 hover:bg-red-500/10 hover:text-red-600"><Power className="mr-1.5 h-3.5 w-3.5" />Withdraw</Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ManageDialog open={studentDialogOpen} onOpenChange={(open) => { setStudentDialogOpen(open); if (!open) setEditingEnrollmentId(null) }} title={editingEnrollmentId ? 'Edit Student Enrollment' : 'Assign Student to Batch'} description={editingEnrollmentId ? 'Update the recurring monthly fee and, if needed, adjust the enrollment date within the same month.' : 'Set the batch and monthly fee. The first invoice is prorated for the remaining days in the selected month.'} onSubmit={handleStudentAssign} saving={saving} submitLabel={editingEnrollmentId ? 'Update Enrollment' : 'Assign & Create Invoice'}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Student</Label><div className="rounded-md border bg-muted/20 p-3"><div className="font-medium">{selectedStudent?.student_name}</div><div className="font-mono text-sm text-muted-foreground">{selectedStudent?.student_code || '-'}</div></div></div>
          {!editingEnrollmentId && <SelectField id="student-batch-assign" label="Select Batch *" value={studentBatchId} onChange={setStudentBatchId} options={availableStudentBatches.map((batch) => ({ value: batch.id, label: batch.batch_name }))} placeholder="Choose batch" />}
          <div className="grid gap-4 md:grid-cols-2"><DatePickerField id="enroll-date" label="Enrollment Date *" value={enrollDate} onChange={setEnrollDate} max={format(new Date(), 'yyyy-MM-dd')} /><div className="space-y-2"><Label htmlFor="monthly-fee">Monthly Fee (Rs) *</Label><Input id="monthly-fee" type="number" min="0" step="0.01" value={monthlyFee} onChange={(event) => setMonthlyFee(event.target.value)} placeholder="e.g. 5000" required /></div></div>
          {parseFloat(monthlyFee) >= 0 && monthlyFee !== '' && <div className="rounded-lg border bg-muted/40 p-4 text-sm"><div className="flex items-center justify-between text-muted-foreground"><span>First invoice</span><span>Prorated for remaining days in month</span></div><div className="mt-2 flex items-center justify-between"><span className="font-medium">Estimated amount due</span><span className="text-lg font-semibold text-emerald-600">Rs {proratedEstimate.toFixed(2)}</span></div><p className="mt-2 text-muted-foreground">Subsequent monthly invoices use the assigned monthly fee until the enrollment is updated or withdrawn.</p></div>}
        </div>
      </ManageDialog>

      <ManageDialog open={teacherDialogOpen} onOpenChange={(open) => { setTeacherDialogOpen(open); if (!open) setEditingAssignmentId(null) }} title={editingAssignmentId ? 'Edit Teacher Assignment' : 'Assign Teacher to Batch'} description={editingAssignmentId ? 'Update the assignment salary, subject, and start date within the same month.' : 'Add a salary-bearing assignment for a teacher. Multiple batches and multiple subjects are supported.'} onSubmit={handleTeacherAssign} saving={saving} submitLabel={editingAssignmentId ? 'Update Assignment' : 'Assign Teacher'}>
        <div className="space-y-4">
          {!editingAssignmentId && <SelectField id="teacher-assign-select" label="Teacher *" value={teacherId} onChange={setTeacherId} options={teacherOptions.map((teacher) => ({ value: teacher.id, label: teacher.full_name }))} placeholder="Choose teacher" />}
          {!editingAssignmentId && <SelectField id="teacher-batch-assign" label="Batch *" value={teacherBatchId} onChange={setTeacherBatchId} options={availableTeacherBatches.map((batch) => ({ value: batch.id, label: batch.batch_name }))} placeholder="Choose batch" />}
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="teacher-subject">Subject</Label><Input id="teacher-subject" value={teacherSubject} onChange={(event) => setTeacherSubject(event.target.value)} placeholder="e.g. Mathematics" /></div><div className="space-y-2"><Label htmlFor="teacher-salary">Monthly Salary (Rs) *</Label><Input id="teacher-salary" type="number" min="0" step="0.01" value={teacherSalary} onChange={(event) => setTeacherSalary(event.target.value)} placeholder="e.g. 12000" required /></div></div>
          <DatePickerField id="teacher-start-date" label="Assignment Start Date *" value={teacherStartDate} onChange={setTeacherStartDate} max={format(new Date(), 'yyyy-MM-dd')} />
          {teacherSalary && <div className="rounded-lg border bg-muted/40 p-4 text-sm"><div className="flex items-center justify-between"><span className="text-muted-foreground">Salary contribution</span><span className="font-semibold text-foreground">Rs {Number(teacherSalary || 0).toLocaleString('en-IN')} / month</span></div><p className="mt-2 text-muted-foreground">This assignment amount is carried into generated monthly salary records until the assignment is withdrawn.</p></div>}
        </div>
      </ManageDialog>

      <ManageDialog open={studentProfileDialogOpen} onOpenChange={setStudentProfileDialogOpen} title="Edit Student Profile" description="Update student identity and guardian details used across enrollment and reporting workflows." onSubmit={handleStudentProfileSave} saving={saving} submitLabel="Save Student Profile">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="student-full-name">Student Name *</Label><Input id="student-full-name" value={studentFullName} onChange={(event) => setStudentFullName(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="student-phone">Phone</Label><Input id="student-phone" value={studentPhone} onChange={(event) => setStudentPhone(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="student-parent-name">Parent Name</Label><Input id="student-parent-name" value={studentParentName} onChange={(event) => setStudentParentName(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="student-parent-phone">Parent Phone</Label><Input id="student-parent-phone" value={studentParentPhone} onChange={(event) => setStudentParentPhone(event.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="student-class-level">Class Level *</Label><Input id="student-class-level" type="number" min="1" max="12" value={studentClassLevel} onChange={(event) => setStudentClassLevel(event.target.value)} required /></div>
        </div>
      </ManageDialog>

      <ManageDialog open={teacherProfileDialogOpen} onOpenChange={setTeacherProfileDialogOpen} title="Edit Teacher Profile" description="Update teacher identity details used across assignments, salary records, and reports." onSubmit={handleTeacherProfileSave} saving={saving} submitLabel="Save Teacher Profile">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="teacher-full-name">Teacher Name *</Label><Input id="teacher-full-name" value={teacherFullName} onChange={(event) => setTeacherFullName(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="teacher-phone-profile">Phone</Label><Input id="teacher-phone-profile" value={teacherPhone} onChange={(event) => setTeacherPhone(event.target.value)} /></div>
        </div>
      </ManageDialog>
    </div>
  )
}
