/**
 * Exam Marks Task API
 * GET   — Returns batches (no params), exams for a batch (batch_id), or students with marks (batch_id + exam_id)
 * POST  — Creates an exam (if body has exam_name) or upserts student marks (if body has exam_id + marks)
 * PATCH — Toggles exam results_published flag
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createExamSchema, saveMarksSchema, togglePublishSchema } from '@/lib/validations/data-entry'

type BatchRow = {
    id: string
    batch_name: string
    batch_code: string
    centres: { centre_name: string | null } | null
}

type EnrollmentRow = {
    student_id: string
    students: {
        student_code: string | null
        users: { full_name: string | null } | Array<{ full_name: string | null }> | null
    } | Array<{
        student_code: string | null
        users: { full_name: string | null } | Array<{ full_name: string | null }> | null
    }> | null
}

type StudentMarkRow = {
    id: string
    student_id: string
    marks_obtained: number
    is_absent: boolean
}

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    const examId = searchParams.get('exam_id')
    const supabase = await createClient()

    if (!batchId) {
        // Return only teacher-assigned batches for selection
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

    if (examId) {
        const { data: assignment } = await supabase
            .from('teacher_batch_assignments')
            .select('id')
            .eq('user_id', ctx.user.id)
            .eq('batch_id', batchId)
            .eq('is_active', true)
            .maybeSingle()

        if (!assignment) return apiError('You are not authorized to view this exam.', 403)

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

        const studentIds = ((enrollments ?? []) as EnrollmentRow[]).map((e) => e.student_id)

        const { data: marks } = await supabase
            .from('student_marks')
            .select('*')
            .eq('exam_id', examId)
            .in('student_id', studentIds)

        const marksMap = new Map(((marks ?? []) as StudentMarkRow[]).map((m) => [m.student_id, m]))

        const students = ((enrollments ?? []) as EnrollmentRow[]).map((e) => {
            const existing = marksMap.get(e.student_id)
            const studentInfo = Array.isArray(e.students) ? e.students[0] : e.students
            const studentUser = Array.isArray(studentInfo?.users) ? studentInfo?.users[0] : studentInfo?.users
            return {
                student_id: e.student_id,
                student_name: studentUser?.full_name ?? 'Unknown',
                student_code: studentInfo?.student_code ?? null,
                marks_obtained: existing?.marks_obtained ?? 0,
                is_absent: existing?.is_absent ?? false,
                id: existing?.id ?? null,
            }
        })

        return apiSuccess({ exam, students })
    }

    const { data: assignment } = await supabase
        .from('teacher_batch_assignments')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('batch_id', batchId)
        .eq('is_active', true)
        .maybeSingle()

    if (!assignment) return apiError('You are not authorized to view exams for this batch.', 403)

    // Return exams for the batch
    const { data: exams, error } = await supabase
        .from('exams')
        .select('*')
        .eq('batch_id', batchId)
        .order('exam_date', { ascending: false })

    if (error) return apiError(error.message, 500)
    return apiSuccess({ exams: exams ?? [] })
}, ['teacher'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const supabase = await createClient()

    // Determine if this is creating an exam or saving marks
    if (body.exam_name) {
        const parsed = createExamSchema.safeParse(body)
        if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

        const { data: assignment } = await supabase
            .from('teacher_batch_assignments')
            .select('id')
            .eq('user_id', ctx.user.id)
            .eq('batch_id', parsed.data.batch_id)
            .eq('is_active', true)
            .maybeSingle()

        if (!assignment) {
            return apiError('You are not authorized to create exams for this batch.', 403)
        }

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

    const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('batch_id')
        .eq('id', exam_id)
        .single()

    if (examError || !exam) return apiError('Exam not found.', 404)

    const { data: assignment } = await supabase
        .from('teacher_batch_assignments')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('batch_id', exam.batch_id)
        .eq('is_active', true)
        .maybeSingle()

    if (!assignment) {
        return apiError('You are not authorized to enter marks for this exam.', 403)
    }

    const { data: enrollments, error: enrollmentError } = await supabase
        .from('student_batch_enrollments')
        .select('student_id')
        .eq('batch_id', exam.batch_id)
        .eq('is_active', true)

    if (enrollmentError) return apiError(enrollmentError.message, 500)

    const allowedStudentIds = new Set((enrollments ?? []).map((row: { student_id: string }) => row.student_id))
    const hasInvalidStudent = marks.some((mark) => !allowedStudentIds.has(mark.student_id))
    if (hasInvalidStudent) return apiError('One or more students are not actively enrolled in this batch.', 400)

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
}, ['teacher'])

export const PATCH = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = togglePublishSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const supabase = await createClient()
    const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('batch_id')
        .eq('id', parsed.data.exam_id)
        .single()

    if (examError || !exam) return apiError('Exam not found.', 404)

    const { data: assignment } = await supabase
        .from('teacher_batch_assignments')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('batch_id', exam.batch_id)
        .eq('is_active', true)
        .maybeSingle()

    if (!assignment) return apiError('You are not authorized to update this exam.', 403)

    const adminClient = createAdminClient()
    const { error } = await adminClient
        .from('exams')
        .update({ results_published: parsed.data.results_published })
        .eq('id', parsed.data.exam_id)

    if (error) return apiError(error.message, 400)
    return apiSuccess({ ok: true })
}, ['teacher'])
