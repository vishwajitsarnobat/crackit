/**
 * Attendance Report Download API
 * GET — Generates PDF or Excel attendance report for a batch + date range.
 *       Aggregates per-student present/absent counts and attendance %.
 *       Role-scoped: CEO/centre_head/teacher (teacher checks via teacher_batch_assignments).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, apiError } from '@/lib/api/api-helpers'
import { generateAttendanceReportPDF } from '@/lib/reports/pdf-reports'
import { generateAttendanceReportExcel } from '@/lib/reports/excel-reports'

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const format = searchParams.get('format') ?? 'pdf'

    if (!batchId || !from || !to) return apiError('batch_id, from, and to are required', 400)

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

    // Fetch enrolled students
    const { data: enrollments } = await supabase
        .from('student_batch_enrollments')
        .select('student_id, students!inner(student_code, users!inner(full_name))')
        .eq('batch_id', batchId)
        .eq('is_active', true)

    const studentIds = (enrollments ?? []).map((e: any) => e.student_id)

    if (studentIds.length === 0) return apiError('No students enrolled in this batch', 400)

    // Fetch attendance records in date range
    const { data: attendance } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('batch_id', batchId)
        .gte('attendance_date', from)
        .lte('attendance_date', to)
        .in('student_id', studentIds)

    // Count unique attendance dates for total days
    const { data: distinctDates } = await supabase
        .from('attendance')
        .select('attendance_date')
        .eq('batch_id', batchId)
        .gte('attendance_date', from)
        .lte('attendance_date', to)

    const uniqueDates = new Set((distinctDates ?? []).map((d: any) => d.attendance_date))
    const totalDays = uniqueDates.size

    // Aggregate per student
    const attMap = new Map<string, { present: number; absent: number }>()
    for (const record of (attendance ?? [])) {
        const r = record as any
        const existing = attMap.get(r.student_id) ?? { present: 0, absent: 0 }
        if (r.status === 'present') existing.present++
        else existing.absent++
        attMap.set(r.student_id, existing)
    }

    const students = (enrollments ?? []).map((e: any) => {
        const att = attMap.get(e.student_id) ?? { present: 0, absent: 0 }
        return {
            student_name: e.students?.users?.full_name ?? 'Unknown',
            student_code: e.students?.student_code ?? '',
            total_days: totalDays,
            present: att.present,
            absent: att.absent,
            percentage: totalDays > 0 ? (att.present / totalDays) * 100 : 0,
        }
    })

    const reportData = {
        batch_name: batch.batch_name,
        date_range: `${from} to ${to}`,
        students,
    }

    if (format === 'excel') {
        const buffer = await generateAttendanceReportExcel(reportData)
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="attendance_${batch.batch_name}_${from}_${to}.xlsx"`,
            },
        })
    }

    const buffer = generateAttendanceReportPDF(reportData)
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="attendance_${batch.batch_name}_${from}_${to}.pdf"`,
        },
    })
}, ['ceo', 'centre_head', 'teacher'])
