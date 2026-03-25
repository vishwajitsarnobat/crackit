/**
 * Content Library Task API
 * GET   — Returns batches (no params) or content items for a batch (batch_id)
 * POST  — Creates a new content item (video/document URL)
 * PATCH — Updates content metadata or toggles is_published
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createContentSchema, updateContentSchema } from '@/lib/validations/data-entry'

type BatchRow = {
    id: string
    batch_name: string
    batch_code: string
    centres: { centre_name: string | null } | null
}

type ContentRow = {
    id: string
    batch_id: string
    title: string
    content_url: string
    content_type: 'video' | 'document'
    remarks: string | null
    uploaded_by: string | null
    is_published: boolean
    created_at: string
    users: { full_name: string | null } | null
}

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    const supabase = await createClient()

    if (!batchId) {
        const { data: assignments, error: assignmentError } = await supabase
            .from('teacher_batch_assignments')
            .select('batch_id')
            .eq('user_id', ctx.user.id)
            .eq('is_active', true)

        if (assignmentError) return apiError(assignmentError.message, 500)

        const assignedBatchIds = [...new Set((assignments ?? []).map((row: { batch_id: string }) => row.batch_id))]
        if (assignedBatchIds.length === 0) return apiSuccess({ batches: [] })

        const { data, error } = await supabase
            .from('batches')
            .select('id, batch_name, batch_code, centre_id, centres!inner(centre_name)')
            .in('id', assignedBatchIds)
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

    const { data: assignment } = await supabase
        .from('teacher_batch_assignments')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('batch_id', batchId)
        .eq('is_active', true)
        .maybeSingle()

    if (!assignment) return apiError('You are not authorized to view content for this batch.', 403)

    const { data, error } = await supabase
        .from('content')
        .select('*, users!uploaded_by(full_name)')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false })

    if (error) return apiError(error.message, 500)

    const items = ((data ?? []) as unknown as ContentRow[]).map((c) => ({
        ...c,
        uploader_name: c.users?.full_name ?? null,
    }))

    return apiSuccess({ content: items })
}, ['teacher'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = createContentSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const supabase = await createClient()
    const { data: assignment } = await supabase
        .from('teacher_batch_assignments')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('batch_id', parsed.data.batch_id)
        .eq('is_active', true)
        .maybeSingle()

    if (!assignment) return apiError('You are not authorized to add content for this batch.', 403)

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('content')
        .insert({
            ...parsed.data,
            title: parsed.data.title.trim(),
            content_url: parsed.data.content_url.trim(),
            remarks: parsed.data.remarks?.trim() || null,
            uploaded_by: ctx.user.id,
        })
        .select()
        .single()

    if (error) return apiError(error.message, 400)
    return apiSuccess({ content: data })
}, ['teacher'])

export const PATCH = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = updateContentSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { id, ...updates } = parsed.data
    const normalizedUpdates = {
        ...updates,
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.content_url !== undefined ? { content_url: updates.content_url.trim() } : {}),
        ...(updates.remarks !== undefined ? { remarks: updates.remarks?.trim() || null } : {}),
    }

    const supabase = await createClient()
    const { data: content, error: contentError } = await supabase
        .from('content')
        .select('batch_id')
        .eq('id', id)
        .single()

    if (contentError || !content) return apiError('Content not found.', 404)

    const { data: assignment } = await supabase
        .from('teacher_batch_assignments')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('batch_id', content.batch_id)
        .eq('is_active', true)
        .maybeSingle()

    if (!assignment) return apiError('You are not authorized to update content for this batch.', 403)

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('content')
        .update(normalizedUpdates)
        .eq('id', id)
        .select()
        .single()

    if (error) return apiError(error.message, 400)
    return apiSuccess({ content: data })
}, ['teacher'])
