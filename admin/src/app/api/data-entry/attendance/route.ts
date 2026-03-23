/**
 * Student Attendance API
 * GET  — Returns batches (no params) or students with attendance status (batch_id + date)
 * POST — Upserts attendance records for a batch + date
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { saveAttendanceSchema } from '@/lib/validations/data-entry'

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    const date = searchParams.get('date')

    if (!batchId) {
        // Return batches for selection
        const supabase = await createClient()
        let query = supabase
            .from('batches')
            .select('id, batch_name, batch_code, centre_id, centres!inner(centre_name)')
            .eq('is_active', true)
            .order('batch_name')

        if (ctx.profile.role !== 'ceo') {
            query = query.in('centre_id', ctx.profile.centreIds)
        }

        const { data, error } = await query
        if (error) return apiError(error.message, 500)

        const batches = (data ?? []).map((b: any) => ({
            id: b.id,
            batch_name: b.batch_name,
            batch_code: b.batch_code,
            centre_name: b.centres?.centre_name,
        }))
        return apiSuccess({ batches })
    }

    // Return enrolled students with attendance for the given date
    const supabase = await createClient()
    const { data: enrollments, error: enrollError } = await supabase
        .from('student_batch_enrollments')
        .select('student_id, students!inner(id, student_code, users!inner(full_name))')
        .eq('batch_id', batchId)
        .eq('is_active', true)

    if (enrollError) return apiError(enrollError.message, 500)

    const studentIds = (enrollments ?? []).map((e: any) => e.student_id)

    let attendanceRecords: any[] = []
    if (date && studentIds.length > 0) {
        const { data: att } = await supabase
            .from('attendance')
            .select('*')
            .eq('batch_id', batchId)
            .eq('attendance_date', date)
            .in('student_id', studentIds)

        attendanceRecords = att ?? []
    }

    const attendanceMap = new Map(attendanceRecords.map((a: any) => [a.student_id, a]))

    const students = (enrollments ?? []).map((e: any) => {
        const existing = attendanceMap.get(e.student_id)
        return {
            student_id: e.student_id,
            student_name: e.students?.users?.full_name ?? 'Unknown',
            student_code: e.students?.student_code ?? null,
            status: existing?.status ?? null,
            id: existing?.id ?? null,
        }
    })

    return apiSuccess({ students })
}, ['ceo', 'centre_head', 'teacher'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = saveAttendanceSchema.safeParse(body)
    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { batch_id, attendance_date, records } = parsed.data

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
}, ['ceo', 'centre_head', 'teacher'])
