import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AllowedRole = 'ceo' | 'centre_head' | 'teacher'

type Centre = { id: string; centre_name: string }
type Batch = { id: string; batch_name: string; centre_id: string }
type StudentOption = { id: string; student_code: string | null; full_name: string | null; display_name: string }
type Exam = { id: string; exam_name: string; exam_date: string; total_marks: number; batch_id: string; subject: string | null }
type MarkRow = { student_id: string; exam_id: string; marks_obtained: number; is_absent: boolean }

function isAllowedRole(role: string | null): role is AllowedRole {
  return role === 'ceo' || role === 'centre_head' || role === 'teacher'
}

const EMPTY_RESPONSE = (filters?: Partial<{ centres: Centre[]; batches: Batch[]; students: StudentOption[]; subjects: string[] }>) => ({
  filters: { centres: [], batches: [], students: [], subjects: [], selectedStudentId: null, ...filters },
  trendMode: 'batch' as const,
  summary: { examsCount: 0, marksEntries: 0, absentCount: 0, averagePercentage: null, topPercentage: null },
  trend: [],
  batchComparison: [],
  subjectBreakdown: [],
  marks: [],
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role_id, is_active').eq('id', user.id).single()
  if (!profile?.is_active) return NextResponse.json({ error: 'Your account is not active.' }, { status: 403 })

  const { data: roleData } = await supabase.from('roles').select('role_name').eq('id', profile.role_id).single()
  if (!isAllowedRole(roleData?.role_name ?? null)) {
    return NextResponse.json({ error: 'You are not allowed to view performance.' }, { status: 403 })
  }

  const role = roleData!.role_name as AllowedRole

  const { searchParams } = new URL(request.url)
  const centreId = searchParams.get('centreId')
  const batchId = searchParams.get('batchId')
  const studentId = searchParams.get('studentId')
  const subject = searchParams.get('subject')
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')

  // ── Centres & Batches (scoped by role) ──
  let accessibleCentreIds: string[] = []
  if (role === 'ceo') {
    const { data } = await supabase.from('centres').select('id').eq('is_active', true)
    accessibleCentreIds = (data ?? []).map(c => c.id)
  } else {
    const { data } = await supabase.from('user_centre_assignments').select('centre_id').eq('user_id', user.id).eq('is_active', true)
    accessibleCentreIds = (data ?? []).map(a => a.centre_id)
  }

  const { data: centresData, error: centresErr } = await supabase.from('centres').select('id, centre_name').in('id', accessibleCentreIds).eq('is_active', true).order('centre_name')
  if (centresErr) return NextResponse.json({ error: centresErr.message }, { status: 400 })

  const centresToQuery = centreId && accessibleCentreIds.includes(centreId) ? [centreId] : accessibleCentreIds

  let batchQ = supabase.from('batches').select('id, batch_name, centre_id').in('centre_id', centresToQuery).eq('is_active', true).order('batch_name')
  const { data: batchesData, error: batchesErr } = await batchQ
  if (batchesErr) return NextResponse.json({ error: batchesErr.message }, { status: 400 })

  const centres = (centresData ?? []) as Centre[]
  const batches = (batchesData ?? []) as Batch[]

  const selectedBatchId = batchId && batches.some(b => b.id === batchId) ? batchId : batches[0]?.id ?? null
  if (!selectedBatchId) return NextResponse.json(EMPTY_RESPONSE({ centres }))

  // ── Students ──
  const { data: enrollRows, error: enrollErr } = await supabase
    .from('student_batch_enrollments').select('student_id').eq('batch_id', selectedBatchId).eq('is_active', true)
  if (enrollErr) return NextResponse.json({ error: enrollErr.message }, { status: 400 })

  const studentIds = [...new Set((enrollRows ?? []).map(r => r.student_id))]
  const studentMap = new Map<string, StudentOption>()

  if (studentIds.length > 0) {
    const { data: sRows, error: sErr } = await supabase
      .from('students').select('id, student_code, parent_name, admission_form_data, users(full_name)').in('id', studentIds)
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 })

    for (const r of sRows ?? []) {
      const userInfo = Array.isArray(r.users) ? r.users[0] : r.users
      const fullName = userInfo?.full_name ?? null
      const formName = r.admission_form_data && typeof r.admission_form_data === 'object'
        ? (r.admission_form_data as Record<string, unknown>).student_name : null
      const display = fullName
        ?? (typeof formName === 'string' ? formName : null)
        ?? (r.parent_name ? `Ward of ${r.parent_name}` : null)
        ?? (r.student_code ? `Student ${r.student_code}` : `Student ${r.id.slice(0, 8)}`)
      studentMap.set(r.id, { id: r.id, student_code: r.student_code, full_name: fullName, display_name: display })
    }
  }

  const students = Array.from(studentMap.values()).sort((a, b) => a.display_name.localeCompare(b.display_name))
  if (studentId && !studentMap.has(studentId)) {
    return NextResponse.json({ error: 'Selected student is not accessible.' }, { status: 403 })
  }

  // ── Exams (with optional subject filter) ──
  let examQ = supabase.from('exams').select('id, exam_name, exam_date, total_marks, batch_id, subject').eq('batch_id', selectedBatchId).order('exam_date', { ascending: true })
  if (fromDate) examQ = examQ.gte('exam_date', fromDate)
  if (toDate) examQ = examQ.lte('exam_date', toDate)

  const { data: allExamsData, error: examsErr } = await examQ
  if (examsErr) return NextResponse.json({ error: examsErr.message }, { status: 400 })
  const allExams = (allExamsData ?? []) as Exam[]

  // Extract distinct subjects for the filter dropdown.
  const subjects = [...new Set(allExams.map(e => e.subject).filter((s): s is string => s !== null))].sort()

  // Apply subject filter if specified.
  const exams = subject ? allExams.filter(e => e.subject === subject) : allExams
  const examIds = exams.map(e => e.id)
  const examMap = new Map(exams.map(e => [e.id, e]))

  if (examIds.length === 0) {
    return NextResponse.json(EMPTY_RESPONSE({ centres, batches, students, subjects }))
  }

  // ── Marks ──
  const { data: marksData, error: marksErr } = await supabase.from('student_marks').select('student_id, exam_id, marks_obtained, is_absent').in('exam_id', examIds)
  if (marksErr) return NextResponse.json({ error: marksErr.message }, { status: 400 })

  const centreMap = new Map(centres.map(c => [c.id, c]))
  const batchMap = new Map(batches.map(b => [b.id, b]))

  const marks = (marksData ?? [] as MarkRow[]).map(row => {
    const exam = examMap.get(row.exam_id)
    if (!exam) return null
    const batch = batchMap.get(exam.batch_id)
    const student = studentMap.get(row.student_id)
    if (!batch || !student) return null
    const centre = centreMap.get(batch.centre_id)
    const percentage = row.is_absent || exam.total_marks <= 0 ? null : Number(((row.marks_obtained / exam.total_marks) * 100).toFixed(2))
    return {
      exam_id: exam.id, exam_name: exam.exam_name, exam_date: exam.exam_date,
      subject: exam.subject,
      batch_id: batch.id, batch_name: batch.batch_name,
      centre_id: batch.centre_id, centre_name: centre?.centre_name ?? null,
      student_id: student.id, student_name: student.display_name, student_code: student.student_code,
      marks_obtained: row.marks_obtained, total_marks: exam.total_marks,
      is_absent: row.is_absent, percentage,
    }
  }).filter(Boolean)

  type MarkItem = NonNullable<(typeof marks)[number]>
  const validMarks = marks as MarkItem[]
  const scopedMarks = studentId ? validMarks.filter(m => m.student_id === studentId) : validMarks

  // ── Summary ──
  let pTotal = 0, pCount = 0, topPct: number | null = null, absentCount = 0
  for (const r of scopedMarks) {
    if (r.is_absent) { absentCount++; continue }
    if (r.percentage !== null) { pTotal += r.percentage; pCount++; if (topPct === null || r.percentage > topPct) topPct = r.percentage }
  }
  const averagePercentage = pCount > 0 ? Number((pTotal / pCount).toFixed(2)) : null

  // ── Batch comparison ──
  const cmpMap = new Map<string, { student_id: string; student_name: string | null; total: number; count: number; scores: number[] }>()
  for (const r of validMarks) {
    if (r.is_absent || r.percentage === null) continue
    const c = cmpMap.get(r.student_id) ?? { student_id: r.student_id, student_name: r.student_name, total: 0, count: 0, scores: [] }
    c.total += r.percentage; c.count++; c.scores.push(r.percentage)
    cmpMap.set(r.student_id, c)
  }
  const batchComparison = Array.from(cmpMap.values()).map(c => {
    const avg = c.total / c.count
    const variance = c.scores.reduce((a, s) => a + (s - avg) ** 2, 0) / c.count
    const sd = Math.sqrt(variance)
    return {
      student_id: c.student_id, student_name: c.student_name,
      average_percentage: Number(avg.toFixed(2)), exam_count: c.count,
      consistency_score: Number(Math.max(0, Math.min(100, 100 - sd * 2.5)).toFixed(2)),
      score_deviation: Number(sd.toFixed(2)),
    }
  }).sort((a, b) => b.average_percentage - a.average_percentage)

  // ── Trend ──
  const trendMode: 'batch' | 'student' = studentId ? 'student' : 'batch'
  const trend = studentId
    ? scopedMarks.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
      .map(m => ({ exam_id: m.exam_id, exam_name: m.exam_name, exam_date: m.exam_date, percentage: m.percentage, marks_obtained: m.marks_obtained, total_marks: m.total_marks }))
    : exams.map(exam => {
      let t = 0, n = 0
      for (const r of validMarks) { if (r.exam_id === exam.id && !r.is_absent && r.percentage !== null) { t += r.percentage; n++ } }
      return { exam_id: exam.id, exam_name: exam.exam_name, exam_date: exam.exam_date, percentage: n > 0 ? Number((t / n).toFixed(2)) : null, marks_obtained: null, total_marks: exam.total_marks }
    })

  // ── Subject breakdown (NEW) ──
  const subjMap = new Map<string, { total: number; count: number; top: number; examCount: Set<string> }>()
  for (const r of scopedMarks) {
    if (!r.subject || r.is_absent || r.percentage === null) continue
    const s = subjMap.get(r.subject) ?? { total: 0, count: 0, top: 0, examCount: new Set<string>() }
    s.total += r.percentage; s.count++
    if (r.percentage > s.top) s.top = r.percentage
    s.examCount.add(r.exam_id)
    subjMap.set(r.subject, s)
  }
  const subjectBreakdown = Array.from(subjMap.entries())
    .map(([name, s]) => ({ subject: name, average: Number((s.total / s.count).toFixed(2)), top: Number(s.top.toFixed(2)), examCount: s.examCount.size }))
    .sort((a, b) => b.average - a.average)

  return NextResponse.json({
    filters: { centres, batches, students, subjects, selectedStudentId: studentId || null },
    trendMode,
    summary: { examsCount: exams.length, marksEntries: scopedMarks.length, absentCount, averagePercentage, topPercentage: topPct },
    trend, batchComparison, subjectBreakdown, marks: scopedMarks,
  })
}
