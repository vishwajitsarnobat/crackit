/**
 * Teacher Batch Assignment API
 * GET   — Returns teacher assignment profiles plus centres/batches/teachers dropdowns.
 * POST  — Creates a salary-ready teacher assignment row.
 * PATCH — Deactivates an assignment and stamps its end date.
 */
import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, withAuth } from '@/lib/api/api-helpers'
import { assignTeacherSchema, unassignTeacherSchema, updateTeacherAssignmentSchema, updateTeacherProfileSchema } from '@/lib/validations/manage'

type CentreRow = { id: string; centre_name: string }
type BatchRow = { id: string; batch_name: string; centre_id: string; centres?: { centre_name: string | null } | null }
type UserCentreAssignmentRow = { user_id: string; centre_id: string }
type UserRow = {
  id: string
  full_name: string | null
  phone?: string | null
  roles: { role_name: string } | { role_name: string }[] | null
}
type TeacherAssignmentRow = {
  id: string
  user_id: string
  batch_id: string
  subject: string | null
  monthly_salary: number
  assignment_start_date: string
  assignment_end_date: string | null
  is_active: boolean
  batches: {
    batch_name: string | null
    centre_id: string | null
    centres: { centre_name: string | null } | null
  } | null
}

type TeacherValidationRow = {
  id: string
  is_active: boolean | null
  roles: { role_name: string | null } | { role_name: string | null }[] | null
}

type CentreAssignmentCheckRow = {
  centre_id: string | null
}

function resolveRoleName(roles: UserRow['roles']) {
  if (Array.isArray(roles)) return roles[0]?.role_name ?? null
  return roles?.role_name ?? null
}

