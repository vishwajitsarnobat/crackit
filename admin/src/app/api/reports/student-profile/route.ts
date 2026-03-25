/**
 * Student Profile Report API
 * GET — Returns scoped student cards for browsing/filtering or generates PDF profile download.
 *       Role-scoped: CEO sees all, centre_head sees their centres.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, apiError } from '@/lib/api/api-helpers'
import { generateStudentProfilePDF } from '@/lib/reports/pdf-reports'

type SearchStudentRow = {
  id: string
  student_code: string | null
  class_level: number
  is_active: boolean
  users: { full_name: string | null } | null
}

type BatchIdRow = { id: string }
type StudentIdRow = { student_id: string }
type StudentWithUserRow = {
  student_code: string | null
  date_of_birth: string | null
  class_level: number
  parent_name: string | null
  parent_phone: string | null
  current_points: number
  users: {
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
}

type CentreScopedEnrollmentRow = {
  batches: { centre_id: string | null } | null
}

type ReportEnrollmentRow = {
  enrollment_date: string | null
  status: string | null
  batches: {
    centre_id?: string | null
    batch_name: string | null
    centres: { centre_name: string | null } | null
  } | null
}

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('student_id')
  const search = searchParams.get('search')?.trim()
  const centreId = searchParams.get('centre_id')
  const batchId = searchParams.get('batch_id')

  const supabase = await createClient()

  if (ctx.profile.role === 'centre_head' && centreId && !ctx.profile.centreIds.includes(centreId)) {
    return apiError('Access denied for this centre filter.', 403)
  }

  if (!studentId) {
    let scopedBatchIds: string[] | null = null

    if (ctx.profile.role === 'centre_head') {
      const { data: batches } = await supabase
        .from('batches')
        .select('id')
        .in('centre_id', ctx.profile.centreIds)
        .eq('is_active', true)

      scopedBatchIds = (batches ?? []).map((batch: BatchIdRow) => batch.id)
      if (centreId) {
        const { data: centreBatches } = await supabase
          .from('batches')
          .select('id')
          .eq('centre_id', centreId)
          .eq('is_active', true)

        const filteredIds = new Set((centreBatches ?? []).map((batch: BatchIdRow) => batch.id))
        scopedBatchIds = scopedBatchIds.filter((id) => filteredIds.has(id))
      }
      if (batchId && scopedBatchIds && !scopedBatchIds.includes(batchId)) {
        return apiError('Access denied for this batch filter.', 403)
      }
    } else {
      let batchQuery = supabase.from('batches').select('id').eq('is_active', true)
      if (centreId) batchQuery = batchQuery.eq('centre_id', centreId)
      if (batchId) batchQuery = batchQuery.eq('id', batchId)

      const { data: batches } = await batchQuery
      scopedBatchIds = (batches ?? []).map((batch: BatchIdRow) => batch.id)
    }

    if (batchId) {
      scopedBatchIds = (scopedBatchIds ?? []).filter((id) => id === batchId)
    }

    let query = supabase
      .from('students')
      .select('id, student_code, class_level, is_active, users!inner(full_name)')
      .limit(search ? 24 : 60)

    if (search) {
      query = query.or(`student_code.ilike.%${search}%,users.full_name.ilike.%${search}%`)
    }

    if (scopedBatchIds && scopedBatchIds.length > 0) {
      
      const { data: enrollments } = await supabase
        .from('student_batch_enrollments')
        .select('student_id')
        .in('batch_id', scopedBatchIds)
        .eq('is_active', true)

      const studentIds = [...new Set((enrollments ?? []).map((enrollment: StudentIdRow) => enrollment.student_id))]
      if (studentIds.length === 0) return NextResponse.json({ students: [] })

      query = query.in('id', studentIds)
    } else if (centreId || batchId || ctx.profile.role === 'centre_head') {
      return NextResponse.json({ students: [] })
    }

    const { data, error } = await query
    if (error) return apiError(error.message, 500)

    const students = (data ?? []).map((student: SearchStudentRow) => ({
      id: student.id,
      student_code: student.student_code,
      student_name: student.users?.full_name ?? 'Unknown',
      class_level: student.class_level,
      is_active: student.is_active,
    }))

    return NextResponse.json({ students })
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('student_code, date_of_birth, class_level, parent_name, parent_phone, current_points, users!inner(full_name, email, phone)')
    .eq('id', studentId)
    .single()

  if (studentError || !student) return apiError('Student not found', 404)

  if (ctx.profile.role === 'centre_head') {
    const { data: enrollments } = await supabase
      .from('student_batch_enrollments')
      .select('batches!inner(centre_id)')
      .eq('student_id', studentId)
      .eq('is_active', true)

    const batchCentreIds = (enrollments ?? [])
      .map((enrollment: CentreScopedEnrollmentRow) => enrollment.batches?.centre_id)
      .filter((centreId): centreId is string => Boolean(centreId))

    const hasAccess = batchCentreIds.some((centreId) => ctx.profile.centreIds.includes(centreId))
    if (!hasAccess) return apiError('Access denied', 403)
  }

  const { data: enrollments } = await supabase
    .from('student_batch_enrollments')
    .select('enrollment_date, status, batches!inner(centre_id, batch_name, centres!inner(centre_name))')
    .eq('student_id', studentId)

  const scopedEnrollments = ctx.profile.role === 'centre_head'
    ? (enrollments ?? []).filter((enrollment: ReportEnrollmentRow) => ctx.profile.centreIds.includes(enrollment.batches?.centre_id ?? ''))
    : (enrollments ?? [])

  const typedStudent = student as StudentWithUserRow
  const reportData = {
    student_name: typedStudent.users?.full_name ?? 'Unknown',
    student_code: typedStudent.student_code ?? '',
    email: typedStudent.users?.email ?? null,
    phone: typedStudent.users?.phone ?? null,
    date_of_birth: typedStudent.date_of_birth ?? null,
    class_level: typedStudent.class_level ?? 0,
    parent_name: typedStudent.parent_name ?? null,
    parent_phone: typedStudent.parent_phone ?? null,
    current_points: typedStudent.current_points ?? 0,
    enrollments: scopedEnrollments.map((enrollment: ReportEnrollmentRow) => ({
      batch_name: enrollment.batches?.batch_name ?? '',
      centre_name: enrollment.batches?.centres?.centre_name ?? '',
      enrollment_date: enrollment.enrollment_date ?? '',
      status: enrollment.status ?? '',
    })),
  }

  const buffer = generateStudentProfilePDF(reportData)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="student_profile_${typedStudent.student_code || studentId}.pdf"`,
    },
  })
}, ['ceo', 'centre_head'])
