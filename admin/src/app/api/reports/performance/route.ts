/**
 * Performance Report Download API
 * GET — Returns scoped performance report cards or generates a student performance report for a date range.
 */
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { apiError, withAuth } from '@/lib/api/api-helpers'
import { generatePerformanceReportPDF } from '@/lib/reports/pdf-reports'

type BatchIdRow = { id: string }
type StudentIdRow = { student_id: string }
type SearchStudentRow = {
  id: string
  student_code: string | null
  users: { full_name: string | null } | Array<{ full_name: string | null }> | null
}

type CentreScopedEnrollmentRow = {
  batches: { centre_id: string | null } | Array<{ centre_id: string | null }> | null
}

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('student_id')
  const search = searchParams.get('search')?.trim()
  const centreId = searchParams.get('centre_id')
  const batchId = searchParams.get('batch_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const supabase = await createClient()

  if (ctx.profile.role === 'centre_head' && centreId && !ctx.profile.centreIds.includes(centreId)) {
    return apiError('Access denied for this centre filter.', 403)
  }

  if (!studentId) {
    let batchIds: string[] = []
    if (ctx.profile.role === 'centre_head') {
      let batchQuery = supabase.from('batches').select('id').in('centre_id', ctx.profile.centreIds).eq('is_active', true)
      if (centreId) batchQuery = batchQuery.eq('centre_id', centreId)
      if (batchId) batchQuery = batchQuery.eq('id', batchId)
      const { data } = await batchQuery
      batchIds = (data ?? []).map((row: BatchIdRow) => row.id)
      if (batchId && !batchIds.includes(batchId)) return apiError('Access denied for this batch filter.', 403)
    } else {
      let batchQuery = supabase.from('batches').select('id').eq('is_active', true)
      if (centreId) batchQuery = batchQuery.eq('centre_id', centreId)
      if (batchId) batchQuery = batchQuery.eq('id', batchId)
      const { data } = await batchQuery
      batchIds = (data ?? []).map((row: BatchIdRow) => row.id)
    }

    if ((centreId || batchId) && batchIds.length === 0) return NextResponse.json({ students: [] })

    const { data: enrollments } = batchIds.length === 0 && !centreId && !batchId
      ? { data: [] }
      : await supabase.from('student_batch_enrollments').select('student_id').in('batch_id', batchIds).eq('is_active', true)

    const studentIds = batchIds.length === 0 && !centreId && !batchId
      ? null
      : [...new Set((enrollments ?? []).map((row: StudentIdRow) => row.student_id))]

    let query = supabase
      .from('students')
      .select('id, student_code, users!inner(full_name)')
      .limit(search ? 24 : 60)

    if (search) {
      query = query.or(`student_code.ilike.%${search}%,users.full_name.ilike.%${search}%`)
    }

    if (studentIds !== null) {
      if (studentIds.length === 0) return NextResponse.json({ students: [] })
      query = query.in('id', studentIds)
    }

    const { data, error } = await query
    if (error) return apiError(error.message, 500)

    const students = await Promise.all(((data ?? []) as SearchStudentRow[]).map(async (student) => {
      const studentUser = Array.isArray(student.users) ? student.users[0] : student.users
      let marksQuery = supabase
        .from('student_marks')
        .select('marks_obtained, is_absent, exam_id, exams!inner(exam_date, total_marks)')
        .eq('student_id', student.id)

      if (from) marksQuery = marksQuery.gte('exams.exam_date', from)
      if (to) marksQuery = marksQuery.lte('exams.exam_date', to)

      const { data: markRows } = await marksQuery
      let total = 0
      let count = 0
      let top = 0

      for (const row of (markRows ?? []) as Array<{ marks_obtained: number; is_absent: boolean; exams: { total_marks: number } | { total_marks: number }[] | null }>) {
        const exam = Array.isArray(row.exams) ? row.exams[0] : row.exams
        if (!exam || row.is_absent) continue
        const percentage = exam.total_marks > 0 ? (row.marks_obtained / exam.total_marks) * 100 : 0
        total += percentage
        count += 1
        top = Math.max(top, percentage)
      }

      return {
        id: student.id,
        student_code: student.student_code,
        student_name: studentUser?.full_name ?? 'Unknown',
        exams_count: count,
        average_percentage: count > 0 ? Number((total / count).toFixed(1)) : 0,
        top_percentage: Number(top.toFixed(1)),
      }
    }))

    return NextResponse.json({ students })
  }

  if (!from || !to) return apiError('from and to are required', 400)

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('student_code, users!inner(full_name)')
    .eq('id', studentId)
    .single()

  if (studentError || !student) return apiError('Student not found', 404)

  if (ctx.profile.role === 'centre_head') {
    const { data: enrollments } = await supabase
      .from('student_batch_enrollments')
      .select('batches!inner(centre_id)')
      .eq('student_id', studentId)
      .eq('is_active', true)

    const allowed = (enrollments ?? []).some((row: CentreScopedEnrollmentRow) => {
      const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches
      return ctx.profile.centreIds.includes(batch?.centre_id ?? '')
    })
    if (!allowed) return apiError('Access denied', 403)
  }

  const { data: markRows, error: marksError } = await supabase
    .from('student_marks')
    .select('marks_obtained, is_absent, exams!inner(id, exam_name, exam_date, total_marks, subject, batch_id, batches!inner(batch_name))')
    .eq('student_id', studentId)
    .gte('exams.exam_date', from)
    .lte('exams.exam_date', to)

  if (marksError) return apiError(marksError.message, 400)

  const scopedMarkRows = ctx.profile.role === 'centre_head'
    ? (markRows ?? []).filter((row: {
        exams: {
          batch_id?: string | null
        } | Array<{
          batch_id?: string | null
        }> | null
      }) => {
        const exam = Array.isArray(row.exams) ? row.exams[0] : row.exams
        return exam?.batch_id ? true : false
      })
    : (markRows ?? [])

  const centreHeadAllowedBatchIds = ctx.profile.role === 'centre_head'
    ? new Set((await supabase.from('batches').select('id').in('centre_id', ctx.profile.centreIds).eq('is_active', true)).data?.map((row: BatchIdRow) => row.id) ?? [])
    : null

  const records = scopedMarkRows.filter((row: {
    exams: {
      batch_id?: string | null
    } | Array<{
      batch_id?: string | null
    }> | null
  }) => {
    if (!centreHeadAllowedBatchIds) return true
    const exam = Array.isArray(row.exams) ? row.exams[0] : row.exams
    return centreHeadAllowedBatchIds.has(exam?.batch_id ?? '')
  }).map((row: {
    marks_obtained: number
    is_absent: boolean
    exams: {
      exam_name: string
      exam_date: string
      total_marks: number
      subject: string | null
      batches: { batch_name: string | null } | { batch_name: string | null }[] | null
    } | Array<{
      exam_name: string
      exam_date: string
      total_marks: number
      subject: string | null
      batches: { batch_name: string | null } | { batch_name: string | null }[] | null
    }> | null
  }) => {
    const exam = Array.isArray(row.exams) ? row.exams[0] : row.exams
    const batch = Array.isArray(exam?.batches) ? exam?.batches[0] : exam?.batches
    const percentage = row.is_absent || !exam ? null : (row.marks_obtained / exam.total_marks) * 100
    return {
      exam_name: exam?.exam_name ?? 'Unknown',
      exam_date: exam?.exam_date ?? '',
      batch_name: batch?.batch_name ?? 'Unknown',
      subject: exam?.subject ?? null,
      marks_obtained: row.marks_obtained,
      total_marks: exam?.total_marks ?? 0,
      is_absent: row.is_absent,
      percentage: percentage === null ? null : Number(percentage.toFixed(1)),
      status: row.is_absent ? 'Absent' : (percentage !== null && percentage >= 40 ? 'Pass' : 'Fail'),
    }
  }).sort((left, right) => left.exam_date.localeCompare(right.exam_date))

  const validPercentages = records.filter((row) => row.percentage !== null).map((row) => row.percentage ?? 0)
  const reportData = {
    student_name: (Array.isArray(student.users) ? student.users[0] : student.users)?.full_name ?? 'Unknown',
    student_code: student.student_code ?? null,
    date_range: `${from} to ${to}`,
    summary: {
      exams_count: records.length,
      average_percentage: validPercentages.length ? validPercentages.reduce((sum, value) => sum + value, 0) / validPercentages.length : 0,
      top_percentage: validPercentages.length ? Math.max(...validPercentages) : 0,
    },
    records,
  }

  const buffer = generatePerformanceReportPDF(reportData)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="performance_${studentId}_${from}_${to}.pdf"`,
    },
  })
}, ['ceo', 'centre_head'])
