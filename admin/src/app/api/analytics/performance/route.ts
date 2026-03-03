import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AllowedRole = 'ceo' | 'centre_head' | 'teacher'

type Centre = {
  id: string
  centre_name: string
}

type Batch = {
  id: string
  batch_name: string
  centre_id: string
}

type StudentOption = {
  id: string
  student_code: string | null
  full_name: string | null
  display_name: string
}

type Exam = {
  id: string
  exam_name: string
  exam_date: string
  total_marks: number
  batch_id: string
}

type MarkRow = {
  student_id: string
  exam_id: string
  marks_obtained: number
  is_absent: boolean
}

function isAllowedRole(role: string | null): role is AllowedRole {
  return role === 'ceo' || role === 'centre_head' || role === 'teacher'
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role_id, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.is_active !== true) {
    return NextResponse.json({ error: 'Your account is not active.' }, { status: 403 })
  }

  const { data: roleData } = await supabase
    .from('roles')
    .select('role_name')
    .eq('id', profile.role_id)
    .single()

  const roleName = roleData?.role_name ?? null

  if (!isAllowedRole(roleName)) {
    return NextResponse.json({ error: 'You are not allowed to view performance.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const centreId = searchParams.get('centreId')
  const batchId = searchParams.get('batchId')
  const studentId = searchParams.get('studentId')
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')

  const { data: centresData, error: centresError } = await supabase
    .from('centres')
    .select('id, centre_name')
    .eq('is_active', true)
    .order('centre_name')

  if (centresError) {
    return NextResponse.json({ error: centresError.message }, { status: 400 })
  }

  let batchQuery = supabase
    .from('batches')
    .select('id, batch_name, centre_id')
    .eq('is_active', true)
    .order('batch_name')

  if (centreId) {
    batchQuery = batchQuery.eq('centre_id', centreId)
  }

  const { data: batchesData, error: batchesError } = await batchQuery

  if (batchesError) {
    return NextResponse.json({ error: batchesError.message }, { status: 400 })
  }

  const centres = (centresData ?? []) as Centre[]
  const batches = (batchesData ?? []) as Batch[]
  const batchIds = batches.map(item => item.id)

  if (batchId && !batchIds.includes(batchId)) {
    return NextResponse.json({ error: 'Selected batch is not accessible.' }, { status: 403 })
  }

  const selectedBatchId = batchId || batches[0]?.id || null

  if (!selectedBatchId) {
    return NextResponse.json({
      filters: { centres, batches: [], students: [], selectedStudentId: null },
      summary: {
        examsCount: 0,
        marksEntries: 0,
        absentCount: 0,
        averagePercentage: null,
        topPercentage: null,
      },
      trend: [],
      batchComparison: [],
      marks: [],
    })
  }

  const scopedBatchIds = [selectedBatchId]

  if (scopedBatchIds.length === 0) {
    return NextResponse.json({
      filters: { centres, batches: [], students: [], selectedStudentId: null },
      trendMode: 'batch',
      summary: {
        examsCount: 0,
        marksEntries: 0,
        absentCount: 0,
        averagePercentage: null,
        topPercentage: null,
      },
      trend: [],
      batchComparison: [],
      marks: [],
    })
  }

  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from('student_batch_enrollments')
    .select('student_id')
    .in('batch_id', scopedBatchIds)
    .eq('is_active', true)

  if (enrollmentError) {
    return NextResponse.json({ error: enrollmentError.message }, { status: 400 })
  }

  const studentIds = [...new Set((enrollmentRows ?? []).map(row => row.student_id))]

  const studentMap = new Map<string, StudentOption>()
  if (studentIds.length > 0) {
    const { data: studentRows, error: studentRowsError } = await supabase
      .from('students')
      .select('id, student_code, parent_name, admission_form_data, users(full_name)')
      .in('id', studentIds)

    if (studentRowsError) {
      return NextResponse.json({ error: studentRowsError.message }, { status: 400 })
    }

    for (const row of studentRows ?? []) {
      const userInfo = Array.isArray(row.users) ? row.users[0] : row.users
      const fullName = userInfo?.full_name ?? null
      const formStudentName =
        row.admission_form_data && typeof row.admission_form_data === 'object'
          ? (row.admission_form_data as Record<string, unknown>).student_name
          : null
      const fallbackName =
        (typeof formStudentName === 'string' ? formStudentName : null) ??
        (row.parent_name ? `Ward of ${row.parent_name}` : null) ??
        (row.student_code ? `Student ${row.student_code}` : null) ??
        `Student ${row.id.slice(0, 8)}`
      studentMap.set(row.id, {
        id: row.id,
        student_code: row.student_code,
        full_name: fullName,
        display_name: fullName ?? fallbackName,
      })
    }
  }

  const students = Array.from(studentMap.values()).sort((a, b) =>
    a.display_name.localeCompare(b.display_name)
  )

  if (studentId && !studentMap.has(studentId)) {
    return NextResponse.json({ error: 'Selected student is not accessible.' }, { status: 403 })
  }

  let examQuery = supabase
    .from('exams')
    .select('id, exam_name, exam_date, total_marks, batch_id')
    .in('batch_id', scopedBatchIds)
    .order('exam_date', { ascending: true })

  if (fromDate) {
    examQuery = examQuery.gte('exam_date', fromDate)
  }

  if (toDate) {
    examQuery = examQuery.lte('exam_date', toDate)
  }

  const { data: examsData, error: examsError } = await examQuery

  if (examsError) {
    return NextResponse.json({ error: examsError.message }, { status: 400 })
  }

  const exams = (examsData ?? []) as Exam[]
  const examIds = exams.map(item => item.id)
  const examMap = new Map(exams.map(item => [item.id, item]))

  if (examIds.length === 0) {
    return NextResponse.json({
      filters: { centres, batches, students, selectedStudentId: null },
      trendMode: 'batch',
      summary: {
        examsCount: 0,
        marksEntries: 0,
        absentCount: 0,
        averagePercentage: null,
        topPercentage: null,
      },
      trend: [],
      batchComparison: [],
      marks: [],
    })
  }

  const marksQuery = supabase
    .from('student_marks')
    .select('student_id, exam_id, marks_obtained, is_absent')
    .in('exam_id', examIds)

  const { data: marksData, error: marksError } = await marksQuery

  if (marksError) {
    return NextResponse.json({ error: marksError.message }, { status: 400 })
  }

  const marksRows = (marksData ?? []) as MarkRow[]
  const centreMap = new Map(centres.map(item => [item.id, item]))
  const batchMap = new Map(batches.map(item => [item.id, item]))

  const marks = marksRows
    .map(row => {
      const exam = examMap.get(row.exam_id)
      if (!exam) return null

      const batch = batchMap.get(exam.batch_id)
      const student = studentMap.get(row.student_id)
      if (!batch || !student) return null

      const centre = centreMap.get(batch.centre_id)
      const percentage =
        row.is_absent || exam.total_marks <= 0
          ? null
          : Number(((row.marks_obtained / exam.total_marks) * 100).toFixed(2))

      return {
        exam_id: exam.id,
        exam_name: exam.exam_name,
        exam_date: exam.exam_date,
        batch_id: batch.id,
        batch_name: batch.batch_name,
        centre_id: batch.centre_id,
        centre_name: centre?.centre_name ?? null,
        student_id: student.id,
        student_name: student.display_name,
        student_code: student.student_code,
        marks_obtained: row.marks_obtained,
        total_marks: exam.total_marks,
        is_absent: row.is_absent,
        percentage,
      }
    })
    .filter(Boolean)

  const validMarks = marks.filter(item => item !== null)
  const scopedMarks = studentId
    ? validMarks.filter(item => item.student_id === studentId)
    : validMarks

  let percentageTotal = 0
  let percentageCount = 0
  let topPercentage: number | null = null
  let absentCount = 0

  for (const row of scopedMarks) {
    if (row.is_absent) {
      absentCount += 1
      continue
    }

    if (row.percentage !== null) {
      percentageTotal += row.percentage
      percentageCount += 1
      if (topPercentage === null || row.percentage > topPercentage) {
        topPercentage = row.percentage
      }
    }
  }

  const averagePercentage =
    percentageCount > 0 ? Number((percentageTotal / percentageCount).toFixed(2)) : null

  const comparisonMap = new Map<
    string,
    {
      student_id: string
      student_name: string | null
      total: number
      count: number
      scores: number[]
    }
  >()

  for (const row of validMarks) {
    if (row.is_absent || row.percentage === null) continue
    const current = comparisonMap.get(row.student_id) ?? {
      student_id: row.student_id,
      student_name: row.student_name,
      total: 0,
      count: 0,
      scores: [],
    }
    current.total += row.percentage
    current.count += 1
    current.scores.push(row.percentage)
    comparisonMap.set(row.student_id, current)
  }

  const batchComparison = Array.from(comparisonMap.values())
    .map(item => {
      const average = item.total / item.count
      const variance =
        item.scores.reduce((acc, score) => acc + (score - average) * (score - average), 0) /
        item.count
      const standardDeviation = Math.sqrt(variance)
      const consistencyScore = Math.max(0, Math.min(100, 100 - standardDeviation * 2.5))

      return {
        student_id: item.student_id,
        student_name: item.student_name,
        average_percentage: Number(average.toFixed(2)),
        exam_count: item.count,
        consistency_score: Number(consistencyScore.toFixed(2)),
        score_deviation: Number(standardDeviation.toFixed(2)),
      }
    })
    .sort((a, b) => b.average_percentage - a.average_percentage)

  const trendMode: 'batch' | 'student' = studentId ? 'student' : 'batch'

  const trend = studentId
    ? scopedMarks
        .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
        .map(item => ({
          exam_id: item.exam_id,
          exam_name: item.exam_name,
          exam_date: item.exam_date,
          percentage: item.percentage,
          marks_obtained: item.marks_obtained,
          total_marks: item.total_marks,
        }))
    : exams.map(exam => {
        let totalPercentage = 0
        let counted = 0

        for (const row of validMarks) {
          if (row.exam_id !== exam.id) continue
          if (row.is_absent || row.percentage === null) continue
          totalPercentage += row.percentage
          counted += 1
        }

        return {
          exam_id: exam.id,
          exam_name: exam.exam_name,
          exam_date: exam.exam_date,
          percentage: counted > 0 ? Number((totalPercentage / counted).toFixed(2)) : null,
          marks_obtained: null,
          total_marks: exam.total_marks,
        }
      })

  return NextResponse.json({
    filters: {
      centres,
      batches,
      students,
      selectedStudentId: studentId || null,
    },
    trendMode,
    summary: {
      examsCount: exams.length,
      marksEntries: scopedMarks.length,
      absentCount,
      averagePercentage,
      topPercentage,
    },
    trend,
    batchComparison,
    marks: scopedMarks,
  })
}
