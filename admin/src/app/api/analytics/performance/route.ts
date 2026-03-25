/**
 * Performance Analytics API
 * GET — Returns scoped performance filters, KPI summary, overall/subject trends, comparison data, and marks table.
 * Performance analytics intentionally omits any centre-level subject filter because subjects differ across batches.
 */
import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserContext } from '@/lib/auth/current-user'

type AllowedRole = 'ceo' | 'centre_head' | 'teacher'
type BatchRow = { id: string; batch_name: string; centre_id: string }
type StudentRow = { id: string; student_code: string | null; users: { full_name: string | null } | null }
type ExamRow = { id: string; exam_name: string; exam_date: string; total_marks: number; batch_id: string; subject: string | null }
type MarkRow = { student_id: string; exam_id: string; marks_obtained: number; is_absent: boolean }
type TeacherAssignmentBatchRow = { batches: BatchRow | BatchRow[] | null }

function isAllowed(role: string | null): role is AllowedRole {
  return role === 'ceo' || role === 'centre_head' || role === 'teacher'
}

function emptyResponse(batches: BatchRow[], students: { id: string; display_name: string; student_code: string | null }[], subjects: string[]) {
  return {
    filters: { batches, students, subjects },
    summary: { examsCount: 0, marksEntries: 0, absentCount: 0, averagePercentage: null, topPercentage: null },
    overallTrend: [],
    subjectTrend: [],
    comparison: [],
    marks: [],
  }
}

