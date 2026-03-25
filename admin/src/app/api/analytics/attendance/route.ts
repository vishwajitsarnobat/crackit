/**
 * Student Attendance Analytics API
 * GET — Returns scoped attendance filters, KPI summary, day/month/year charts, and student breakdown.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subDays } from 'date-fns'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserContext } from '@/lib/auth/current-user'

type AllowedRole = 'ceo' | 'centre_head' | 'teacher'

type CentreRow = { id: string; centre_name: string }
type BatchRow = { id: string; batch_name: string; centre_id: string }
type StudentRow = {
  id: string
  student_code: string | null
  users: { full_name: string | null } | null
}
type AttendanceRow = {
  student_id: string
  batch_id: string
  attendance_date: string
  status: 'present' | 'absent'
}
type EnrollmentRow = { student_id: string; batch_id: string }

function isAllowed(role: string | null): role is AllowedRole {
  return role === 'ceo' || role === 'centre_head' || role === 'teacher'
}

function emptyResponse(centres: CentreRow[], batches: BatchRow[], students: { id: string; display_name: string; student_code: string | null }[]) {
  return {
    filters: { centres, batches, students },
    summary: { totalDays: 0, presentCount: 0, absentCount: 0, attendancePercent: null, presentDays: 0, absentDays: 0 },
    dailyTrend: [],
    monthlyTrend: [],
    yearlyTrend: [],
    studentBreakdown: [],
  }
}

export async function GET(request: NextRequest) {
  const context = await getCurrentUserContext()
  if (!context?.isActive || !isAllowed(context.role)) {
    return NextResponse.json({ error: 'You are not allowed to view attendance analytics.' }, { status: 403 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const centreId = searchParams.get('centreId')
  const batchId = searchParams.get('batchId')
  const studentId = searchParams.get('studentId')
  const month = searchParams.get('month') || ''
  const resolvedMonthStart = month ? format(startOfMonth(new Date(`${month}-01T00:00:00`)), 'yyyy-MM-dd') : ''
  const resolvedMonthEnd = month ? format(endOfMonth(new Date(`${month}-01T00:00:00`)), 'yyyy-MM-dd') : ''
  const fromDate = searchParams.get('from') || resolvedMonthStart || format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const toDate = searchParams.get('to') || resolvedMonthEnd || format(new Date(), 'yyyy-MM-dd')
  const year = Number(searchParams.get('year') || (month ? month.slice(0, 4) : new Date().getFullYear()))

  let centres: CentreRow[] = []
  if (context.role === 'ceo') {
    const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
    centres = (data ?? []) as CentreRow[]
  } else if (context.role === 'centre_head') {
    const { data } = await supabase
      .from('user_centre_assignments')
      .select('centre_id, centres!inner(id, centre_name)')
      .eq('user_id', context.userId)
      .eq('is_active', true)

    centres = (data ?? []).map((row: { centres: CentreRow | CentreRow[] | null }) => {
      const value = Array.isArray(row.centres) ? row.centres[0] : row.centres
      return value as CentreRow
    }).filter(Boolean)
  }

  let batches: BatchRow[] = []
  if (context.role === 'teacher') {
    const { data } = await supabase
      .from('teacher_batch_assignments')
      .select('batch_id, batches!inner(id, batch_name, centre_id)')
      .eq('user_id', context.userId)
      .eq('is_active', true)

    batches = (data ?? []).map((row: { batches: BatchRow | BatchRow[] | null }) => {
      const value = Array.isArray(row.batches) ? row.batches[0] : row.batches
      return value as BatchRow
    }).filter(Boolean)
  } else {
    let query = supabase.from('batches').select('id, batch_name, centre_id').eq('is_active', true).order('batch_name')
    if (context.role === 'centre_head') {
      const centreIds = centres.map((centre) => centre.id)
      query = query.in('centre_id', centreIds)
    }
    const { data } = await query
    batches = (data ?? []) as BatchRow[]
  }

  const filteredBatches = centreId ? batches.filter((batch) => batch.centre_id === centreId) : batches
  const allowedCentreIds = new Set(centres.map((centre) => centre.id))
  if (centreId && context.role !== 'teacher' && !allowedCentreIds.has(centreId)) {
    return NextResponse.json({ error: 'You are not allowed to view attendance analytics for this centre.' }, { status: 403 })
  }

  if (batchId && !filteredBatches.some((batch) => batch.id === batchId)) {
    return NextResponse.json({ error: 'You are not allowed to view attendance analytics for this batch.' }, { status: 403 })
  }
  const activeBatchIds = batchId ? filteredBatches.filter((batch) => batch.id === batchId).map((batch) => batch.id) : filteredBatches.map((batch) => batch.id)

  if (activeBatchIds.length === 0) {
    return NextResponse.json(emptyResponse(centres, filteredBatches, []))
  }

  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from('student_batch_enrollments')
    .select('student_id, batch_id')
    .in('batch_id', activeBatchIds)
    .eq('is_active', true)

  if (enrollmentError) return NextResponse.json({ error: enrollmentError.message }, { status: 400 })

  const enrollments = (enrollmentData ?? []) as EnrollmentRow[]
  const studentIds = [...new Set(enrollments.map((row) => row.student_id))]

  const { data: studentData, error: studentError } = studentIds.length === 0
    ? { data: [], error: null }
    : await supabase.from('students').select('id, student_code, users!inner(full_name)').in('id', studentIds)

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 400 })

  const students = ((studentData ?? []) as unknown as StudentRow[])
    .map((student) => ({
      id: student.id,
      display_name: student.users?.full_name ?? `Student ${student.id.slice(0, 8)}`,
      student_code: student.student_code,
    }))
    .sort((left, right) => left.display_name.localeCompare(right.display_name))

  const selectedStudentId = studentId && students.some((student) => student.id === studentId) ? studentId : ''

  let attendanceQuery = supabase
    .from('attendance')
    .select('student_id, batch_id, attendance_date, status')
    .in('batch_id', activeBatchIds)
    .gte('attendance_date', fromDate)
    .lte('attendance_date', toDate)

  if (selectedStudentId) attendanceQuery = attendanceQuery.eq('student_id', selectedStudentId)

  const { data: attendanceData, error: attendanceError } = await attendanceQuery
  if (attendanceError) return NextResponse.json({ error: attendanceError.message }, { status: 400 })

  const rows = (attendanceData ?? []) as AttendanceRow[]
  const presentCount = rows.filter((row) => row.status === 'present').length
  const absentCount = rows.filter((row) => row.status === 'absent').length
  const totalRecords = presentCount + absentCount
  const totalDays = new Set(rows.map((row) => row.attendance_date)).size
  const attendancePercent = totalRecords > 0 ? Number(((presentCount / totalRecords) * 100).toFixed(1)) : null

  const dailyMap = new Map<string, { date: string; present: number; absent: number }>()
  for (const row of rows) {
    const existing = dailyMap.get(row.attendance_date) ?? { date: row.attendance_date, present: 0, absent: 0 }
    existing[row.status] += 1
    dailyMap.set(row.attendance_date, existing)
  }

  const monthlyMap = new Map<string, { month: string; present: number; absent: number }>()
  for (const row of rows) {
    const monthKey = row.attendance_date.slice(0, 7)
    const existing = monthlyMap.get(monthKey) ?? { month: monthKey, present: 0, absent: 0 }
    existing[row.status] += 1
    monthlyMap.set(monthKey, existing)
  }

  const yearStart = startOfMonth(new Date(year, 0, 1))
  const yearEnd = endOfMonth(new Date(year, 11, 1))
  let yearlyQuery = supabase
    .from('attendance')
    .select('student_id, batch_id, attendance_date, status')
    .in('batch_id', activeBatchIds)
    .gte('attendance_date', format(yearStart, 'yyyy-MM-dd'))
    .lte('attendance_date', format(yearEnd, 'yyyy-MM-dd'))

  if (selectedStudentId) yearlyQuery = yearlyQuery.eq('student_id', selectedStudentId)
  const { data: yearlyData, error: yearlyError } = await yearlyQuery
  if (yearlyError) return NextResponse.json({ error: yearlyError.message }, { status: 400 })

  const yearlyRows = (yearlyData ?? []) as AttendanceRow[]
  const yearlyMap = new Map<string, { month: string; present: number; absent: number; percent: number | null }>()
  for (const monthDate of eachMonthOfInterval({ start: yearStart, end: yearEnd })) {
    const key = format(monthDate, 'yyyy-MM')
    yearlyMap.set(key, { month: key, present: 0, absent: 0, percent: null })
  }
  for (const row of yearlyRows) {
    const key = row.attendance_date.slice(0, 7)
    const existing = yearlyMap.get(key)
    if (!existing) continue
    existing[row.status] += 1
  }
  for (const value of yearlyMap.values()) {
    const total = value.present + value.absent
    value.percent = total > 0 ? Number(((value.present / total) * 100).toFixed(1)) : null
  }

  const studentMap = new Map(students.map((student) => [student.id, student]))
  const studentBreakdownMap = new Map<string, { present: number; absent: number }>()
  for (const row of rows) {
    const existing = studentBreakdownMap.get(row.student_id) ?? { present: 0, absent: 0 }
    existing[row.status] += 1
    studentBreakdownMap.set(row.student_id, existing)
  }

  const studentBreakdown = Array.from(studentBreakdownMap.entries())
    .map(([studentKey, value]) => {
      const total = value.present + value.absent
      return {
        student_id: studentKey,
        student_name: studentMap.get(studentKey)?.display_name ?? 'Unknown',
        student_code: studentMap.get(studentKey)?.student_code ?? null,
        present: value.present,
        absent: value.absent,
        total,
        percent: total > 0 ? Number(((value.present / total) * 100).toFixed(1)) : null,
      }
    })
    .sort((left, right) => (right.percent ?? 0) - (left.percent ?? 0))

  return NextResponse.json({
    filters: { centres, batches: filteredBatches, students },
    summary: {
      totalDays,
      presentCount,
      absentCount,
      attendancePercent,
      presentDays: presentCount,
      absentDays: absentCount,
    },
    dailyTrend: Array.from(dailyMap.values()).sort((left, right) => left.date.localeCompare(right.date)),
    monthlyTrend: Array.from(monthlyMap.values()).sort((left, right) => left.month.localeCompare(right.month)),
    yearlyTrend: Array.from(yearlyMap.values()),
    studentBreakdown,
  })
}
