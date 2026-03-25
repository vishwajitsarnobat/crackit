/**
 * Student Enrollment API
 * GET   — Returns student enrollment profiles plus centres/batches dropdowns.
 * POST  — Creates enrollment + prorated first invoice.
 * PATCH — Withdraws an active student enrollment.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiError, apiSuccess } from '@/lib/api/api-helpers'
import { createEnrollmentSchema, modifyEnrollmentSchema, updateEnrollmentSchema, updateStudentProfileSchema } from '@/lib/validations/manage'

type CentreRow = { id: string; centre_name: string }
type BatchRow = { id: string; batch_name: string; centre_id: string }
type EnrollmentRow = {
  id: string
  student_id: string
  batch_id: string
  enrollment_date: string
  monthly_fee: number
  status: 'active' | 'withdrawn'
  students: {
    student_code: string | null
    parent_name: string | null
    parent_phone: string | null
    class_level: number | null
    users: { full_name: string | null; phone: string | null } | Array<{ full_name: string | null; phone: string | null }> | null
  } | Array<{
    student_code: string | null
    parent_name: string | null
    parent_phone: string | null
    class_level: number | null
    users: { full_name: string | null; phone: string | null } | Array<{ full_name: string | null; phone: string | null }> | null
  }> | null
  batches: {
    batch_name: string | null
    centre_id: string | null
    centres: { centre_name: string | null } | Array<{ centre_name: string | null }> | null
  } | Array<{
    batch_name: string | null
    centre_id: string | null
    centres: { centre_name: string | null } | Array<{ centre_name: string | null }> | null
  }> | null
}

type StudentRow = {
  id: string
  user_id: string
  student_code: string | null
  parent_name: string | null
  parent_phone: string | null
  class_level: number | null
  users: { full_name: string | null; phone: string | null } | Array<{ full_name: string | null; phone: string | null }> | null
}

type UserCentreAssignmentRow = {
  user_id: string
  centre_id: string
}

type StudentCentreValidationRow = {
  id: string
  user_id: string
  is_active: boolean | null
  users: {
    is_active: boolean | null
    roles: { role_name: string | null } | { role_name: string | null }[] | null
  } | null
}

type CentreAssignmentCheckRow = {
  centre_id: string | null
}

type RoleRelation = { role_name: string | null } | Array<{ role_name: string | null }> | null

function resolveRoleName(roles: RoleRelation) {
  if (Array.isArray(roles)) return roles[0]?.role_name ?? null
  return roles?.role_name ?? null
}

type StudentProfile = {
  student_id: string
  student_name: string
  student_code: string | null
  phone: string | null
  parent_name: string | null
  parent_phone: string | null
  class_level: number | null
  centre_ids: string[]
  assignments: Array<{
    enrollment_id: string
    batch_id: string
    batch_name: string
    centre_id: string | null
    centre_name: string | null
    enrollment_date: string
    monthly_fee: number
    status: 'active' | 'withdrawn'
  }>
  total_monthly_fee: number
  assignment_count: number
  status: 'assigned' | 'unassigned'
}

function matchesSearch(profile: StudentProfile, search: string) {
  if (!search) return true
  const query = search.toLowerCase()

  return (
    profile.student_name.toLowerCase().includes(query) ||
    (profile.student_code ?? '').toLowerCase().includes(query) ||
    profile.assignments.some((assignment) => assignment.batch_name.toLowerCase().includes(query))
  )
}

function getProratedAmount(monthlyFee: number, enrollmentDate: string) {
  const date = new Date(`${enrollmentDate}T00:00:00`)
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const remainingDays = daysInMonth - date.getDate() + 1
  return Math.round(((monthlyFee * remainingDays) / daysInMonth) * 100) / 100
}

export const GET = withAuth(async (request, ctx) => {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { searchParams } = new URL(request.url)
  const centreFilter = searchParams.get('centreId')
  const batchFilter = searchParams.get('batchId')
  const search = searchParams.get('search')?.trim() ?? ''

  let centresData: CentreRow[] = []
  if (ctx.profile.role === 'ceo') {
    const { data } = await supabase
      .from('centres')
      .select('id, centre_name')
      .eq('is_active', true)
      .order('centre_name')
    centresData = (data ?? []) as CentreRow[]
  } else {
    if (ctx.profile.centreIds.length === 0) {
      return apiSuccess({ students: [], centres: [], batches: [] })
    }

    const { data } = await supabase
      .from('centres')
      .select('id, centre_name')
      .in('id', ctx.profile.centreIds)
      .eq('is_active', true)
      .order('centre_name')
    centresData = (data ?? []) as CentreRow[]
  }

  const scopedCentreIds = ctx.profile.role === 'ceo'
    ? (centreFilter ? [centreFilter] : centresData.map((centre) => centre.id))
    : (centreFilter && ctx.profile.centreIds.includes(centreFilter) ? [centreFilter] : ctx.profile.centreIds)

  if (centreFilter && ctx.profile.role !== 'ceo' && !ctx.profile.centreIds.includes(centreFilter)) {
    return apiError('You are not authorized for this centre filter.', 403)
  }

  let batchQuery = supabase
    .from('batches')
    .select('id, batch_name, centre_id')
    .eq('is_active', true)
    .order('batch_name')

  if (scopedCentreIds.length > 0) {
    batchQuery = batchQuery.in('centre_id', scopedCentreIds)
  }

  const { data: batchesData } = await batchQuery
  const batches = (batchesData ?? []) as BatchRow[]
  const visibleBatchIds = batches.map((batch) => batch.id)

  if (batchFilter && batchFilter !== 'unassigned' && !visibleBatchIds.includes(batchFilter)) {
    return apiError('You are not authorized for this batch filter.', 403)
  }

  let enrollmentQuery = adminClient
    .from('student_batch_enrollments')
    .select('id, student_id, batch_id, enrollment_date, monthly_fee, status, students!inner(student_code, parent_name, parent_phone, class_level, users!inner(full_name, phone)), batches!inner(batch_name, centre_id, centres!inner(centre_name))')
    .eq('status', 'active')

  if (batchFilter) {
    enrollmentQuery = enrollmentQuery.eq('batch_id', batchFilter)
  } else if (visibleBatchIds.length > 0) {
    enrollmentQuery = enrollmentQuery.in('batch_id', visibleBatchIds)
  }

  const { data: enrollmentData, error: enrollmentError } = await enrollmentQuery.order('enrollment_date', { ascending: false })
  if (enrollmentError) return apiError(enrollmentError.message, 500)

  const profiles = new Map<string, StudentProfile>()
  for (const enrollment of (enrollmentData ?? []) as EnrollmentRow[]) {
    const studentInfo = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students
    const studentUser = Array.isArray(studentInfo?.users) ? studentInfo?.users[0] : studentInfo?.users
    const batchInfo = Array.isArray(enrollment.batches) ? enrollment.batches[0] : enrollment.batches
    const centreInfo = Array.isArray(batchInfo?.centres) ? batchInfo?.centres[0] : batchInfo?.centres
    const existing = profiles.get(enrollment.student_id) ?? {
      student_id: enrollment.student_id,
      student_name: studentUser?.full_name ?? 'Unknown',
      student_code: studentInfo?.student_code ?? null,
      phone: studentUser?.phone ?? null,
      parent_name: studentInfo?.parent_name ?? null,
      parent_phone: studentInfo?.parent_phone ?? null,
      class_level: studentInfo?.class_level ?? null,
      centre_ids: [],
      assignments: [],
      total_monthly_fee: 0,
      assignment_count: 0,
      status: 'assigned' as const,
    }

    if (batchInfo?.centre_id && !existing.centre_ids.includes(batchInfo.centre_id)) {
      existing.centre_ids.push(batchInfo.centre_id)
    }

    existing.assignments.push({
      enrollment_id: enrollment.id,
      batch_id: enrollment.batch_id,
      batch_name: batchInfo?.batch_name ?? '-',
      centre_id: batchInfo?.centre_id ?? null,
      centre_name: centreInfo?.centre_name ?? null,
      enrollment_date: enrollment.enrollment_date,
      monthly_fee: Number(enrollment.monthly_fee),
      status: enrollment.status,
    })
    existing.total_monthly_fee += Number(enrollment.monthly_fee)
    existing.assignment_count += 1

    profiles.set(enrollment.student_id, existing)
  }

  const scopedStudentUserIds = scopedCentreIds.length === 0
    ? []
    : ((await adminClient
      .from('user_centre_assignments')
      .select('user_id, centre_id')
      .in('centre_id', scopedCentreIds)
      .eq('is_active', true)).data ?? []) as UserCentreAssignmentRow[]

  const userIds = [...new Set(scopedStudentUserIds.map((row) => row.user_id))]
  if (userIds.length > 0) {
    const { data: studentsData, error: studentsError } = await adminClient
      .from('students')
      .select('id, user_id, student_code, parent_name, parent_phone, class_level, users!inner(full_name, phone)')
      .in('user_id', userIds)
      .eq('is_active', true)
      .order('student_code', { ascending: false })

    if (studentsError) return apiError(studentsError.message, 500)

    const centreMap = new Map<string, string[]>()
    for (const row of scopedStudentUserIds) {
      const values = centreMap.get(row.user_id) ?? []
      if (!values.includes(row.centre_id)) values.push(row.centre_id)
      centreMap.set(row.user_id, values)
    }

    for (const student of (studentsData ?? []) as StudentRow[]) {
      if (profiles.has(student.id)) continue
      const studentUser = Array.isArray(student.users) ? student.users[0] : student.users

      profiles.set(student.id, {
        student_id: student.id,
        student_name: studentUser?.full_name ?? 'Unknown',
        student_code: student.student_code ?? null,
        phone: studentUser?.phone ?? null,
        parent_name: student.parent_name ?? null,
        parent_phone: student.parent_phone ?? null,
        class_level: student.class_level ?? null,
        centre_ids: centreMap.get(student.user_id) ?? [],
        assignments: [],
        total_monthly_fee: 0,
        assignment_count: 0,
        status: 'unassigned',
      })
    }
  }

  let studentProfiles = Array.from(profiles.values())
  if (centreFilter) {
    studentProfiles = studentProfiles.filter(
      (profile) => profile.centre_ids.includes(centreFilter) || profile.assignments.some((assignment) => assignment.centre_id === centreFilter),
    )
  }
  if (search) {
    studentProfiles = studentProfiles.filter((profile) => matchesSearch(profile, search))
  }
  if (batchFilter === 'unassigned') {
    studentProfiles = studentProfiles.filter((profile) => profile.assignment_count === 0)
  } else if (batchFilter) {
    studentProfiles = studentProfiles.filter((profile) => profile.assignments.some((assignment) => assignment.batch_id === batchFilter))
  }

  studentProfiles.sort((left, right) => left.student_name.localeCompare(right.student_name))

  return apiSuccess({
    students: studentProfiles,
    centres: centresData,
    batches,
  })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request, ctx) => {
  if (ctx.profile.role !== 'centre_head') {
    return apiError('Only centre heads can manage enrollments.', 403)
  }

  const body = await request.json()
  const parsed = createEnrollmentSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
  }

  const { student_id, batch_id, enrollment_date, monthly_fee } = parsed.data
  const supabase = await createClient()

  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('centre_id, batch_name')
    .eq('id', batch_id)
    .single()

  if (batchError || !batch) return apiError('Batch not found.', 404)
  if (!ctx.profile.centreIds.includes(batch.centre_id)) {
    return apiError('You are not authorized for this batch.', 403)
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, user_id, is_active, users!inner(is_active, roles!inner(role_name))')
    .eq('id', student_id)
    .single()

  if (studentError || !student) return apiError('Student not found.', 404)

  const typedStudent = student as unknown as StudentCentreValidationRow
  if (typedStudent.is_active !== true || typedStudent.users?.is_active !== true) {
    return apiError('Only active students can be enrolled into batches.', 400)
  }

  if (resolveRoleName(typedStudent.users?.roles ?? null) !== 'student') {
    return apiError('Selected user is not a student profile.', 400)
  }

  const { data: centreAssignments, error: centreAssignmentError } = await supabase
    .from('user_centre_assignments')
    .select('centre_id')
    .eq('user_id', typedStudent.user_id)
    .eq('is_active', true)

  if (centreAssignmentError) return apiError(centreAssignmentError.message, 500)

  const studentCentreIds = ((centreAssignments ?? []) as CentreAssignmentCheckRow[])
    .map((assignment) => assignment.centre_id)
    .filter((centreId): centreId is string => Boolean(centreId))

  if (!studentCentreIds.includes(batch.centre_id)) {
    return apiError('Student is not assigned to the selected batch centre.', 400)
  }

  const { data: existingActive } = await supabase
    .from('student_batch_enrollments')
    .select('id')
    .eq('student_id', student_id)
    .eq('batch_id', batch_id)
    .eq('status', 'active')
    .maybeSingle()

  if (existingActive) {
    return apiError('Student is already actively enrolled in this batch.', 400)
  }

  const { error: enrollError } = await supabase
    .from('student_batch_enrollments')
    .insert({
      student_id,
      batch_id,
      enrollment_date,
      monthly_fee,
      status: 'active',
    })
    .select('id')
    .single()

  if (enrollError) return apiError(enrollError.message ?? 'Failed to create enrollment.', 400)

  const monthYear = `${enrollment_date.slice(0, 7)}-01`

  const { data: initialInvoice, error: invoiceError } = await supabase
    .from('student_invoices')
    .select('amount_due')
    .eq('student_id', student_id)
    .eq('batch_id', batch_id)
    .eq('month_year', monthYear)
    .maybeSingle()

  if (invoiceError) {
    return apiError(invoiceError.message, 400)
  }

  if (!initialInvoice) {
    return apiError('Enrollment was created, but the initial invoice was not generated.', 500)
  }

  return apiSuccess({
    ok: true,
    amount_due: Number(initialInvoice.amount_due),
    invoice_note: 'First invoice is now created automatically in the database and prorated for the remaining days in the selected month. Future monthly invoices use the assignment monthly fee.',
  })
}, ['ceo', 'centre_head'])

export const PATCH = withAuth(async (request, ctx) => {
  if (ctx.profile.role !== 'centre_head') {
    return apiError('Only centre heads can manage enrollments.', 403)
  }

  const body = await request.json()
  const updateProfileParsed = updateStudentProfileSchema.safeParse(body)
  const modifyParsed = modifyEnrollmentSchema.safeParse(body)
  const withdrawParsed = updateEnrollmentSchema.safeParse(body)
  if (!updateProfileParsed.success && !modifyParsed.success && !withdrawParsed.success) {
    return apiError(updateProfileParsed.error?.issues[0]?.message ?? modifyParsed.error?.issues[0]?.message ?? withdrawParsed.error?.issues[0]?.message ?? 'Invalid input', 400)
  }

  const supabase = await createClient()
  if (updateProfileParsed.success) {
    const { student_id, full_name, phone, parent_name, parent_phone, class_level } = updateProfileParsed.data
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, user_id, is_active')
      .eq('id', student_id)
      .single()

    if (studentError || !student) return apiError('Student not found.', 404)

    const { data: studentCentreAssignments, error: studentCentreAssignmentsError } = await supabase
      .from('user_centre_assignments')
      .select('centre_id, is_active')
      .eq('user_id', student.user_id)

    if (studentCentreAssignmentsError) return apiError(studentCentreAssignmentsError.message, 500)

    const centreIds = ((studentCentreAssignments ?? []) as Array<{ centre_id: string | null; is_active: boolean | null }>)
      .filter((assignment) => assignment.is_active === true)
      .map((assignment) => assignment.centre_id)
      .filter((centreId): centreId is string => Boolean(centreId))

    const hasScope = centreIds.some((centreId) => ctx.profile.centreIds.includes(centreId))
    if (!hasScope) return apiError('You are not authorized to update this student profile.', 403)

    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ full_name: full_name.trim(), phone: phone?.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', student.user_id)

    if (userUpdateError) return apiError(userUpdateError.message, 400)

    const { error: studentUpdateError } = await supabase
      .from('students')
      .update({ parent_name: parent_name?.trim() || null, parent_phone: parent_phone?.trim() || null, class_level, updated_at: new Date().toISOString() })
      .eq('id', student_id)

    if (studentUpdateError) return apiError(studentUpdateError.message, 400)

    return apiSuccess({ ok: true })
  }

  if (modifyParsed.success) {
    const { id, monthly_fee, enrollment_date } = modifyParsed.data
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_batch_enrollments')
      .select('id, student_id, batch_id, status, enrollment_date, monthly_fee')
      .eq('id', id)
      .single()

    if (enrollmentError || !enrollment) return apiError('Enrollment not found.', 404)
    if (enrollment.status !== 'active') return apiError('Only active enrollments can be modified.', 400)

    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('centre_id')
      .eq('id', enrollment.batch_id)
      .single()

    if (batchError || !batch || !ctx.profile.centreIds.includes(batch.centre_id)) {
      return apiError('You are not authorized to edit this enrollment.', 403)
    }

    const nextEnrollmentDate = enrollment_date ?? enrollment.enrollment_date
    const originalMonthKey = enrollment.enrollment_date.slice(0, 7)
    const nextMonthKey = nextEnrollmentDate.slice(0, 7)

    if (nextMonthKey !== originalMonthKey) {
      return apiError('Enrollment date can only be adjusted within the same calendar month.', 400)
    }

    const { data: invoiceRows, error: invoiceError } = await supabase
      .from('student_invoices')
      .select('id, month_year, amount_paid, amount_discount, payment_status')
      .eq('student_id', enrollment.student_id)
      .eq('batch_id', enrollment.batch_id)
      .order('month_year', { ascending: true })

    if (invoiceError) return apiError(invoiceError.message, 500)

    const firstMonthInvoice = (invoiceRows ?? []).find((invoice) => invoice.month_year.slice(0, 7) === originalMonthKey)
    if (!firstMonthInvoice) {
      return apiError('Enrollment invoices are missing for this assignment.', 500)
    }

    if ((Number(firstMonthInvoice.amount_paid ?? 0) > 0 || Number(firstMonthInvoice.amount_discount ?? 0) > 0) && nextEnrollmentDate !== enrollment.enrollment_date) {
      return apiError('Enrollment date cannot be changed after payments have been recorded for the first invoice.', 400)
    }

    const hasProtectedFutureInvoices = (invoiceRows ?? []).some((invoice) =>
      invoice.month_year >= originalMonthKey + '-01' &&
      (Number(invoice.amount_paid ?? 0) > 0 || Number(invoice.amount_discount ?? 0) > 0) &&
      Number(monthly_fee) !== Number(enrollment.monthly_fee),
    )

    if (hasProtectedFutureInvoices) {
      return apiError('Monthly fee cannot be changed once related invoices already have payments or reward allocations.', 400)
    }

    const { error: updateEnrollmentError } = await supabase
      .from('student_batch_enrollments')
      .update({
        monthly_fee,
        enrollment_date: nextEnrollmentDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateEnrollmentError) return apiError(updateEnrollmentError.message, 400)

    const nextProratedAmount = getProratedAmount(monthly_fee, nextEnrollmentDate)
    const pendingInvoiceIds = (invoiceRows ?? [])
      .filter((invoice) => Number(invoice.amount_paid ?? 0) === 0 && invoice.payment_status === 'pending')
      .map((invoice) => invoice.id)

    if (pendingInvoiceIds.length > 0) {
      const initialInvoiceId = firstMonthInvoice.id
      const futureInvoiceIds = pendingInvoiceIds.filter((invoiceId) => invoiceId !== initialInvoiceId)

      const { error: initialInvoiceUpdateError } = await supabase
        .from('student_invoices')
        .update({
          monthly_fee,
          amount_due: nextProratedAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', initialInvoiceId)

      if (initialInvoiceUpdateError) return apiError(initialInvoiceUpdateError.message, 400)

      if (futureInvoiceIds.length > 0) {
        const { error: futureInvoiceUpdateError } = await supabase
          .from('student_invoices')
          .update({
            monthly_fee,
            amount_due: monthly_fee,
            updated_at: new Date().toISOString(),
          })
          .in('id', futureInvoiceIds)

        if (futureInvoiceUpdateError) return apiError(futureInvoiceUpdateError.message, 400)
      }
    }

    return apiSuccess({
      ok: true,
      monthly_fee,
      enrollment_date: nextEnrollmentDate,
      first_invoice_amount_due: nextProratedAmount,
    })
  }

  const parsed = withdrawParsed
  if (!parsed.success || parsed.data.status !== 'withdrawn') {
    return apiError('Invalid operation.', 400)
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('student_batch_enrollments')
    .select('id, batch_id, status, enrollment_date')
    .eq('id', parsed.data.id)
    .single()

  if (enrollmentError || !enrollment) return apiError('Enrollment not found.', 404)
  if (enrollment.status !== 'active') return apiError('Only active enrollments can be withdrawn.', 400)

  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('centre_id')
    .eq('id', enrollment.batch_id)
    .single()

  if (batchError || !batch || !ctx.profile.centreIds.includes(batch.centre_id)) {
    return apiError('You are not authorized to withdraw this enrollment.', 403)
  }

  const today = new Date().toISOString().slice(0, 10)
  if (enrollment.enrollment_date > today) {
    return apiError('Future-dated enrollments cannot be withdrawn before they start.', 400)
  }

  const { error } = await supabase
    .from('student_batch_enrollments')
    .update({ status: 'withdrawn', withdrawn_at: today })
    .eq('id', parsed.data.id)

  if (error) return apiError(error.message, 400)
  return apiSuccess({ ok: true })
}, ['ceo', 'centre_head'])