export async function GET(request: NextRequest) {
  const context = await getCurrentUserContext()
  if (!context?.isActive || !isAllowed(context.role)) {
    return NextResponse.json({ error: 'You are not allowed to view performance analytics.' }, { status: 403 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const batchId = searchParams.get('batchId')
  const studentId = searchParams.get('studentId')
  const subject = searchParams.get('subject') || ''
  const fromDate = searchParams.get('from') || ''
  const toDate = searchParams.get('to') || ''

  let batches: BatchRow[] = []
  if (context.role === 'teacher') {
    const { data, error } = await supabase
      .from('teacher_batch_assignments')
      .select('batches!inner(id, batch_name, centre_id)')
      .eq('user_id', context.userId)
      .eq('is_active', true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    batches = (data ?? [])
      .map((row: TeacherAssignmentBatchRow) => (Array.isArray(row.batches) ? row.batches[0] : row.batches) as BatchRow | null)
      .filter((batch): batch is BatchRow => Boolean(batch))
  } else {
    let query = supabase.from('batches').select('id, batch_name, centre_id').eq('is_active', true).order('batch_name')
    if (context.role === 'centre_head') query = query.in('centre_id', context.centreIds)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    batches = (data ?? []) as BatchRow[]
  }

  const uniqueBatches = new Map<string, BatchRow>()
  for (const batch of batches) {
    uniqueBatches.set(batch.id, batch)
  }
  batches = Array.from(uniqueBatches.values()).sort((left, right) => left.batch_name.localeCompare(right.batch_name))

  const scopedBatchIds = batchId ? batches.filter((batch) => batch.id === batchId).map((batch) => batch.id) : batches.map((batch) => batch.id)
  if (scopedBatchIds.length === 0) return NextResponse.json(emptyResponse(batches, [], []))

  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from('student_batch_enrollments')
    .select('student_id, batch_id')
    .in('batch_id', scopedBatchIds)
    .eq('is_active', true)
  if (enrollmentError) return NextResponse.json({ error: enrollmentError.message }, { status: 400 })

  const studentIds = [...new Set((enrollmentRows ?? []).map((row) => row.student_id))]
  const { data: studentData, error: studentError } = studentIds.length === 0
    ? { data: [], error: null }
    : await supabase.from('students').select('id, student_code, users!inner(full_name)').in('id', studentIds)
  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 400 })

  const students = ((studentData ?? []) as unknown as StudentRow[])
    .map((student) => ({ id: student.id, display_name: student.users?.full_name ?? `Student ${student.id.slice(0, 8)}`, student_code: student.student_code }))
    .sort((left, right) => left.display_name.localeCompare(right.display_name))

  const chosenStudentId = studentId && students.some((student) => student.id === studentId) ? studentId : ''

  let examQuery = supabase.from('exams').select('id, exam_name, exam_date, total_marks, batch_id, subject').in('batch_id', scopedBatchIds).order('exam_date', { ascending: true })
  if (fromDate) examQuery = examQuery.gte('exam_date', fromDate)
  if (toDate) examQuery = examQuery.lte('exam_date', toDate)
  if (subject) examQuery = examQuery.eq('subject', subject)
  const { data: examData, error: examError } = await examQuery
  if (examError) return NextResponse.json({ error: examError.message }, { status: 400 })

  const exams = (examData ?? []) as ExamRow[]
  const subjects = [...new Set(exams.map((exam) => exam.subject).filter((item): item is string => Boolean(item)))].sort()
  const examIds = exams.map((exam) => exam.id)
  if (examIds.length === 0) return NextResponse.json(emptyResponse(batches, students, subjects))

  const { data: markData, error: markError } = await supabase.from('student_marks').select('student_id, exam_id, marks_obtained, is_absent').in('exam_id', examIds)
  if (markError) return NextResponse.json({ error: markError.message }, { status: 400 })

  const examMap = new Map(exams.map((exam) => [exam.id, exam]))
  const batchMap = new Map(batches.map((batch) => [batch.id, batch]))
  const studentMap = new Map(students.map((student) => [student.id, student]))

  const marks = ((markData ?? []) as MarkRow[])
    .map((row) => {
      const exam = examMap.get(row.exam_id)
      const batch = exam ? batchMap.get(exam.batch_id) : null
      const student = studentMap.get(row.student_id)
      if (!exam || !batch || !student) return null
      const percentage = row.is_absent ? null : Number(((row.marks_obtained / exam.total_marks) * 100).toFixed(2))
      return {
        exam_id: exam.id,
        exam_name: exam.exam_name,
        exam_date: exam.exam_date,
        batch_id: batch.id,
        batch_name: batch.batch_name,
        student_id: student.id,
        student_name: student.display_name,
        student_code: student.student_code,
        marks_obtained: row.marks_obtained,
        total_marks: exam.total_marks,
        is_absent: row.is_absent,
        percentage,
        subject: exam.subject,
      }
    })
    .filter(Boolean)

  const scopedMarks = chosenStudentId ? marks.filter((row) => row?.student_id === chosenStudentId) : marks

  let total = 0
  let count = 0
  let absentCount = 0
  let topPercentage: number | null = null
  for (const row of scopedMarks) {
    if (!row) continue
    if (row.is_absent || row.percentage === null) {
      absentCount += row.is_absent ? 1 : 0
      continue
    }
    total += row.percentage
    count += 1
    topPercentage = topPercentage === null ? row.percentage : Math.max(topPercentage, row.percentage)
  }
  const averagePercentage = count > 0 ? Number((total / count).toFixed(2)) : null

  const overallTrend = exams.map((exam) => {
    const examMarks = scopedMarks.filter((row) => row?.exam_id === exam.id && !row.is_absent && row.percentage !== null)
    const avg = examMarks.length > 0 ? Number((examMarks.reduce((sum, row) => sum + (row?.percentage ?? 0), 0) / examMarks.length).toFixed(2)) : null
    return { exam_name: exam.exam_name, exam_date: exam.exam_date, average_percentage: avg }
  })

  const subjectTrendMap = new Map<string, { subject: string; average_percentage: number; top_percentage: number }>()
  for (const row of scopedMarks) {
    if (!row?.subject || row.is_absent || row.percentage === null) continue
    const existing = subjectTrendMap.get(row.subject) ?? { subject: row.subject, average_percentage: 0, top_percentage: 0 }
    existing.average_percentage += row.percentage
    existing.top_percentage = Math.max(existing.top_percentage, row.percentage)
    subjectTrendMap.set(row.subject, existing)
  }
  const subjectCounts = new Map<string, number>()
  for (const row of scopedMarks) {
    if (!row?.subject || row.is_absent || row.percentage === null) continue
    subjectCounts.set(row.subject, (subjectCounts.get(row.subject) ?? 0) + 1)
  }
  const subjectTrend = Array.from(subjectTrendMap.values()).map((entry) => ({
    subject: entry.subject,
    average_percentage: Number((entry.average_percentage / (subjectCounts.get(entry.subject) ?? 1)).toFixed(2)),
    top_percentage: Number(entry.top_percentage.toFixed(2)),
  }))

  const comparisonMap = new Map<string, { student_name: string; scores: number[] }>()
  for (const row of marks) {
    if (!row || row.is_absent || row.percentage === null) continue
    const existing = comparisonMap.get(row.student_id) ?? { student_name: row.student_name, scores: [] }
    existing.scores.push(row.percentage)
    comparisonMap.set(row.student_id, existing)
  }
  const comparison = Array.from(comparisonMap.entries()).map(([key, value]) => {
    const average = value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length
    const variance = value.scores.reduce((sum, score) => sum + ((score - average) ** 2), 0) / value.scores.length
    const deviation = Math.sqrt(variance)
    return {
      student_id: key,
      student_name: value.student_name,
      average_percentage: Number(average.toFixed(2)),
      consistency_score: Number(Math.max(0, 100 - deviation * 2.5).toFixed(2)),
      exam_count: value.scores.length,
      score_deviation: Number(deviation.toFixed(2)),
    }
  })

  const rankSorted = [...comparison]
    .sort((left, right) => {
      if (right.average_percentage !== left.average_percentage) {
        return right.average_percentage - left.average_percentage
      }
      return right.exam_count - left.exam_count
    })
    .map((entry, index) => ({
      ...entry,
      rank_position: index + 1,
    }))

  const consistencyRankMap = new Map(
    [...rankSorted]
      .sort((left, right) => {
        if (right.consistency_score !== left.consistency_score) {
          return right.consistency_score - left.consistency_score
        }
        return right.exam_count - left.exam_count
      })
      .map((entry, index) => [entry.student_id, index + 1]),
  )

  const finalComparison = rankSorted.map((entry) => ({
    ...entry,
    consistency_rank: consistencyRankMap.get(entry.student_id) ?? null,
  }))

  return NextResponse.json({
    filters: { batches, students, subjects },
    summary: { examsCount: exams.length, marksEntries: scopedMarks.length, absentCount, averagePercentage, topPercentage },
    overallTrend,
    subjectTrend,
    comparison: finalComparison,
    marks: scopedMarks,
  })
}
