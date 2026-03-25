/**
 * Student Attendance Task API
 * GET  — Returns batches (no params) or students with attendance status (batch_id + date)
 * POST — Upserts attendance records for a batch + date
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { saveAttendanceSchema } from '@/lib/validations/data-entry'

type BatchRow = {
    id: string
    batch_name: string
    batch_code: string
    centres: { centre_name: string | null } | null
}

type EnrollmentRow = {
    student_id: string
    students: {
        student_code: string | null
        users: { full_name: string | null } | Array<{ full_name: string | null }> | null
    } | Array<{
        student_code: string | null
        users: { full_name: string | null } | Array<{ full_name: string | null }> | null
    }> | null
}

type AttendanceRow = {
    id: string
    student_id: string
    status: 'present' | 'absent'
}

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    const date = searchParams.get('date')

    if (!batchId) {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('batches')
            .select('id, batch_name, batch_code, centre_id, centres!inner(centre_name)')
            .eq('is_active', true)
            .order('batch_name')
        if (error) return apiError(error.message, 500)

        const batches = ((data ?? []) as unknown as BatchRow[]).map((b) => ({
            id: b.id,
            batch_name: b.batch_name,
            batch_code: b.batch_code,
            centre_name: b.centres?.centre_name ?? '-',
        }))
        return apiSuccess({ batches })
    }

    if (!date) {
        return apiError('date is required when loading attendance for a batch.', 400)
    }

    const supabase = await createClient()
    const { data: enrollments, error: enrollError } = await supabase
        .from('student_batch_enrollments')
        .select('student_id, students!inner(id, student_code, users!inner(full_name))')
        .eq('batch_id', batchId)
        .eq('is_active', true)

    if (enrollError) return apiError(enrollError.message, 500)

    const studentIds = ((enrollments ?? []) as EnrollmentRow[]).map((e) => e.student_id)

    let attendanceRecords: AttendanceRow[] = []
    if (studentIds.length > 0) {
        const { data: att } = await supabase
            .from('attendance')
            .select('*')
            .eq('batch_id', batchId)
            .eq('attendance_date', date)
            .in('student_id', studentIds)

        attendanceRecords = (att ?? []) as AttendanceRow[]
    }

    const attendanceMap = new Map(attendanceRecords.map((a) => [a.student_id, a]))

    const students = ((enrollments ?? []) as EnrollmentRow[]).map((e) => {
        const existing = attendanceMap.get(e.student_id)
        const studentInfo = Array.isArray(e.students) ? e.students[0] : e.students
        const studentUser = Array.isArray(studentInfo?.users) ? studentInfo?.users[0] : studentInfo?.users
        return {
            student_id: e.student_id,
            student_name: studentUser?.full_name ?? 'Unknown',
            student_code: studentInfo?.student_code ?? null,
            status: existing?.status ?? null,
            id: existing?.id ?? null,
        }
    })

    return apiSuccess({ students })
}, ['teacher'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = saveAttendanceSchema.safeParse(body)
    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { batch_id, attendance_date, records } = parsed.data

    if (attendance_date > new Date().toISOString().slice(0, 10)) {
        return apiError('Attendance cannot be marked for a future date.', 400)
    }

    const supabase = await createClient()
    const { data: assignment } = await supabase
        .from('teacher_batch_assignments')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('batch_id', batch_id)
        .eq('is_active', true)
        .maybeSingle()

    if (!assignment) {
        return apiError('You are not authorized to mark attendance for this batch.', 403)
    }

    const { data: enrollments, error: enrollmentError } = await supabase
        .from('student_batch_enrollments')
        .select('student_id')
        .eq('batch_id', batch_id)
        .eq('is_active', true)

    if (enrollmentError) return apiError(enrollmentError.message, 500)

    const allowedStudentIds = new Set((enrollments ?? []).map((row: { student_id: string }) => row.student_id))
    const hasInvalidStudent = records.some((record) => !allowedStudentIds.has(record.student_id))
    if (hasInvalidStudent) {
        return apiError('One or more students are not actively enrolled in this batch.', 400)
    }

    const adminClient = createAdminClient()

    const upsertData = records.map((r) => ({
        student_id: r.student_id,
        batch_id,
        attendance_date,
        status: r.status,
        marked_by: ctx.user.id,
        marked_at: new Date().toISOString(),
    }))

    const { error } = await adminClient
        .from('attendance')
        .upsert(upsertData, { onConflict: 'student_id,batch_id,attendance_date' })

    if (error) return apiError(error.message, 400)

    return apiSuccess({ ok: true, count: records.length })
}, ['teacher'])
