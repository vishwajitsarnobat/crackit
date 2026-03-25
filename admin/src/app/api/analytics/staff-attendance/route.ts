/**
 * Staff Attendance Analytics API
 * GET — Returns scoped filters, KPI summary, daily/monthly/yearly charts, and teacher breakdown.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subDays } from 'date-fns'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserContext } from '@/lib/auth/current-user'

type AllowedRole = 'ceo' | 'centre_head' | 'teacher'
type CentreRow = { id: string; centre_name: string }
type BatchRow = { id: string; batch_name: string; centre_id: string }
type TeacherRow = { id: string; full_name: string }
type StaffAttendanceRow = { user_id: string; centre_id: string; attendance_date: string; status: 'present' | 'absent' | 'partial'; in_time: string | null; out_time: string | null }

function isAllowed(role: string | null): role is AllowedRole {
  return role === 'ceo' || role === 'centre_head' || role === 'teacher'
}

function emptyResponse(centres: CentreRow[], batches: BatchRow[], teachers: TeacherRow[]) {
  return {
    filters: { centres, batches, teachers },
    summary: { totalDays: 0, presentCount: 0, absentCount: 0, partialCount: 0, attendancePercent: null },
    dailyTrend: [],
    monthlyTrend: [],
    yearlyTrend: [],
    teacherBreakdown: [],
  }
}

export async function GET(request: NextRequest) {
  const context = await getCurrentUserContext()
  if (!context?.isActive || !isAllowed(context.role)) {
    return NextResponse.json({ error: 'You are not allowed to view staff attendance analytics.' }, { status: 403 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const centreId = searchParams.get('centreId') || ''
  const batchId = searchParams.get('batchId') || ''
  const teacherId = searchParams.get('teacherId') || ''
  const fromDate = searchParams.get('from') || format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const toDate = searchParams.get('to') || format(new Date(), 'yyyy-MM-dd')
  const year = Number(searchParams.get('year') || new Date().getFullYear())

  let centres: CentreRow[] = []
  if (context.role === 'ceo') {
    const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
    centres = (data ?? []) as CentreRow[]
  } else if (context.role === 'centre_head') {
    const { data } = await supabase
      .from('user_centre_assignments')
      .select('centres!inner(id, centre_name)')
      .eq('user_id', context.userId)
      .eq('is_active', true)
    centres = (data ?? []).map((row: { centres: CentreRow | CentreRow[] | null }) => (Array.isArray(row.centres) ? row.centres[0] : row.centres) as CentreRow).filter(Boolean)
  } else {
    const { data } = await supabase
      .from('teacher_batch_assignments')
      .select('batches!inner(centres!inner(id, centre_name))')
      .eq('user_id', context.userId)
      .eq('is_active', true)

    const centreMap = new Map<string, CentreRow>()
    for (const row of (data ?? []) as Array<{ batches: { centres: CentreRow | CentreRow[] | null } | { centres: CentreRow | CentreRow[] | null }[] | null }>) {
      const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches
      const centre = Array.isArray(batch?.centres) ? batch?.centres[0] : batch?.centres
      if (centre) centreMap.set(centre.id, centre)
    }
    centres = Array.from(centreMap.values()).sort((left, right) => left.centre_name.localeCompare(right.centre_name))
  }

  const allowedCentreIds = new Set(centres.map((centre) => centre.id))
  if (centreId && !allowedCentreIds.has(centreId)) {
    return NextResponse.json({ error: 'You are not allowed to view staff attendance analytics for this centre.' }, { status: 403 })
  }

  let batches: BatchRow[] = []
  if (context.role === 'teacher') {
    const { data } = await supabase
      .from('teacher_batch_assignments')
      .select('batches!inner(id, batch_name, centre_id)')
      .eq('user_id', context.userId)
      .eq('is_active', true)
    batches = (data ?? []).map((row: { batches: BatchRow | BatchRow[] | null }) => (Array.isArray(row.batches) ? row.batches[0] : row.batches) as BatchRow).filter(Boolean)
  } else {
    let query = supabase.from('batches').select('id, batch_name, centre_id').eq('is_active', true).order('batch_name')
    if (context.role === 'centre_head') query = query.in('centre_id', centres.map((centre) => centre.id))
    const { data } = await query
    batches = (data ?? []) as BatchRow[]
  }

  const filteredBatches = centreId ? batches.filter((batch) => batch.centre_id === centreId) : batches
  if (batchId && !filteredBatches.some((batch) => batch.id === batchId)) {
    return NextResponse.json({ error: 'You are not allowed to view staff attendance analytics for this batch.' }, { status: 403 })
  }
  const activeBatchIds = batchId ? filteredBatches.filter((batch) => batch.id === batchId).map((batch) => batch.id) : filteredBatches.map((batch) => batch.id)

  let teachers: TeacherRow[] = []
  if (context.role === 'teacher') {
    const { data } = await supabase.from('users').select('id, full_name').eq('id', context.userId).single()
    teachers = data ? [data as TeacherRow] : []
  } else {
    let assignmentQuery = supabase
      .from('teacher_batch_assignments')
      .select('user_id, users!inner(id, full_name), batches!inner(id, centre_id)')
      .eq('is_active', true)

    if (activeBatchIds.length > 0) assignmentQuery = assignmentQuery.in('batch_id', activeBatchIds)
    const { data } = await assignmentQuery
    const teacherMap = new Map<string, TeacherRow>()
    for (const row of (data ?? []) as Array<{ user_id: string; users: TeacherRow | TeacherRow[] | null }>) {
      const user = Array.isArray(row.users) ? row.users[0] : row.users
      if (user) teacherMap.set(row.user_id, user)
    }
    teachers = Array.from(teacherMap.values()).sort((left, right) => left.full_name.localeCompare(right.full_name))
  }

  const activeTeacherIds = teacherId ? teachers.filter((teacher) => teacher.id === teacherId).map((teacher) => teacher.id) : teachers.map((teacher) => teacher.id)
  if (teacherId && activeTeacherIds.length === 0) {
    return NextResponse.json({ error: 'You are not allowed to view staff attendance analytics for this teacher.' }, { status: 403 })
  }
  if (activeTeacherIds.length === 0) return NextResponse.json(emptyResponse(centres, filteredBatches, teachers))

  let attendanceQuery = supabase
    .from('staff_attendance')
    .select('user_id, centre_id, attendance_date, status, in_time, out_time')
    .in('user_id', activeTeacherIds)
    .gte('attendance_date', fromDate)
    .lte('attendance_date', toDate)

  if (context.role !== 'teacher') {
    const centreIds = centreId ? [centreId] : centres.map((centre) => centre.id)
    if (centreIds.length > 0) attendanceQuery = attendanceQuery.in('centre_id', centreIds)
  }

  const { data: attendanceData, error: attendanceError } = await attendanceQuery
  if (attendanceError) return NextResponse.json({ error: attendanceError.message }, { status: 400 })
  const rows = (attendanceData ?? []) as StaffAttendanceRow[]

  const presentCount = rows.filter((row) => row.status === 'present').length
  const absentCount = rows.filter((row) => row.status === 'absent').length
  const partialCount = rows.filter((row) => row.status === 'partial').length
  const totalRows = presentCount + absentCount + partialCount
  const attendancePercent = totalRows > 0 ? Number(((presentCount / totalRows) * 100).toFixed(1)) : null

  const dailyMap = new Map<string, { date: string; present: number; absent: number; partial: number }>()
  for (const row of rows) {
    const existing = dailyMap.get(row.attendance_date) ?? { date: row.attendance_date, present: 0, absent: 0, partial: 0 }
    existing[row.status] += 1
    dailyMap.set(row.attendance_date, existing)
  }

  const monthlyMap = new Map<string, { month: string; present: number; absent: number; partial: number }>()
  for (const row of rows) {
    const monthKey = row.attendance_date.slice(0, 7)
    const existing = monthlyMap.get(monthKey) ?? { month: monthKey, present: 0, absent: 0, partial: 0 }
    existing[row.status] += 1
    monthlyMap.set(monthKey, existing)
  }

  const yearStart = startOfMonth(new Date(year, 0, 1))
  const yearEnd = endOfMonth(new Date(year, 11, 1))
  let yearlyQuery = supabase
    .from('staff_attendance')
    .select('user_id, centre_id, attendance_date, status, in_time, out_time')
    .in('user_id', activeTeacherIds)
    .gte('attendance_date', format(yearStart, 'yyyy-MM-dd'))
    .lte('attendance_date', format(yearEnd, 'yyyy-MM-dd'))

  if (context.role !== 'teacher') {
    const centreIds = centreId ? [centreId] : centres.map((centre) => centre.id)
    if (centreIds.length > 0) yearlyQuery = yearlyQuery.in('centre_id', centreIds)
  }

  const { data: yearlyData, error: yearlyError } = await yearlyQuery
  if (yearlyError) return NextResponse.json({ error: yearlyError.message }, { status: 400 })
  const yearlyRows = (yearlyData ?? []) as StaffAttendanceRow[]

  const yearlyMap = new Map<string, { month: string; present: number; absent: number; partial: number; percent: number | null }>()
  for (const monthDate of eachMonthOfInterval({ start: yearStart, end: yearEnd })) {
    const key = format(monthDate, 'yyyy-MM')
    yearlyMap.set(key, { month: key, present: 0, absent: 0, partial: 0, percent: null })
  }
  for (const row of yearlyRows) {
    const key = row.attendance_date.slice(0, 7)
    const existing = yearlyMap.get(key)
    if (!existing) continue
    existing[row.status] += 1
  }
  for (const month of yearlyMap.values()) {
    const total = month.present + month.absent + month.partial
    month.percent = total > 0 ? Number(((month.present / total) * 100).toFixed(1)) : null
  }

  const teacherMap = new Map(activeTeacherIds.map((teacherKey) => [teacherKey, { present: 0, absent: 0, partial: 0 }]))
  for (const row of rows) {
    const existing = teacherMap.get(row.user_id) ?? { present: 0, absent: 0, partial: 0 }
    existing[row.status] += 1
    teacherMap.set(row.user_id, existing)
  }

  const teacherNameMap = new Map(teachers.map((teacher) => [teacher.id, teacher.full_name]))
  const teacherBreakdown = Array.from(teacherMap.entries()).map(([teacherKey, stats]) => {
    const total = stats.present + stats.absent + stats.partial
    return {
      user_id: teacherKey,
      teacher_name: teacherNameMap.get(teacherKey) ?? 'Unknown',
      present: stats.present,
      absent: stats.absent,
      partial: stats.partial,
      total,
      percent: total > 0 ? Number(((stats.present / total) * 100).toFixed(1)) : null,
    }
  }).sort((left, right) => (right.percent ?? 0) - (left.percent ?? 0))

  return NextResponse.json({
    filters: { centres, batches: filteredBatches, teachers },
    summary: { totalDays: new Set(rows.map((row) => row.attendance_date)).size, presentCount, absentCount, partialCount, attendancePercent },
    dailyTrend: Array.from(dailyMap.values()).sort((left, right) => left.date.localeCompare(right.date)),
    monthlyTrend: Array.from(monthlyMap.values()).sort((left, right) => left.month.localeCompare(right.month)),
    yearlyTrend: Array.from(yearlyMap.values()),
    teacherBreakdown,
  })
}
