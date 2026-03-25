/**
 * Staff Attendance Task API
 * GET  — Returns centres (no params) or staff with attendance for a centre + date (centre_id + date)
 * POST — Upserts staff attendance records (present/absent/partial with in/out times)
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { saveStaffAttendanceSchema } from '@/lib/validations/data-entry'

type CentreRow = { id: string; centre_name: string; centre_code: string }
type AssignmentRow = {
    user_id: string
    users: {
        full_name: string | null
        roles: { role_name: string } | { role_name: string }[] | null
    } | Array<{
        full_name: string | null
        roles: { role_name: string } | { role_name: string }[] | null
    }> | null
}
type AttendanceRow = {
  id: string
  user_id: string
  status: 'present' | 'absent' | 'partial'
  in_time: string | null
  out_time: string | null
}

type RoleRelation = { role_name: string } | Array<{ role_name: string }> | null

function getPreviousDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

function resolveRoleName(roles: RoleRelation) {
    if (Array.isArray(roles)) return roles[0]?.role_name ?? null
    return roles?.role_name ?? null
}

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const centreId = searchParams.get('centre_id')
    const date = searchParams.get('date')
    const batchId = searchParams.get('batch_id')

    if (!centreId) {
        const supabase = await createClient()
        let query = supabase
            .from('centres')
            .select('id, centre_name, centre_code')
            .eq('is_active', true)
            .order('centre_name')

        if (ctx.profile.role !== 'ceo') {
            query = query.in('id', ctx.profile.centreIds)
        }

        const { data, error } = await query
        if (error) return apiError(error.message, 500)
        return apiSuccess({ centres: (data ?? []) as CentreRow[] })
    }

    if (!date) return apiError('date is required', 400)
    if (!ctx.profile.centreIds.includes(centreId)) {
        return apiError('You are not authorized for this centre.', 403)
    }

    // Get staff assigned to this centre
    const supabase = await createClient()
    let assignmentQuery = supabase
        .from('user_centre_assignments')
        .select('user_id, users!inner(full_name, roles!inner(role_name))')
        .eq('centre_id', centreId)
        .eq('is_active', true)

    if (batchId) {
        const { data: batch, error: batchError } = await supabase
            .from('batches')
            .select('centre_id')
            .eq('id', batchId)
            .single()

        if (batchError || !batch) return apiError('Batch not found.', 404)
        if (batch.centre_id !== centreId) return apiError('Batch does not belong to the selected centre.', 400)

        const { data: batchAssignments, error: batchAssignmentsError } = await supabase
            .from('teacher_batch_assignments')
            .select('user_id')
            .eq('batch_id', batchId)
            .eq('is_active', true)

        if (batchAssignmentsError) return apiError(batchAssignmentsError.message, 500)

        const teacherIds = [...new Set((batchAssignments ?? []).map((row: { user_id: string }) => row.user_id))]
        if (teacherIds.length === 0) return apiSuccess({ staff: [] })
        assignmentQuery = assignmentQuery.in('user_id', teacherIds)
    }

    const { data: assignments, error: assError } = await assignmentQuery

    if (assError) return apiError(assError.message, 500)

    const staff = ((assignments ?? []) as AssignmentRow[])
        .filter((a) => {
            const user = Array.isArray(a.users) ? a.users[0] : a.users
            return resolveRoleName(user?.roles ?? null) === 'teacher'
        })
        .map((a) => {
            const user = Array.isArray(a.users) ? a.users[0] : a.users
            return {
                user_id: a.user_id,
                staff_name: user?.full_name ?? 'Unknown',
                role: 'teacher',
            }
        })

    let attendance: AttendanceRow[] = []
    let previousAttendance: AttendanceRow[] = []
    if (staff.length > 0) {
      const { data: att } = await supabase
        .from('staff_attendance')
            .select('*')
            .eq('centre_id', centreId)
            .eq('attendance_date', date)
            .in('user_id', staff.map((s) => s.user_id))

      attendance = (att ?? []) as AttendanceRow[]

      const { data: prevAtt } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('centre_id', centreId)
        .eq('attendance_date', getPreviousDate(date))
        .in('user_id', staff.map((s) => s.user_id))

      previousAttendance = (prevAtt ?? []) as AttendanceRow[]
    }

    const attendanceMap = new Map(attendance.map((a) => [a.user_id, a]))
    const previousAttendanceMap = new Map(previousAttendance.map((a) => [a.user_id, a]))

    const result = staff.map((s) => {
      const existing = attendanceMap.get(s.user_id)
      const previous = previousAttendanceMap.get(s.user_id)
      return {
        ...s,
        status: existing?.status ?? null,
        in_time: existing?.in_time ?? null,
        out_time: existing?.out_time ?? null,
        id: existing?.id ?? null,
        previous_day_status: previous?.status ?? null,
        previous_day_in_time: previous?.in_time ?? null,
        previous_day_out_time: previous?.out_time ?? null,
      }
    })

    return apiSuccess({ staff: result })
}, ['centre_head'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = saveStaffAttendanceSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { centre_id, attendance_date, records } = parsed.data

    if (attendance_date > new Date().toISOString().slice(0, 10)) {
        return apiError('Staff attendance cannot be marked for a future date.', 400)
    }

    if (!ctx.profile.centreIds.includes(centre_id)) {
        return apiError('You are not authorized for this centre.', 403)
    }

    const supabase = await createClient()
    const { data: assignments, error: assignmentError } = await supabase
        .from('user_centre_assignments')
        .select('user_id, users!inner(roles!inner(role_name))')
        .eq('centre_id', centre_id)
        .eq('is_active', true)

    if (assignmentError) return apiError(assignmentError.message, 500)

    const allowedTeacherIds = new Set(
        ((assignments ?? []) as AssignmentRow[])
            .filter((assignment) => {
                const user = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users
                return resolveRoleName(user?.roles ?? null) === 'teacher'
            })
            .map((assignment) => assignment.user_id),
    )

    const { data: centreTeacherBatchAssignments, error: centreTeacherBatchAssignmentError } = await supabase
        .from('teacher_batch_assignments')
        .select('user_id, batches!inner(centre_id)')
        .eq('is_active', true)

    if (centreTeacherBatchAssignmentError) return apiError(centreTeacherBatchAssignmentError.message, 500)

    const teachersWithActiveBatchInCentre = new Set(
        ((centreTeacherBatchAssignments ?? []) as Array<{ user_id: string; batches: { centre_id: string | null } | { centre_id: string | null }[] | null }>)
            .filter((row) => {
                const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches
                return batch?.centre_id === centre_id
            })
            .map((row) => row.user_id),
    )

    const hasInvalidTeacher = records.some((record) => !allowedTeacherIds.has(record.user_id) || !teachersWithActiveBatchInCentre.has(record.user_id))
    if (hasInvalidTeacher) return apiError('One or more users are not active teachers teaching batches in this centre.', 400)

    const adminClient = createAdminClient()

    const upsertData = records.map((r) => ({
        user_id: r.user_id,
        centre_id,
        attendance_date,
        status: r.status,
        in_time: r.in_time || null,
        out_time: r.out_time || null,
        marked_by: ctx.user.id,
        marked_at: new Date().toISOString(),
    }))

    const { error } = await adminClient
        .from('staff_attendance')
        .upsert(upsertData, { onConflict: 'user_id,centre_id,attendance_date' })

    if (error) return apiError(error.message, 400)
    return apiSuccess({ ok: true, count: records.length })
}, ['centre_head'])
