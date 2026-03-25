import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { manualRewardAdjustmentSchema } from '@/lib/validations/manage'

type StudentSummaryRow = {
  student_id: string
  batch_id: string
  students: {
    student_code: string | null
    current_points: number | null
    users: { full_name: string | null } | null
  } | null
  batches: {
    batch_name: string | null
    centre_id: string | null
  } | null
}

type RewardLedgerRow = {
  id: string
  student_id: string
  points: number
  reason: string
  description: string | null
  reward_rule_id: string | null
  reference_id: string | null
  month_year: string | null
  created_by: string | null
  created_at: string
}

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('student_id')
  const centreId = searchParams.get('centre_id')
  const batchId = searchParams.get('batch_id')
  const search = searchParams.get('search')?.trim().toLowerCase() ?? ''

  const adminClient = createAdminClient()

  let batchQuery = adminClient.from('batches').select('id, centre_id').eq('is_active', true)
  if (ctx.profile.role === 'centre_head') {
    batchQuery = batchQuery.in('centre_id', ctx.profile.centreIds)
  } else if (centreId) {
    batchQuery = batchQuery.eq('centre_id', centreId)
  }

  if (batchId) batchQuery = batchQuery.eq('id', batchId)

  const { data: batchRows, error: batchError } = await batchQuery
  if (batchError) return apiError(batchError.message, 500)

  const batchIds = (batchRows ?? []).map((batch) => batch.id)
  if (batchIds.length === 0) {
    return apiSuccess(studentId ? { student: null, transactions: [] } : { students: [] })
  }

  let summaryQuery = adminClient
    .from('student_batch_enrollments')
    .select('student_id, batch_id, students!inner(student_code, current_points, users!inner(full_name)), batches!inner(batch_name, centre_id)')
    .eq('is_active', true)
    .in('batch_id', batchIds)

  if (studentId) summaryQuery = summaryQuery.eq('student_id', studentId)

  const { data: enrollmentRows, error: summaryError } = await summaryQuery
  if (summaryError) return apiError(summaryError.message, 500)

  const summaries = new Map<string, {
    student_id: string
    student_name: string
    student_code: string | null
    current_points: number
    batch_names: string[]
    centre_ids: string[]
  }>()

  for (const row of (enrollmentRows ?? []) as StudentSummaryRow[]) {
    const name = row.students?.users?.full_name ?? 'Unknown'
    if (search && !name.toLowerCase().includes(search) && !(row.students?.student_code ?? '').toLowerCase().includes(search)) {
      continue
    }

    const existing = summaries.get(row.student_id) ?? {
      student_id: row.student_id,
      student_name: name,
      student_code: row.students?.student_code ?? null,
      current_points: Number(row.students?.current_points ?? 0),
      batch_names: [],
      centre_ids: [],
    }

    if (row.batches?.batch_name && !existing.batch_names.includes(row.batches.batch_name)) {
      existing.batch_names.push(row.batches.batch_name)
    }

    if (row.batches?.centre_id && !existing.centre_ids.includes(row.batches.centre_id)) {
      existing.centre_ids.push(row.batches.centre_id)
    }

    summaries.set(row.student_id, existing)
  }

  if (!studentId) {
    return apiSuccess({ students: Array.from(summaries.values()) })
  }

  const summary = summaries.get(studentId)
  if (!summary) return apiSuccess({ student: null, transactions: [] })

  const { data: ledgerData, error: ledgerError } = await adminClient
    .from('points_transactions')
    .select('id, student_id, points, reason, description, reward_rule_id, reference_id, month_year, created_by, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (ledgerError) return apiError(ledgerError.message, 500)

  return apiSuccess({
    student: summary,
    transactions: (ledgerData ?? []) as RewardLedgerRow[],
  })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const parsed = manualRewardAdjustmentSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
  }

  const adminClient = createAdminClient()
  const { data: studentEnrollment, error: enrollmentError } = await adminClient
    .from('student_batch_enrollments')
    .select('student_id, batches!inner(centre_id)')
    .eq('student_id', parsed.data.student_id)
    .eq('is_active', true)

  if (enrollmentError) return apiError(enrollmentError.message, 500)

  if (ctx.profile.role === 'centre_head') {
    const allowed = (studentEnrollment ?? []).some((row) => ctx.profile.centreIds.includes((row.batches as { centre_id: string | null } | null)?.centre_id ?? ''))
    if (!allowed) return apiError('You are not allowed to modify points for this student.', 403)
  }

  const pointsDelta = parsed.data.points_delta
  const { data, error } = await adminClient
    .from('points_transactions')
    .insert({
      student_id: parsed.data.student_id,
      points: pointsDelta,
      reason: pointsDelta > 0 ? 'manual_adjustment' : 'manual_deduction',
      description: parsed.data.description.trim(),
      created_by: ctx.user.id,
      month_year: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()

  if (error) return apiError(error.message, 400)

  return apiSuccess({ transaction: data })
}, ['ceo', 'centre_head'])
