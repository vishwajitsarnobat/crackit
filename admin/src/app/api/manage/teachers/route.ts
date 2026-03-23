/**
 * Teacher Batch Assignment API
 * GET   — Returns teacher-batch assignments + centres/batches/teachers dropdowns.
 *         Builds teacher list from user_centre_assignments, filters to role=teacher.
 * POST  — Assigns a teacher to a batch (or re-activates existing)
 * PATCH — Un-assigns (deactivates) a teacher-batch assignment
 */
import { createClient } from '@/lib/supabase/server'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { assignTeacherSchema, unassignTeacherSchema } from '@/lib/validations/manage'

export const GET = withAuth(async (request, ctx) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const centreFilter = searchParams.get('centreId')

    const centreIds = ctx.profile.centreIds
    const queryIds = centreFilter && centreIds.includes(centreFilter) ? [centreFilter] : centreIds

    // 2. Fetch centres & batches for dropdowns
    let allCentresData: { id: string; centre_name: string }[] | null = []
    if (ctx.profile.role === 'ceo') {
        const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
        allCentresData = data
    } else {
        if (centreIds.length === 0) return apiSuccess({ assignments: [], centres: [], batches: [], teachers: [] })
        const { data } = await supabase.from('centres').select('id, centre_name').in('id', centreIds).eq('is_active', true).order('centre_name')
        allCentresData = data
    }

    let batchQuery = supabase.from('batches').select('id, batch_name, centre_id').eq('is_active', true).order('batch_name')
    if (ctx.profile.role === 'ceo') {
        if (centreFilter) batchQuery = batchQuery.eq('centre_id', centreFilter)
    } else {
        batchQuery = batchQuery.in('centre_id', queryIds)
    }
    const { data: batchesData } = await batchQuery

    // 3. Fetch teachers assigned to accessible centres
    const ucaQuery = supabase
        .from('user_centre_assignments')
        .select('user_id, centre_id')
        .eq('is_active', true)
        
    if (ctx.profile.role !== 'ceo' || centreFilter) {
        ucaQuery.in('centre_id', ctx.profile.role === 'ceo' ? [centreFilter] : queryIds)
    }

    const { data: ucaData } = await ucaQuery
    const teacherUserIds = [...new Set((ucaData ?? []).map(a => a.user_id))]

    // 4. Filter to only teacher-role users
    let teachers: { id: string; full_name: string; centre_ids: string[] }[] = []
    if (teacherUserIds.length > 0) {
        const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name, roles!inner(role_name)')
            .in('id', teacherUserIds)
            .eq('is_active', true)

        const teacherUsers = (usersData ?? []).filter(u => (u.roles as unknown as { role_name: string })?.role_name === 'teacher')

        // Build centre mapping per teacher
        const centreMap: Record<string, string[]> = {}
        for (const a of (ucaData ?? [])) {
            if (!centreMap[a.user_id]) centreMap[a.user_id] = []
            centreMap[a.user_id].push(a.centre_id)
        }

        teachers = teacherUsers.map(u => ({
            id: u.id,
            full_name: u.full_name ?? 'Unknown',
            centre_ids: centreMap[u.id] ?? []
        }))
    }

    // 5. Fetch existing teacher-batch assignments
    const batchIds = (batchesData ?? []).map(b => b.id)
    let assignments: Record<string, unknown>[] = []
    if (batchIds.length > 0) {
        const { data: tbaData } = await supabase
            .from('teacher_batch_assignments')
            .select('id, user_id, batch_id, subject, is_active')
            .in('batch_id', batchIds)

        assignments = tbaData ?? []
    }

    // 6. Flatten into teacher-centric rows
    const formatted: Record<string, unknown>[] = []
    for (const teacher of teachers) {
        const teacherAssignments = assignments.filter(a => a.user_id === teacher.id && a.is_active)

        if (teacherAssignments.length === 0) {
            formatted.push({
                teacher_id: teacher.id,
                teacher_name: teacher.full_name,
                assignment_id: null,
                batch_id: null,
                batch_name: 'Unassigned',
                centre_id: teacher.centre_ids[0] ?? null,
                subject: null,
                status: 'unassigned'
            })
        } else {
            for (const a of teacherAssignments) {
                const batch = (batchesData ?? []).find(b => b.id === a.batch_id)
                formatted.push({
                    teacher_id: teacher.id,
                    teacher_name: teacher.full_name,
                    assignment_id: a.id,
                    batch_id: a.batch_id,
                    batch_name: batch?.batch_name ?? '-',
                    centre_id: batch?.centre_id ?? null,
                    subject: a.subject,
                    status: 'assigned'
                })
            }
        }
    }

    return apiSuccess({
        assignments: formatted,
        centres: allCentresData ?? [],
        batches: batchesData ?? [],
        teachers: teachers.map(t => ({ id: t.id, full_name: t.full_name }))
    })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request) => {
    const body = await request.json()
    const parsed = assignTeacherSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { user_id, batch_id, subject } = parsed.data

    const supabase = await createClient()

    // Check if already assigned
    const { data: existing } = await supabase
        .from('teacher_batch_assignments')
        .select('id, is_active')
        .eq('user_id', user_id)
        .eq('batch_id', batch_id)
        .single()

    if (existing) {
        if (existing.is_active) {
            return apiError('Teacher is already assigned to this batch.', 400)
        }
        // Re-activate
        const { error } = await supabase
            .from('teacher_batch_assignments')
            .update({ is_active: true, subject: subject || null })
            .eq('id', existing.id)
            
        if (error) return apiError(error.message, 400)
        return apiSuccess({ ok: true })
    }

    const { error } = await supabase
        .from('teacher_batch_assignments')
        .insert({ user_id, batch_id, subject: subject || null })

    if (error) return apiError(error.message, 400)

    return apiSuccess({ ok: true })
}, ['ceo', 'centre_head'])

export const PATCH = withAuth(async (request) => {
    const body = await request.json()
    const parsed = unassignTeacherSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { id } = parsed.data

    const supabase = await createClient()
    const { error } = await supabase
        .from('teacher_batch_assignments')
        .update({ is_active: false })
        .eq('id', id)

    if (error) return apiError(error.message, 400)

    return apiSuccess({ ok: true })
}, ['ceo', 'centre_head'])
