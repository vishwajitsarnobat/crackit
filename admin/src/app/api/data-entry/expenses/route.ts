/**
 * Expenses Task API
 * GET  — Returns centres (no params) or append-only expense entries for a centre + month.
 * POST — Appends new expense records only.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { saveExpensesSchema } from '@/lib/validations/data-entry'

type CentreRow = {
  id: string
  centre_name: string
  centre_code: string
}

type ExpenseRow = {
  id: string
  centre_id: string
  month_year: string
  category: 'rent' | 'electricity_bill' | 'stationery' | 'internet_bill' | 'miscellaneous'
  amount: number
  description: string | null
  entered_by: string | null
  created_at: string
  users: { full_name: string | null } | null
}

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const centreId = searchParams.get('centre_id')
  const monthYear = searchParams.get('month_year')

  if (!centreId) {
    const supabase = await createClient()
    let query = supabase
      .from('centres')
      .select('id, centre_name, centre_code')
      .eq('is_active', true)
      .order('centre_name')

    query = query.in('id', ctx.profile.centreIds)

    const { data, error } = await query
    if (error) return apiError(error.message, 500)
    return apiSuccess({ centres: (data ?? []) as CentreRow[] })
  }

  if (!ctx.profile.centreIds.includes(centreId)) {
    return apiError('You are not authorized for this centre.', 403)
  }

  const supabase = await createClient()
  if (!monthYear) {
    const { data, error } = await supabase
      .from('centre_expenses')
      .select('id, centre_id, month_year, category, amount, description, entered_by, created_at, users!entered_by(full_name)')
      .eq('centre_id', centreId)
      .order('month_year', { ascending: false })

    if (error) return apiError(error.message, 500)

    const expenseRows = (data ?? []) as ExpenseRow[]
    const summaryMap = new Map<string, { month_year: string; total: number; count: number; categories: Record<string, number> }>()

    for (const row of expenseRows) {
      const existing = summaryMap.get(row.month_year) ?? {
        month_year: row.month_year,
        total: 0,
        count: 0,
        categories: {},
      }
      existing.total += Number(row.amount)
      existing.count += 1
      existing.categories[row.category] = (existing.categories[row.category] ?? 0) + Number(row.amount)
      summaryMap.set(row.month_year, existing)
    }

    return apiSuccess({ months: Array.from(summaryMap.values()) })
  }

  const { data, error } = await supabase
    .from('centre_expenses')
    .select('id, centre_id, month_year, category, amount, description, entered_by, created_at, users!entered_by(full_name)')
    .eq('centre_id', centreId)
    .eq('month_year', monthYear)
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 500)
  return apiSuccess({
    expenses: ((data ?? []) as unknown as ExpenseRow[]).map((expense) => ({
      ...expense,
      entered_by_name: expense.users?.full_name ?? null,
    })),
  })
}, ['centre_head', 'accountant'])

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const parsed = saveExpensesSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

  const { centre_id, month_year, expenses } = parsed.data
  if (!ctx.profile.centreIds.includes(centre_id)) {
    return apiError('You are not authorized for this centre.', 403)
  }

  const adminClient = createAdminClient()

  const insertData = expenses.map((expense) => ({
    centre_id,
    month_year,
    category: expense.category,
    amount: expense.amount,
    description: expense.description?.trim() || null,
    entered_by: ctx.user.id,
  }))

  const { data, error } = await adminClient
    .from('centre_expenses')
    .insert(insertData)
    .select('id')

  if (error) return apiError(error.message, 400)
  return apiSuccess({ ok: true, count: data?.length ?? insertData.length })
}, ['centre_head', 'accountant'])
