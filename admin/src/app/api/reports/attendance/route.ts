/**
 * Attendance Report Download API
 * GET — Returns scoped attendance report cards or generates a student attendance report for a date range.
 */
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { apiError, withAuth } from '@/lib/api/api-helpers'
import { generateAttendanceReportPDF } from '@/lib/reports/pdf-reports'

type BatchIdRow = { id: string }
type StudentIdRow = { student_id: string }
type SearchStudentRow = {
  id: string
  student_code: string | null
  users: { full_name: string | null } | null
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
      : await supabase
          .from('student_batch_enrollments')
          .select('student_id')
          .in('batch_id', batchIds)
          .eq('is_active', true)

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
      let attQuery = supabase.from('attendance').select('attendance_date, status').eq('student_id', student.id)
      if (from) attQuery = attQuery.gte('attendance_date', from)
      if (to) attQuery = attQuery.lte('attendance_date', to)
      const { data: attendanceRows } = await attQuery

      const totalDays = new Set((attendanceRows ?? []).map((row: { attendance_date: string }) => row.attendance_date)).size
      const present = (attendanceRows ?? []).filter((row: { status: string }) => row.status === 'present').length
      const absent = (attendanceRows ?? []).filter((row: { status: string }) => row.status === 'absent').length

      return {
        id: student.id,
        student_code: student.student_code,
        student_name: student.users?.full_name ?? 'Unknown',
        total_days: totalDays,
        present,
        absent,
        percentage: totalDays > 0 ? Number(((present / totalDays) * 100).toFixed(1)) : 0,
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

    const allowed = (enrollments ?? []).some((row: { batches: { centre_id: string | null } | null }) => ctx.profile.centreIds.includes(row.batches?.centre_id ?? ''))
    if (!allowed) return apiError('Access denied', 403)
  }

  const { data: attendanceRows, error: attendanceError } = await supabase
    .from('attendance')
    .select('attendance_date, status, batch_id, batches!inner(batch_name, centre_id)')
    .eq('student_id', studentId)
    .gte('attendance_date', from)
    .lte('attendance_date', to)
    .order('attendance_date', { ascending: true })

  if (attendanceError) return apiError(attendanceError.message, 400)

  const scopedAttendanceRows = ctx.profile.role === 'centre_head'
    ? (attendanceRows ?? []).filter((row: { batches: { centre_id: string | null } | { centre_id: string | null }[] | null }) => {
        const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches
        return ctx.profile.centreIds.includes(batch?.centre_id ?? '')
      })
    : (attendanceRows ?? [])

  const records = scopedAttendanceRows.map((row: { attendance_date: string; status: string; batches: { batch_name: string | null } | { batch_name: string | null }[] | null }) => ({
    date: row.attendance_date,
    batch_name: (Array.isArray(row.batches) ? row.batches[0] : row.batches)?.batch_name ?? 'Unknown',
    status: row.status,
  }))

  const totalDays = new Set(records.map((row) => row.date)).size
  const present = records.filter((row) => row.status === 'present').length
  const absent = records.filter((row) => row.status === 'absent').length
  const reportData = {
    student_name: (Array.isArray(student.users) ? student.users[0] : student.users)?.full_name ?? 'Unknown',
    student_code: student.student_code ?? null,
    date_range: `${from} to ${to}`,
    summary: {
      total_days: totalDays,
      present,
      absent,
      percentage: totalDays > 0 ? (present / totalDays) * 100 : 0,
    },
    records,
  }

  const buffer = generateAttendanceReportPDF(reportData)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="attendance_${studentId}_${from}_${to}.pdf"`,
    },
  })
}, ['ceo', 'centre_head'])
