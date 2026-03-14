import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createEnrollmentSchema, updateEnrollmentSchema } from '@/lib/validations/manage'
import { getDaysInMonth, getDate } from 'date-fns'

export const GET = withAuth(async (request, ctx) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const centreFilter = searchParams.get('centreId')
    const batchFilter = searchParams.get('batchId') // can be 'unassigned'

    const centreIds = ctx.profile.centreIds
    const queryIds = centreFilter && centreIds.includes(centreFilter) ? [centreFilter] : centreIds

    // 2. Fetch dependencies for filters & dropdowns
    // Need centres lists for CEO dropdown too!
    let allCentresData: { id: string; centre_name: string }[] | null = []
    if (ctx.profile.role === 'ceo') {
        const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
        allCentresData = data
    } else {
        const { data } = await supabase.from('centres').select('id, centre_name').in('id', centreIds).eq('is_active', true).order('centre_name')
        allCentresData = data
    }
    
    const { data: batchesData } = await supabase.from('batches').select('id, batch_name, centre_id').in('centre_id', ctx.profile.role === 'ceo' && centreFilter ? [centreFilter] : queryIds).eq('is_active', true).order('batch_name')

    // 3. Fetch ALL active students with their current enrollments
    const adminClient = createAdminClient()
    const { data: studentsData, error } = await adminClient
        .from('students')
        .select(`
            id, student_code,
            users!inner(full_name),
            student_batch_enrollments (
                id, batch_id, enrollment_date, status, is_active, withdrawn_at,
                batches ( batch_name, centre_id )
            )
        `)
        .eq('is_active', true)
        .order('student_code', { ascending: false })

    if (error) return apiError(error.message, 500)

    // 4. Extract all active batch IDs from all enrollments to fetch invoices mapping
    const allActiveEnrollments = (studentsData ?? []).flatMap(s => 
        (s.student_batch_enrollments as { batch_id: string, is_active: boolean }[] ?? []).filter(e => e.is_active)
    )
    const activeBatchIds = Array.from(new Set(allActiveEnrollments.map(e => e.batch_id)))
    
    const invoicesMap: Record<string, number> = {}
    if (activeBatchIds.length > 0) {
        const { data: invoicesData } = await supabase
            .from('student_invoices')
            .select('student_id, batch_id, monthly_fee')
            .in('batch_id', activeBatchIds)
            .order('month_year', { ascending: false })

        if (invoicesData) {
            invoicesData.forEach(inv => {
                const key = `${inv.student_id}-${inv.batch_id}`
                if (!(key in invoicesMap)) invoicesMap[key] = inv.monthly_fee
            })
        }
    }

    // 5. Flatten the structure into a student-centric list
    let formatted: Record<string, unknown>[] = []
    for (const s of (studentsData ?? [])) {
        const studentId = s.id
        const studentCode = s.student_code
        const fullName = (s.users as unknown as { full_name: string })?.full_name ?? 'Unknown'

        const enrollments = (s.student_batch_enrollments as unknown as {
            id: string, batch_id: string, status: string, is_active: boolean, enrollment_date: string | null,
            batches: { batch_name: string, centre_id: string } | null
        }[] ?? []).filter(e => e.status === 'active')

        if (enrollments.length === 0) {
            formatted.push({
                student_id: studentId,
                student_code: studentCode,
                student_name: fullName,
                enrollment_id: null,
                batch_id: null,
                batch_name: 'Unassigned',
                centre_id: null,
                enrollment_date: null,
                status: 'unassigned',
                monthly_fee: null
            })
        } else {
            for (const e of enrollments) {
                const fee = invoicesMap[`${studentId}-${e.batch_id}`] ?? null
                formatted.push({
                    student_id: studentId,
                    student_code: studentCode,
                    student_name: fullName,
                    enrollment_id: e.id,
                    batch_id: e.batch_id,
                    batch_name: e.batches?.batch_name ?? '-',
                    centre_id: e.batches?.centre_id,
                    enrollment_date: e.enrollment_date,
                    status: e.status,
                    monthly_fee: fee
                })
            }
        }
    }

    // Apply filters in memory
    if (centreFilter) {
        // Keep students in the selected centre, PLUS keep unassigned students so they can be assigned here
        formatted = formatted.filter(f => f.centre_id === centreFilter || f.centre_id === null)
    }
    if (batchFilter) {
        if (batchFilter === 'unassigned') {
            formatted = formatted.filter(f => f.batch_id === null)
        } else {
            formatted = formatted.filter(f => f.batch_id === batchFilter)
        }
    }

    return apiSuccess({ 
        enrollments: formatted, 
        centres: allCentresData ?? [], 
        batches: batchesData ?? [],
        students: [] // No longer needed for dropdown
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
    const monthYear = dateObj.toISOString().substring(0, 7) + '-01' // 1st day of month
    
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
        // Rollback enrollment if invoice fails
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