export const GET = withAuth(async (request, ctx) => {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const centreFilter = searchParams.get('centreId')
  const batchFilter = searchParams.get('batchId')
  const search = searchParams.get('search')?.trim().toLowerCase() ?? ''

  const centreIds = ctx.profile.centreIds
  const scopedCentreIds = ctx.profile.role === 'ceo'
    ? (centreFilter ? [centreFilter] : undefined)
    : (centreFilter && centreIds.includes(centreFilter) ? [centreFilter] : centreIds)

  if (centreFilter && ctx.profile.role !== 'ceo' && !centreIds.includes(centreFilter)) {
    return apiError('You are not authorized for this centre filter.', 403)
  }

  let centres: CentreRow[] = []
  if (ctx.profile.role === 'ceo') {
    const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
    centres = (data ?? []) as CentreRow[]
  } else {
    if (centreIds.length === 0) return apiSuccess({ teachers: [], centres: [], batches: [], teacherOptions: [] })
    const { data } = await supabase.from('centres').select('id, centre_name').in('id', centreIds).eq('is_active', true).order('centre_name')
    centres = (data ?? []) as CentreRow[]
  }

  let batchQuery = supabase
    .from('batches')
    .select('id, batch_name, centre_id, centres(centre_name)')
    .eq('is_active', true)
    .order('batch_name')

  if (batchFilter) batchQuery = batchQuery.eq('id', batchFilter)
  if (scopedCentreIds && scopedCentreIds.length > 0) batchQuery = batchQuery.in('centre_id', scopedCentreIds)

  const { data: batchData } = await batchQuery
  const batches = (batchData ?? []) as unknown as BatchRow[]
  const batchIds = batches.map((batch) => batch.id)

  if (batchFilter && !batchIds.includes(batchFilter)) {
    return apiError('You are not authorized for this batch filter.', 403)
  }

  let ucaQuery = supabase.from('user_centre_assignments').select('user_id, centre_id').eq('is_active', true)
  if (scopedCentreIds && scopedCentreIds.length > 0) ucaQuery = ucaQuery.in('centre_id', scopedCentreIds)
  const { data: ucaData } = await ucaQuery
  const centreAssignments = (ucaData ?? []) as UserCentreAssignmentRow[]
  const teacherUserIds = [...new Set(centreAssignments.map((assignment) => assignment.user_id))]

  const { data: userData } = teacherUserIds.length === 0
    ? { data: [] }
    : await supabase
        .from('users')
        .select('id, full_name, phone, roles!inner(role_name)')
        .in('id', teacherUserIds)
        .eq('is_active', true)

  const teachers = ((userData ?? []) as UserRow[])
    .filter((user) => resolveRoleName(user.roles) === 'teacher')
    .map((user) => ({ id: user.id, full_name: user.full_name ?? 'Unknown', phone: (user as UserRow & { phone?: string | null }).phone ?? null }))

  const centreMap = new Map<string, string[]>()
  for (const assignment of centreAssignments) {
    const values = centreMap.get(assignment.user_id) ?? []
    if (!values.includes(assignment.centre_id)) values.push(assignment.centre_id)
    centreMap.set(assignment.user_id, values)
  }

  const { data: assignmentData } = batchIds.length === 0
    ? { data: [] }
    : await supabase
        .from('teacher_batch_assignments')
        .select('id, user_id, batch_id, subject, monthly_salary, assignment_start_date, assignment_end_date, is_active, batches!inner(batch_name, centre_id, centres!inner(centre_name))')
        .in('batch_id', batchIds)
        .eq('is_active', true)
        .order('assignment_start_date', { ascending: false })

  const assignments = (assignmentData ?? []) as unknown as TeacherAssignmentRow[]
  const teacherProfiles = new Map<string, {
    teacher_id: string
    teacher_name: string
    centre_ids: string[]
    assignments: Array<{
      teacher_id: string
      teacher_name: string
      assignment_id: string | null
      batch_id: string | null
      batch_name: string
      centre_name: string | null
      centre_id: string | null
      subject: string | null
      monthly_salary: number | null
      assignment_start_date: string | null
      assignment_end_date: string | null
      status: 'assigned' | 'unassigned'
    }>
    total_monthly_salary: number
    assignment_count: number
    status: 'assigned' | 'unassigned'
  }>()

  for (const teacher of teachers) {
    teacherProfiles.set(teacher.id, {
      teacher_id: teacher.id,
      teacher_name: teacher.full_name,
      phone: (teacher as UserRow & { phone?: string | null }).phone ?? null,
      centre_ids: centreMap.get(teacher.id) ?? [],
      assignments: [],
      total_monthly_salary: 0,
      assignment_count: 0,
      status: 'unassigned',
    })
  }

  for (const assignment of assignments) {
    const profile = teacherProfiles.get(assignment.user_id)
    if (!profile) continue

    profile.assignments.push({
      teacher_id: assignment.user_id,
      teacher_name: profile.teacher_name,
      assignment_id: assignment.id,
      batch_id: assignment.batch_id,
      batch_name: assignment.batches?.batch_name ?? '-',
      centre_name: assignment.batches?.centres?.centre_name ?? null,
      centre_id: assignment.batches?.centre_id ?? null,
      subject: assignment.subject,
      monthly_salary: Number(assignment.monthly_salary),
      assignment_start_date: assignment.assignment_start_date,
      assignment_end_date: assignment.assignment_end_date,
      status: 'assigned',
    })
    profile.total_monthly_salary += Number(assignment.monthly_salary)
    profile.assignment_count += 1
    profile.status = 'assigned'
    if (assignment.batches?.centre_id && !profile.centre_ids.includes(assignment.batches.centre_id)) {
      profile.centre_ids.push(assignment.batches.centre_id)
    }
  }

  let result = Array.from(teacherProfiles.values())
  if (search) {
    result = result.filter((profile) =>
      profile.teacher_name.toLowerCase().includes(search) ||
      profile.assignments.some((assignment) =>
        assignment.batch_name.toLowerCase().includes(search) ||
        (assignment.subject ?? '').toLowerCase().includes(search),
      ),
    )
  }
  if (batchFilter) {
    result = result.filter((profile) => profile.assignments.some((assignment) => assignment.batch_id === batchFilter))
  }
  if (centreFilter) {
    result = result.filter((profile) => profile.centre_ids.includes(centreFilter))
  }
  result.sort((left, right) => left.teacher_name.localeCompare(right.teacher_name))

  return apiSuccess({
    teachers: result,
    centres,
    batches: batches.map((batch) => ({
      id: batch.id,
      batch_name: batch.batch_name,
      centre_id: batch.centre_id,
      centre_name: batch.centres?.centre_name ?? '-',
    })),
    teacherOptions: teachers,
  })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request, ctx) => {
  if (ctx.profile.role !== 'centre_head') {
    return apiError('Only centre heads can manage teacher assignments.', 403)
  }

  const body = await request.json()
  const parsed = assignTeacherSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

  const { user_id, batch_id, subject, monthly_salary, assignment_start_date } = parsed.data
  const normalizedSubject = subject?.trim() || null
  const supabase = await createClient()

  const { data: batch, error: batchError } = await supabase.from('batches').select('id, centre_id').eq('id', batch_id).single()
  if (batchError || !batch) return apiError('Batch not found.', 404)
  if (!ctx.profile.centreIds.includes(batch.centre_id)) return apiError('You are not authorized for this batch.', 403)

  const { data: teacher, error: teacherError } = await supabase
    .from('users')
    .select('id, is_active, roles!inner(role_name)')
    .eq('id', user_id)
    .single()

  if (teacherError || !teacher) return apiError('Teacher not found.', 404)

  const typedTeacher = teacher as unknown as TeacherValidationRow
  if (typedTeacher.is_active !== true) {
    return apiError('Only active teachers can be assigned to batches.', 400)
  }

  if (resolveRoleName(typedTeacher.roles) !== 'teacher') {
    return apiError('Selected user is not a teacher.', 400)
  }

  const { data: teacherCentreAssignments, error: teacherCentreAssignmentError } = await supabase
    .from('user_centre_assignments')
    .select('centre_id')
    .eq('user_id', user_id)
    .eq('is_active', true)

  if (teacherCentreAssignmentError) return apiError(teacherCentreAssignmentError.message, 500)

  const teacherCentreIds = ((teacherCentreAssignments ?? []) as CentreAssignmentCheckRow[])
    .map((assignment) => assignment.centre_id)
    .filter((centreId): centreId is string => Boolean(centreId))

  if (!teacherCentreIds.includes(batch.centre_id)) {
    return apiError('Teacher is not assigned to the selected batch centre.', 400)
  }

  let duplicateQuery = supabase
    .from('teacher_batch_assignments')
    .select('id')
    .eq('user_id', user_id)
    .eq('batch_id', batch_id)
    .eq('is_active', true)

  duplicateQuery = normalizedSubject === null ? duplicateQuery.is('subject', null) : duplicateQuery.eq('subject', normalizedSubject)
  const { data: activeDuplicate } = await duplicateQuery.maybeSingle()
  if (activeDuplicate) return apiError('An active assignment with the same teacher, batch, and subject already exists.', 400)

  const { error } = await supabase.from('teacher_batch_assignments').insert({
    user_id,
    batch_id,
    subject: normalizedSubject,
    monthly_salary,
    assignment_start_date,
  })

  if (error) return apiError(error.message, 400)
  return apiSuccess({ ok: true })
}, ['ceo', 'centre_head'])

