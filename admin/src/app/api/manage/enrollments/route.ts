/**
 * Student Enrollment API
 * GET   — Returns enrollments scoped to relevant batches + unassigned students. Includes centres/batches dropdowns.
 * POST  — Creates enrollment + prorated first invoice (uses date-fns for day calculations)
 * PATCH — Withdraws a student from a batch
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createEnrollmentSchema, updateEnrollmentSchema } from '@/lib/validations/manage'
import { getDaysInMonth, getDate } from 'date-fns'

export const GET = withAuth(async (request, ctx) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const centreFilter = searchParams.get('centreId')
    const batchFilter = searchParams.get('batchId')

    // ── 1. Centres dropdown ──
    let centresData: { id: string; centre_name: string }[] = []
    if (ctx.profile.role === 'ceo') {
        const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
        centresData = data ?? []
    } else {
        if (ctx.profile.centreIds.length === 0) return apiSuccess({ enrollments: [], centres: [], batches: [], students: [] })
        const { data } = await supabase.from('centres').select('id, centre_name').in('id', ctx.profile.centreIds).eq('is_active', true).order('centre_name')
        centresData = data ?? []
    }

    // ── 2. Batches ──
    // Build scoped centre list for batch filtering
    const scopedCentreIds = ctx.profile.role === 'ceo'
        ? (centreFilter ? [centreFilter] : centresData.map(c => c.id))
        : (centreFilter && ctx.profile.centreIds.includes(centreFilter) ? [centreFilter] : ctx.profile.centreIds)

    let batchQuery = supabase.from('batches').select('id, batch_name, centre_id').eq('is_active', true).order('batch_name')
    if (scopedCentreIds.length > 0) batchQuery = batchQuery.in('centre_id', scopedCentreIds)
    const { data: batchesData } = await batchQuery

    // ── 3. Fetch students & enrollments (scoped to batches, NOT all students) ──
    const adminClient = createAdminClient()

    const activeBatchIds = (batchesData ?? []).map(b => b.id)
    const targetBatchIds = batchFilter && batchFilter !== 'unassigned'
        ? [batchFilter]
        : activeBatchIds

    if (targetBatchIds.length === 0 && batchFilter !== 'unassigned' && batchFilter) {
        return apiSuccess({ enrollments: [], centres: centresData, batches: batchesData ?? [], students: [] })
    }

    let enrollments: any[] = []
    
    // Fetch enrollments with student data — scoped to relevant batches
    if (targetBatchIds.length > 0) {
        let enrollmentsQuery = adminClient
            .from('student_batch_enrollments')
            .select(`
                id, student_id, batch_id, enrollment_date, status, is_active,
                students!inner(id, student_code, is_active, users!inner(full_name)),
                batches!inner(batch_name, centre_id)
            `)
            .eq('status', 'active')

        if (batchFilter && batchFilter !== 'unassigned') {
            enrollmentsQuery = enrollmentsQuery.in('batch_id', targetBatchIds)
        }

        const { data, error } = await enrollmentsQuery.order('student_id')
        if (error) return apiError(error.message, 500)
        enrollments = data ?? []
    }

    // Build enrolled student IDs set
    const enrolledStudentIds = new Set((enrollments ?? []).map((e: any) => e.student_id))

    // Build formatted list from enrollments
    const formatted: Record<string, unknown>[] = (enrollments ?? []).map((e: any) => ({
        student_id: e.student_id,
        student_code: e.students?.student_code ?? '',
        student_name: e.students?.users?.full_name ?? 'Unknown',
        enrollment_id: e.id,
        batch_id: e.batch_id,
        batch_name: e.batches?.batch_name ?? '-',
        centre_id: e.batches?.centre_id ?? null,
        enrollment_date: e.enrollment_date,
        status: e.status,
        monthly_fee: null,
    }))

    // If showing unassigned, fetch students without active enrollments
    if (!batchFilter || batchFilter === 'unassigned') {
        const { data: allStudents } = await adminClient
            .from('students')
            .select('id, student_code, users!inner(full_name)')
            .eq('is_active', true)
            .order('student_code', { ascending: false })
            .limit(200)

        for (const s of (allStudents ?? [])) {
            if (!enrolledStudentIds.has(s.id)) {
                formatted.push({
                    student_id: s.id,
                    student_code: s.student_code,
                    student_name: (s.users as any)?.full_name ?? 'Unknown',
                    enrollment_id: null,
                    batch_id: null,
                    batch_name: 'Unassigned',
                    centre_id: null,
                    enrollment_date: null,
                    status: 'unassigned',
                    monthly_fee: null,
                })
            }
        }
    }

    // Centre filter for formatted data
    let result = formatted
    if (centreFilter && batchFilter !== 'unassigned') {
        result = formatted.filter((f: any) => f.centre_id === centreFilter || f.centre_id === null)
    }

    return apiSuccess({
        enrollments: result,
        centres: centresData,
        batches: batchesData ?? [],
        students: []
    })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request) => {
    const body = await request.json()
    const parsed = createEnrollmentSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { student_id, batch_id, enrollment_date, monthly_fee } = parsed.data

    const supabase = await createClient()

    // 1. Check if already enrolled
    const { data: existing } = await supabase
        .from('student_batch_enrollments')
        .select('id')
        .eq('student_id', student_id)
        .eq('batch_id', batch_id)
        .single()

    if (existing) {
        return apiError('Student is already enrolled in this batch.', 400)
    }

    // 2. Insert Enrollment
    const { data: enrollment, error: enrollErr } = await supabase
        .from('student_batch_enrollments')
        .insert({ student_id, batch_id, enrollment_date })
        .select()
        .single()

    if (enrollErr) return apiError(enrollErr.message, 400)

    // 3. Create Prorated Invoice
    const dateObj = new Date(enrollment_date + 'T00:00:00')
    const monthYear = dateObj.toISOString().substring(0, 7) + '-01'
    
    const daysInMonth = getDaysInMonth(dateObj)
    const currentDay = getDate(dateObj)
    const remainingDays = daysInMonth - currentDay + 1
    
    const amountDue = Math.round((monthly_fee * remainingDays) / daysInMonth * 100) / 100

    const { error: invoiceErr } = await supabase
        .from('student_invoices')
        .insert({
            student_id,
            batch_id,
            month_year: monthYear,
            monthly_fee,
            amount_due: amountDue
        })

    if (invoiceErr) {
        await supabase.from('student_batch_enrollments').delete().eq('id', enrollment.id)
        return apiError(invoiceErr.message, 400)
    }

    return apiSuccess({ ok: true, amount_due: amountDue })
}, ['ceo', 'centre_head'])

export const PATCH = withAuth(async (request) => {
    const body = await request.json()
    const parsed = updateEnrollmentSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { id, status } = parsed.data

    if (status !== 'withdrawn') {
        return apiError('Invalid operation.', 400)
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('student_batch_enrollments')
        .update({ status: 'withdrawn' })
        .eq('id', id)

    if (error) return apiError(error.message, 400)

    return apiSuccess({ ok: true })
}, ['ceo', 'centre_head'])
