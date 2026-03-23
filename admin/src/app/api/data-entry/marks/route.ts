/**
 * Marks Entry API
 * GET   — Returns batches (no params), exams for a batch (batch_id), or students with marks (batch_id + exam_id)
 * POST  — Creates an exam (if body has exam_name) or upserts student marks (if body has exam_id + marks)
 * PATCH — Toggles exam results_published flag
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createExamSchema, saveMarksSchema, togglePublishSchema } from '@/lib/validations/data-entry'

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    const examId = searchParams.get('exam_id')

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

    const supabase = await createClient()

    if (examId) {
        // Return student marks for a specific exam
        const { data: exam } = await supabase
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single()

        const { data: enrollments } = await supabase
            .from('student_batch_enrollments')
            .select('student_id, students!inner(id, student_code, users!inner(full_name))')
            .eq('batch_id', batchId)
            .eq('is_active', true)

        const studentIds = (enrollments ?? []).map((e: any) => e.student_id)

        const { data: marks } = await supabase
            .from('student_marks')
            .select('*')
            .eq('exam_id', examId)
            .in('student_id', studentIds)

        const marksMap = new Map((marks ?? []).map((m: any) => [m.student_id, m]))

        const students = (enrollments ?? []).map((e: any) => {
            const existing = marksMap.get(e.student_id)
            return {
                student_id: e.student_id,
                student_name: e.students?.users?.full_name ?? 'Unknown',
                student_code: e.students?.student_code ?? null,
                marks_obtained: existing?.marks_obtained ?? 0,
                is_absent: existing?.is_absent ?? false,
                id: existing?.id ?? null,
            }
        })

        return apiSuccess({ exam, students })
    }

    // Return exams for the batch
    const { data: exams, error } = await supabase
        .from('exams')
        .select('*')
        .eq('batch_id', batchId)
        .order('exam_date', { ascending: false })

    if (error) return apiError(error.message, 500)
    return apiSuccess({ exams: exams ?? [] })
}, ['ceo', 'centre_head', 'teacher'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()

    // Determine if this is creating an exam or saving marks
    if (body.exam_name) {
        const parsed = createExamSchema.safeParse(body)
        if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('exams')
            .insert({
                ...parsed.data,
                created_by: ctx.user.id,
            })
            .select()
            .single()

        if (error) return apiError(error.message, 400)
        return apiSuccess({ exam: data })
    }

    // Save marks
    const parsed = saveMarksSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { exam_id, marks } = parsed.data

    const adminClient = createAdminClient()
    const upsertData = marks.map((m) => ({
        student_id: m.student_id,
        exam_id,
        marks_obtained: m.is_absent ? 0 : m.marks_obtained,
        is_absent: m.is_absent,
        entered_by: ctx.user.id,
    }))

    const { error } = await adminClient
        .from('student_marks')
        .upsert(upsertData, { onConflict: 'student_id,exam_id' })

    if (error) return apiError(error.message, 400)
    return apiSuccess({ ok: true, count: marks.length })
}, ['ceo', 'centre_head', 'teacher'])

export const PATCH = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = togglePublishSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const adminClient = createAdminClient()
    const { error } = await adminClient
        .from('exams')
        .update({ results_published: parsed.data.results_published })
        .eq('id', parsed.data.exam_id)

    if (error) return apiError(error.message, 400)
    return apiSuccess({ ok: true })
}, ['ceo', 'centre_head', 'teacher'])
