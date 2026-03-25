/**
 * Salary Task API
 * GET  — Returns centres (no params) or generated salary rows for a centre with optional teacher/month/batch filters.
 * POST — Records immutable salary payment logs against generated monthly salary rows.
 */
import { createClient } from '@/lib/supabase/server'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { saveSalariesSchema } from '@/lib/validations/data-entry'

type CentreRow = {
  id: string
  centre_name: string
  centre_code: string
}

type SalaryRow = {
  id: string
  user_id: string
  centre_id: string
  month_year: string
  amount_due: number
  amount_paid: number
  status: 'paid' | 'unpaid' | 'partial'
  payment_date: string | null
  assignment_snapshot: Array<{
    assignment_id: string
    batch_id: string
    batch_name: string
    subject: string | null
    monthly_salary: number
    assignment_start_date: string
    assignment_end_date: string | null
  }>
  users: { full_name: string | null } | null
}

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const centreId = searchParams.get('centre_id')
  const monthYear = searchParams.get('month_year')
  const teacherId = searchParams.get('teacher_id')
  const batchId = searchParams.get('batch_id')

  const supabase = await createClient()

  if (!centreId) {
    let query = supabase
      .from('centres')
      .select('id, centre_name, centre_code')
      .eq('is_active', true)
      .order('centre_name')

    if (ctx.profile.role !== 'ceo') {
      query = query.in('id', ctx.profile.centreIds)
    }

    const { data, error } = await query
    if (error) return apiError(error.message, 500)
    return apiSuccess({ centres: (data ?? []) as CentreRow[] })
  }

  if (!ctx.profile.centreIds.includes(centreId)) {
    return apiError('You are not authorized for this centre.', 403)
  }

  if (batchId) {
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id, centre_id')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) return apiError('Batch not found.', 404)
    if (batch.centre_id !== centreId) {
      return apiError('Batch does not belong to the selected centre.', 400)
    }
  }

  if (monthYear) {
    const { error: generationError } = await supabase.rpc('generate_staff_salaries_for_month', {
      p_month_year: monthYear,
      p_centre_id: centreId,
    })

    if (generationError) return apiError(generationError.message, 500)
  }

  let salaryQuery = supabase
    .from('staff_salaries')
    .select('id, user_id, centre_id, month_year, amount_due, amount_paid, status, payment_date, assignment_snapshot, users(full_name)')
    .eq('centre_id', centreId)
    .order('month_year', { ascending: false })

  if (monthYear) salaryQuery = salaryQuery.eq('month_year', monthYear)
  if (teacherId) salaryQuery = salaryQuery.eq('user_id', teacherId)

  const { data: salaries, error: salaryError } = await salaryQuery
  if (salaryError) return apiError(salaryError.message, 500)

  let salaryRows = (salaries ?? []) as unknown as SalaryRow[]
  if (batchId) {
    salaryRows = salaryRows.filter((salary) =>
      salary.assignment_snapshot.some((assignment) => assignment.batch_id === batchId),
    )
  }

  const salaryIds = salaryRows.map((salary) => salary.id)
  const { data: payments, error: paymentsError } = salaryIds.length === 0
    ? { data: [], error: null }
    : await supabase
        .from('staff_salary_payments')
        .select('id, staff_salary_id, payment_date, amount, description, recorded_by, created_at, users!recorded_by(full_name)')
        .in('staff_salary_id', salaryIds)
        .order('payment_date', { ascending: false })

  if (paymentsError) return apiError(paymentsError.message, 500)

  const staff = salaryRows.map((salary) => ({
    id: salary.id,
    user_id: salary.user_id,
    staff_name: salary.users?.full_name ?? 'Unknown',
    centre_id: salary.centre_id,
    month_year: salary.month_year,
    amount_due: Number(salary.amount_due),
    amount_paid: Number(salary.amount_paid),
    status: salary.status,
    payment_date: salary.payment_date,
    assignment_snapshot: salary.assignment_snapshot ?? [],
  }))

  return apiSuccess({
    staff,
    payments: ((payments ?? []) as Array<{
      id: string
      staff_salary_id: string
      payment_date: string
      amount: number
      description: string | null
      recorded_by: string | null
      created_at: string
      users?: { full_name: string | null } | null
    }>).map((payment) => ({
      ...payment,
      recorded_by_name: payment.users?.full_name ?? null,
    })),
  })
}, ['centre_head', 'accountant'])

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const parsed = saveSalariesSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

  const { centre_id, month_year, salaries } = parsed.data
  if (!ctx.profile.centreIds.includes(centre_id)) {
    return apiError('You are not authorized for this centre.', 403)
  }

  const supabase = await createClient()

  const salaryIds = salaries.map((salary) => salary.salary_id)
  const { data: existingRows, error: existingError } = await supabase
    .from('staff_salaries')
    .select('id, centre_id, month_year, amount_due, amount_paid')
    .in('id', salaryIds)

  if (existingError) return apiError(existingError.message, 500)

  const salaryMap = new Map((existingRows ?? []).map((row) => [row.id, row]))

  for (const salaryInput of salaries) {
    const existing = salaryMap.get(salaryInput.salary_id)

    if (!existing) return apiError('Salary record not found.', 404)
    if (existing.centre_id !== centre_id || existing.month_year !== month_year) {
      return apiError('Salary record does not belong to the selected centre/month.', 400)
    }

    const currentPaid = Number(existing.amount_paid)
    const targetPaid = Number(salaryInput.target_paid_amount)
    const amountDue = Number(existing.amount_due)

    if (targetPaid < currentPaid) {
      return apiError('Paid amount cannot be reduced because salary payments are immutable.', 400)
    }

    if (targetPaid > amountDue) {
      return apiError('Paid amount cannot exceed amount due.', 400)
    }
  }

  const paymentsToInsert = salaries
    .map((salaryInput) => {
      const existing = salaryMap.get(salaryInput.salary_id)
      if (!existing) return null

      const delta = Number(salaryInput.target_paid_amount) - Number(existing.amount_paid)
      if (delta <= 0) return null

      return {
        staff_salary_id: salaryInput.salary_id,
        payment_date: salaryInput.payment_date || null,
        amount: delta,
        description: salaryInput.description?.trim() || null,
        recorded_by: ctx.user.id,
      }
    })
    .filter((payment): payment is NonNullable<typeof payment> => payment !== null)

  if (paymentsToInsert.length === 0) {
    return apiSuccess({ ok: true, count: 0 })
  }

  const { error } = await supabase.from('staff_salary_payments').insert(paymentsToInsert)
  if (error) return apiError(error.message, 400)

  return apiSuccess({ ok: true, count: paymentsToInsert.length })
}, ['centre_head', 'accountant'])
