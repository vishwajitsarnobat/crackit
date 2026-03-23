/**
 * Student Profile Report API
 * GET — Searches students by name/code (search mode) or generates PDF/Excel profile download.
 *       Role-scoped: CEO sees all, centre_head sees their centres, teacher sees their batches.
 * Uses: teacher_batch_assignments (teacher scope), student_batch_enrollments (enrolment data)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, apiError } from '@/lib/api/api-helpers'
import { generateStudentProfilePDF } from '@/lib/reports/pdf-reports'
import { generateStudentProfileExcel } from '@/lib/reports/excel-reports'

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const format = searchParams.get('format') ?? 'pdf'
    const search = searchParams.get('search')

    const supabase = await createClient()

    // Search mode: return student list
    if (search) {
        let query = supabase
            .from('students')
            .select('id, student_code, class_level, is_active, users!inner(full_name)')
            .or(`student_code.ilike.%${search}%,users.full_name.ilike.%${search}%`)
            .limit(20)

        // Teacher: only students in their batches
        if (ctx.profile.role === 'teacher') {
            const { data: assignments } = await supabase
                .from('teacher_batch_assignments')
                .select('batch_id')
                .eq('user_id', ctx.user.id)
                .eq('is_active', true)

            const batchIds = (assignments ?? []).map((a: any) => a.batch_id)
            if (batchIds.length === 0) return NextResponse.json({ students: [] })

            const { data: enrollments } = await supabase
                .from('student_batch_enrollments')
                .select('student_id')
                .in('batch_id', batchIds)
                .eq('is_active', true)

            const studentIds = [...new Set((enrollments ?? []).map((e: any) => e.student_id))]
            if (studentIds.length === 0) return NextResponse.json({ students: [] })

            query = query.in('id', studentIds)
        } else if (ctx.profile.role === 'centre_head') {
            const { data: batches } = await supabase
                .from('batches')
                .select('id')
                .in('centre_id', ctx.profile.centreIds)
                .eq('is_active', true)

            const batchIds = (batches ?? []).map((b: any) => b.id)
            if (batchIds.length === 0) return NextResponse.json({ students: [] })

            const { data: enrollments } = await supabase
                .from('student_batch_enrollments')
                .select('student_id')
                .in('batch_id', batchIds)
                .eq('is_active', true)

            const studentIds = [...new Set((enrollments ?? []).map((e: any) => e.student_id))]
            if (studentIds.length === 0) return NextResponse.json({ students: [] })

            query = query.in('id', studentIds)
        }

        const { data, error } = await query
        if (error) return apiError(error.message, 500)

        const students = (data ?? []).map((s: any) => ({
            id: s.id,
            student_code: s.student_code,
            student_name: s.users?.full_name ?? 'Unknown',
            class_level: s.class_level,
            is_active: s.is_active,
        }))

        return NextResponse.json({ students })
    }

    // Download mode
    if (!studentId) return apiError('student_id is required', 400)

    // Fetch student with user data
    const { data: student, error: studError } = await supabase
        .from('students')
        .select('*, users!inner(full_name, email, phone)')
        .eq('id', studentId)
        .single()

    if (studError || !student) return apiError('Student not found', 404)

    // Role-based scope check
    if (ctx.profile.role === 'teacher') {
        const { data: assignments } = await supabase
            .from('teacher_batch_assignments')
            .select('batch_id')
            .eq('user_id', ctx.user.id)
            .eq('is_active', true)

        const batchIds = (assignments ?? []).map((a: any) => a.batch_id)

        const { data: enrollments } = await supabase
            .from('student_batch_enrollments')
            .select('batch_id')
            .eq('student_id', studentId)
            .in('batch_id', batchIds)
            .eq('is_active', true)

        if (!enrollments || enrollments.length === 0) return apiError('Access denied', 403)
    } else if (ctx.profile.role === 'centre_head') {
        const { data: enrollments } = await supabase
            .from('student_batch_enrollments')
            .select('batch_id, batches!inner(centre_id)')
            .eq('student_id', studentId)
            .eq('is_active', true)

        const batchCentreIds = (enrollments ?? []).map((e: any) => e.batches?.centre_id).filter(Boolean)
        const hasAccess = batchCentreIds.some((cid: string) => ctx.profile.centreIds.includes(cid))
        if (!hasAccess) return apiError('Access denied', 403)
    }

    // Fetch enrollments
    const { data: enrollments } = await supabase
        .from('student_batch_enrollments')
        .select('*, batches!inner(batch_name, centres!inner(centre_name), courses!inner(course_name))')
        .eq('student_id', studentId)

    const reportData = {
        student_name: student.users?.full_name ?? 'Unknown',
        student_code: student.student_code ?? '',
        email: student.users?.email ?? null,
        phone: student.users?.phone ?? null,
        date_of_birth: student.date_of_birth ?? null,
        class_level: student.class_level ?? 0,
        parent_name: student.parent_name ?? null,
        parent_phone: student.parent_phone ?? null,
        current_points: student.current_points ?? 0,
        enrollments: (enrollments ?? []).map((e: any) => ({
            batch_name: e.batches?.batch_name ?? '',
            centre_name: e.batches?.centres?.centre_name ?? '',
            course_name: e.batches?.courses?.course_name ?? '',
            enrollment_date: e.enrollment_date ?? '',
            status: e.status ?? '',
        })),
    }

    if (format === 'excel') {
        const buffer = await generateStudentProfileExcel(reportData)
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="student_profile_${student.student_code || studentId}.xlsx"`,
            },
        })
    }

    const buffer = generateStudentProfilePDF(reportData)
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="student_profile_${student.student_code || studentId}.pdf"`,
        },
    })
}, ['ceo', 'centre_head', 'teacher'])
