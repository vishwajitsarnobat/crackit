/**
 * Content Library API
 * GET   — Returns batches (no params) or content items for a batch (batch_id)
 * POST  — Creates a new content item (video/pdf/notes URL)
 * PATCH — Updates content metadata or toggles is_published
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createContentSchema, updateContentSchema } from '@/lib/validations/data-entry'

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')

    if (!batchId) {
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

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('content')
        .select('*, users!uploaded_by(full_name)')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false })

    if (error) return apiError(error.message, 500)

    const items = (data ?? []).map((c: any) => ({
        ...c,
        uploader_name: c.users?.full_name ?? null,
    }))

    return apiSuccess({ content: items })
}, ['ceo', 'centre_head', 'teacher'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = createContentSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('content')
        .insert({
            ...parsed.data,
            uploaded_by: ctx.user.id,
        })
        .select()
        .single()

    if (error) return apiError(error.message, 400)
    return apiSuccess({ content: data })
}, ['ceo', 'centre_head', 'teacher'])

export const PATCH = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = updateContentSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { id, ...updates } = parsed.data

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('content')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) return apiError(error.message, 400)
    return apiSuccess({ content: data })
}, ['ceo', 'centre_head', 'teacher'])