export const PATCH = withAuth(async (request, ctx) => {
  if (ctx.profile.role !== 'centre_head') {
    return apiError('Only centre heads can manage teacher assignments.', 403)
  }

  const body = await request.json()
  const updateProfileParsed = updateTeacherProfileSchema.safeParse(body)
  const updateParsed = updateTeacherAssignmentSchema.safeParse(body)
  const parsed = unassignTeacherSchema.safeParse(body)
  if (!updateProfileParsed.success && !updateParsed.success && !parsed.success) {
    return apiError(updateProfileParsed.error?.issues[0]?.message ?? updateParsed.error?.issues[0]?.message ?? parsed.error?.issues[0]?.message ?? 'Invalid input', 400)
  }

  const supabase = await createClient()
  if (updateProfileParsed.success) {
    const { teacher_id, full_name, phone } = updateProfileParsed.data

    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id')
      .eq('id', teacher_id)
      .single()

    if (teacherError || !teacher) return apiError('Teacher not found.', 404)

    const { data: teacherCentreAssignments, error: teacherCentreAssignmentsError } = await supabase
      .from('user_centre_assignments')
      .select('centre_id')
      .eq('user_id', teacher_id)
      .eq('is_active', true)

    if (teacherCentreAssignmentsError) return apiError(teacherCentreAssignmentsError.message, 500)

    const hasScope = ((teacherCentreAssignments ?? []) as CentreAssignmentCheckRow[])
      .map((assignment) => assignment.centre_id)
      .filter((centreId): centreId is string => Boolean(centreId))
      .some((centreId) => ctx.profile.centreIds.includes(centreId))

    if (!hasScope) return apiError('You are not authorized to update this teacher profile.', 403)

    const { error } = await supabase
      .from('users')
      .update({ full_name: full_name.trim(), phone: phone?.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', teacher_id)

    if (error) return apiError(error.message, 400)
    return apiSuccess({ ok: true })
  }

  if (updateParsed.success) {
    const { id, monthly_salary, subject, assignment_start_date } = updateParsed.data
    const normalizedSubject = subject?.trim() || null

    const { data: assignment, error: assignmentError } = await supabase
      .from('teacher_batch_assignments')
      .select('id, user_id, batch_id, subject, monthly_salary, assignment_start_date, is_active')
      .eq('id', id)
      .single()

    if (assignmentError || !assignment) return apiError('Assignment not found.', 404)
    if (assignment.is_active !== true) return apiError('Only active assignments can be modified.', 400)

    const { data: batch, error: batchError } = await supabase.from('batches').select('centre_id').eq('id', assignment.batch_id).single()
    if (batchError || !batch || !ctx.profile.centreIds.includes(batch.centre_id)) {
      return apiError('You are not authorized to edit this assignment.', 403)
    }

    if (normalizedSubject !== (assignment.subject ?? null)) {
      let duplicateQuery = supabase
        .from('teacher_batch_assignments')
        .select('id')
        .eq('user_id', assignment.user_id)
        .eq('batch_id', assignment.batch_id)
        .eq('is_active', true)
        .neq('id', assignment.id)

      duplicateQuery = normalizedSubject === null ? duplicateQuery.is('subject', null) : duplicateQuery.eq('subject', normalizedSubject)
      const { data: activeDuplicate, error: duplicateError } = await duplicateQuery.maybeSingle()
      if (duplicateError) return apiError(duplicateError.message, 500)
      if (activeDuplicate) return apiError('An active assignment with the same teacher, batch, and subject already exists.', 400)
    }

    const nextStartDate = assignment_start_date ?? assignment.assignment_start_date
    if (nextStartDate.slice(0, 7) !== assignment.assignment_start_date.slice(0, 7)) {
      return apiError('Assignment start date can only be adjusted within the same calendar month.', 400)
    }

    const { data: salaryRows, error: salaryRowsError } = await supabase
      .from('staff_salaries')
      .select('id, month_year')
      .eq('user_id', assignment.user_id)
      .eq('centre_id', batch.centre_id)
      .gte('month_year', assignment.assignment_start_date.slice(0, 7) + '-01')

    if (salaryRowsError) return apiError(salaryRowsError.message, 500)

    const salaryIds = (salaryRows ?? []).map((row) => row.id)
    if (salaryIds.length > 0) {
      const { count, error: paymentCountError } = await supabase
        .from('staff_salary_payments')
        .select('id', { count: 'exact', head: true })
        .in('staff_salary_id', salaryIds)

      if (paymentCountError) return apiError(paymentCountError.message, 500)
      const hasPaymentHistory = (count ?? 0) > 0
      if (hasPaymentHistory && nextStartDate !== assignment.assignment_start_date) {
        return apiError('Assignment start date cannot be changed after salary payments exist for affected months.', 400)
      }

      if (hasPaymentHistory && (Number(monthly_salary) !== Number(assignment.monthly_salary) || normalizedSubject !== (assignment.subject ?? null))) {
        return apiError('Salary amount or subject cannot be changed after salary payments exist for affected months.', 400)
      }
    }

    const { error } = await supabase
      .from('teacher_batch_assignments')
      .update({
        subject: normalizedSubject,
        monthly_salary,
        assignment_start_date: nextStartDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return apiError(error.message, 400)
    return apiSuccess({ ok: true })
  }

  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
  const { data: assignment, error: assignmentError } = await supabase
    .from('teacher_batch_assignments')
    .select('id, batch_id, is_active, assignment_start_date')
    .eq('id', parsed.data.id)
    .single()

  if (assignmentError || !assignment) return apiError('Assignment not found.', 404)

  const { data: batch, error: batchError } = await supabase.from('batches').select('centre_id').eq('id', assignment.batch_id).single()
  if (batchError || !batch || !ctx.profile.centreIds.includes(batch.centre_id)) {
    return apiError('You are not authorized to edit this assignment.', 403)
  }

  if (assignment.is_active !== true) {
    return apiError('Only active assignments can be unassigned.', 400)
  }

  const today = new Date().toISOString().slice(0, 10)
  if (assignment.assignment_start_date > today) {
    return apiError('Future-dated assignments cannot be unassigned before they start.', 400)
  }

  const { error } = await supabase
    .from('teacher_batch_assignments')
    .update({
      is_active: false,
      assignment_end_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)

  if (error) return apiError(error.message, 400)
  return apiSuccess({ ok: true })
}, ['ceo', 'centre_head'])
