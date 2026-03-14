import { createClient } from '@/lib/supabase/server'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createBatchSchema, updateBatchSchema } from '@/lib/validations/manage'

export const GET = withAuth(async (request, ctx) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const centreFilter = searchParams.get('centreId')

    const centreIds = ctx.profile.centreIds

    const { data: centresData } = await supabase.from('centres').select('id, centre_name').in('id', centreIds).eq('is_active', true).order('centre_name')
    const { data: coursesData } = await supabase.from('courses').select('id, course_name').eq('is_active', true).order('course_name')

    const queryIds = centreFilter && centreIds.includes(centreFilter) ? [centreFilter] : centreIds
    
    // For CEO, if no centreFilter, we can get all. Wait, if CEO has no centreIds, the 'in' query might return empty.
    // Actually, in `withAuth`, CEO is NOT given `centreIds`. `centreIds` array is empty for CEO.
    // Wait! In `api-helpers.ts`:
    // `if (role !== 'ceo') { ... fetch centreIds }`
    // So for CEO, `centreIds` is empty. The `in` clause will fail!
    
    // Ah, wait. My GET in centres/route.ts checked `if (ctx.profile.role === 'centre_head')`.
    // I need to adjust this here to work for CEOs as well.
    let query = supabase
        .from('batches')
        .select('*, courses(course_name), centres(centre_name)')
        .order('batch_name')

    if (ctx.profile.role !== 'ceo') {
        const qIds = centreFilter && ctx.profile.centreIds.includes(centreFilter) ? [centreFilter] : ctx.profile.centreIds
        query = query.in('centre_id', qIds)
    } else if (centreFilter) {
        query = query.eq('centre_id', centreFilter)
    }

    // Need centres lists for CEO dropdown too!
    let allCentresData = centresData
    if (ctx.profile.role === 'ceo') {
        const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
        allCentresData = data
    }

    const { data: batches, error } = await query
    if (error) return apiError(error.message, 500)

    const formatted = (batches ?? []).map(b => ({
        ...b,
        course_name: (b.courses as any)?.course_name ?? '-',
        centre_name: (b.centres as any)?.centre_name ?? '-',
    }))

    return apiSuccess({ batches: formatted, centres: allCentresData ?? [], courses: coursesData ?? [] })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = createBatchSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { centre_id, course_id, batch_code, batch_name, academic_year } = parsed.data

    const supabase = await createClient()

    if (ctx.profile.role === 'centre_head' && !ctx.profile.centreIds.includes(centre_id)) {
        return apiError('You are not authorized for this centre.', 403)
    }

    const { data, error } = await supabase
        .from('batches')
        .insert({
            centre_id,
            course_id,
            batch_code: batch_code.trim(),
            batch_name: batch_name.trim(),
            academic_year: academic_year.trim()
        })
        .select()
        .single()

    if (error) return apiError(error.message, 400)
    return apiSuccess({ batch: data })
}, ['ceo', 'centre_head'])

export const PATCH = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = updateBatchSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { id, batch_name, course_id, academic_year, is_active } = parsed.data

    const supabase = await createClient()

    if (ctx.profile.role === 'centre_head') {
        // Enforce Centre Head access by asserting the batch belongs to a centre they manage
        const { data: batchCheck } = await supabase.from('batches').select('centre_id').eq('id', id).single()
        if (!batchCheck || !ctx.profile.centreIds.includes(batchCheck.centre_id)) {
            return apiError('You are not authorized to edit this batch.', 403)
        }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (batch_name !== undefined) updates.batch_name = batch_name.trim()
    if (course_id !== undefined) updates.course_id = course_id
    if (academic_year !== undefined) updates.academic_year = academic_year.trim()
    if (is_active !== undefined && ctx.profile.role === 'ceo') updates.is_active = is_active

    const { error } = await supabase.from('batches').update(updates).eq('id', id)
    if (error) return apiError(error.message, 400)

    return apiSuccess({ ok: true })
}, ['ceo', 'centre_head'])
