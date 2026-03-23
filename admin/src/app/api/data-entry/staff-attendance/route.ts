/**
 * Staff Attendance API
 * GET  — Returns centres (no params) or staff with attendance for a centre + date (centre_id + date)
 * POST — Upserts staff attendance records (present/absent/partial with in/out times)
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { saveStaffAttendanceSchema } from '@/lib/validations/data-entry'

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const centreId = searchParams.get('centre_id')
    const date = searchParams.get('date')

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
        return apiSuccess({ centres: data ?? [] })
    }

    // Get staff assigned to this centre
    const supabase = await createClient()
    const { data: assignments, error: assError } = await supabase
        .from('user_centre_assignments')
        .select('user_id, users!inner(full_name, roles!inner(role_name))')
        .eq('centre_id', centreId)
        .eq('is_active', true)

    if (assError) return apiError(assError.message, 500)

    const staff = (assignments ?? [])
        .filter((a: any) => ['teacher', 'accountant'].includes(a.users?.roles?.role_name))
        .map((a: any) => ({
            user_id: a.user_id,
            staff_name: a.users?.full_name ?? 'Unknown',
            role: a.users?.roles?.role_name,
        }))

    let attendance: any[] = []
    if (date && staff.length > 0) {
        const { data: att } = await supabase
            .from('staff_attendance')
            .select('*')
            .eq('centre_id', centreId)
            .eq('attendance_date', date)
            .in('user_id', staff.map((s: any) => s.user_id))

        attendance = att ?? []
    }

    const attendanceMap = new Map(attendance.map((a: any) => [a.user_id, a]))

    const result = staff.map((s: any) => {
        const existing = attendanceMap.get(s.user_id)
        return {
            ...s,
            status: existing?.status ?? null,
            in_time: existing?.in_time ?? null,
            out_time: existing?.out_time ?? null,
            id: existing?.id ?? null,
        }
    })

    return apiSuccess({ staff: result })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = saveStaffAttendanceSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { centre_id, attendance_date, records } = parsed.data

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
}, ['ceo', 'centre_head'])
