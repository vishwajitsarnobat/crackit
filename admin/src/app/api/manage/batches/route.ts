/**
 * Batch Management API
 * GET   — Returns batches + centres dropdowns. CEO sees all; centre_head sees assigned.
 * POST  — Creates a new batch with centre_id, batch_code, batch_name
 * PATCH — Updates batch details or toggles is_active (centre_head only)
 */
import { createClient } from '@/lib/supabase/server'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createBatchSchema, updateBatchSchema } from '@/lib/validations/manage'

type BatchRow = {
    id: string
    centre_id: string
    batch_code: string
    batch_name: string
    academic_year: string
    is_active: boolean
    created_at: string
    updated_at: string
    centres: { centre_name: string } | null
}

export const GET = withAuth(async (request, ctx) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const centreFilter = searchParams.get('centreId')

    // ── Centres dropdown ──
    let centresData: { id: string; centre_name: string }[] = []
    if (ctx.profile.role === 'ceo') {
        const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
        centresData = data ?? []
    } else {
        if (ctx.profile.centreIds.length === 0) return apiSuccess({ batches: [], centres: [] })
        const { data } = await supabase.from('centres').select('id, centre_name').in('id', ctx.profile.centreIds).eq('is_active', true).order('centre_name')
        centresData = data ?? []
    }

    // ── Batches query ──
    let query = supabase
        .from('batches')
        .select('*, centres(centre_name)')
        .order('batch_name')

    if (ctx.profile.role === 'ceo') {
        // CEO sees all batches, optionally filtered by centre
        if (centreFilter) query = query.eq('centre_id', centreFilter)
    } else {
        // Non-CEO: scoped to their centres
        const scopeIds = centreFilter && ctx.profile.centreIds.includes(centreFilter)
            ? [centreFilter]
            : ctx.profile.centreIds
        query = query.in('centre_id', scopeIds)
    }

    const { data: batches, error } = await query
    if (error) return apiError(error.message, 500)

    const formatted = (batches ?? []).map((b: BatchRow) => ({
        ...b,
        centre_name: b.centres?.centre_name ?? '-',
    }))

    return apiSuccess({ batches: formatted, centres: centresData })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request, ctx) => {
    if (ctx.profile.role !== 'centre_head') {
        return apiError('Only centre heads can create batches.', 403)
    }

    const body = await request.json()
    const parsed = createBatchSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { centre_id, batch_code, batch_name, academic_year } = parsed.data

    const supabase = await createClient()

    if (ctx.profile.role === 'centre_head' && !ctx.profile.centreIds.includes(centre_id)) {
        return apiError('You are not authorized for this centre.', 403)
    }

    const { data, error } = await supabase
        .from('batches')
        .insert({
            centre_id,
            batch_code: batch_code.trim(),
            batch_name: batch_name.trim(),
            academic_year: academic_year.trim()
        })
        .select()
        .single()

    if (error) {
        if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
            return apiError('A batch with this code already exists.', 400)
        }
        return apiError(error.message, 400)
    }
    return apiSuccess({ batch: data })
}, ['ceo', 'centre_head'])

export const PATCH = withAuth(async (request, ctx) => {
    if (ctx.profile.role !== 'centre_head') {
        return apiError('Only centre heads can modify batches.', 403)
    }

    const body = await request.json()
    const parsed = updateBatchSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { id, batch_name, academic_year, is_active } = parsed.data

    const supabase = await createClient()

    if (ctx.profile.role === 'centre_head') {
        const { data: batchCheck } = await supabase.from('batches').select('centre_id').eq('id', id).single()
        if (!batchCheck || !ctx.profile.centreIds.includes(batchCheck.centre_id)) {
            return apiError('You are not authorized to edit this batch.', 403)
        }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (batch_name !== undefined) updates.batch_name = batch_name.trim()
    if (academic_year !== undefined) updates.academic_year = academic_year.trim()
    if (is_active !== undefined) updates.is_active = is_active

    const { error } = await supabase.from('batches').update(updates).eq('id', id)
    if (error) return apiError(error.message, 400)

    return apiSuccess({ ok: true })
}, ['ceo', 'centre_head'])
