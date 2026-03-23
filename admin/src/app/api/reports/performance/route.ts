/**
 * Performance Report Download API
 * GET — Generates PDF or Excel performance report for a batch + exam.
 *       Lists per-student marks, percentage, pass/fail status. Absent students at bottom.
 *       Role-scoped: CEO/centre_head/teacher (teacher checks via teacher_batch_assignments).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, apiError } from '@/lib/api/api-helpers'
import { generatePerformanceReportPDF } from '@/lib/reports/pdf-reports'
import { generatePerformanceReportExcel } from '@/lib/reports/excel-reports'

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    const examId = searchParams.get('exam_id')
    const format = searchParams.get('format') ?? 'pdf'

    if (!batchId || !examId) return apiError('batch_id and exam_id are required', 400)

    const supabase = await createClient()

    // Verify batch access
    const { data: batch, error: batchErr } = await supabase
        .from('batches')
        .select('id, batch_name, centre_id')
        .eq('id', batchId)
        .single()

    if (batchErr || !batch) return apiError('Batch not found', 404)

    if (ctx.profile.role === 'centre_head' && !ctx.profile.centreIds.includes(batch.centre_id)) {
        return apiError('Access denied', 403)
    }
    if (ctx.profile.role === 'teacher') {
        const { data: assignment } = await supabase
            .from('teacher_batch_assignments')
            .select('id')
            .eq('batch_id', batchId)
            .eq('user_id', ctx.user.id)
            .eq('is_active', true)
            .limit(1)

        if (!assignment || assignment.length === 0) return apiError('Access denied', 403)
    }

    // Fetch exam
    const { data: exam, error: examErr } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .eq('batch_id', batchId)
        .single()

    if (examErr || !exam) return apiError('Exam not found', 404)

    // Fetch enrolled students
    const { data: enrollments } = await supabase
        .from('student_batch_enrollments')
        .select('student_id, students!inner(student_code, users!inner(full_name))')
        .eq('batch_id', batchId)
        .eq('is_active', true)

    const studentIds = (enrollments ?? []).map((e: any) => e.student_id)

    // Fetch marks
    const { data: marks } = await supabase
        .from('student_marks')
        .select('*')
        .eq('exam_id', examId)
        .in('student_id', studentIds)

    const marksMap = new Map((marks ?? []).map((m: any) => [m.student_id, m]))

    const students = (enrollments ?? []).map((e: any) => {
        const m = marksMap.get(e.student_id)
        const marksObtained = m?.marks_obtained ?? 0
        const isAbsent = m?.is_absent ?? true
        const percentage = exam.total_marks > 0 ? (marksObtained / exam.total_marks) * 100 : 0
        const passingMarks = exam.passing_marks ?? 0
        const status = isAbsent ? 'Absent' : (marksObtained >= passingMarks ? 'Pass' : 'Fail')

        return {
            student_name: e.students?.users?.full_name ?? 'Unknown',
            student_code: e.students?.student_code ?? '',
            marks_obtained: marksObtained,
            is_absent: isAbsent,
            percentage,
            status,
        }
    })

    // Sort by marks descending (absent at bottom)
    students.sort((a, b) => {
        if (a.is_absent && !b.is_absent) return 1
        if (!a.is_absent && b.is_absent) return -1
        return b.marks_obtained - a.marks_obtained
    })

    const reportData = {
        batch_name: batch.batch_name,
        exam_name: exam.exam_name,
        total_marks: exam.total_marks,
        students,
    }

    if (format === 'excel') {
        const buffer = await generatePerformanceReportExcel(reportData)
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="performance_${batch.batch_name}_${exam.exam_name}.xlsx"`,
            },
        })
    }

    const buffer = generatePerformanceReportPDF(reportData)
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="performance_${batch.batch_name}_${exam.exam_name}.pdf"`,
        },
    })
}, ['ceo', 'centre_head', 'teacher'])
