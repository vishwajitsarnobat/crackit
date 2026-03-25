/**
 * Financial Analytics API
 * GET — Returns KPI summary, sorted expense breakdown, yearly expense trend, salary summaries, and fee summaries.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { endOfMonth, format, startOfMonth } from 'date-fns'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserContext } from '@/lib/auth/current-user'

type AllowedRole = 'ceo' | 'centre_head' | 'accountant'
type CentreRow = { id: string; centre_name: string }
type BatchRow = { id: string; batch_name: string; centre_id: string }

function isAllowed(role: string | null): role is AllowedRole {
  return role === 'ceo' || role === 'centre_head' || role === 'accountant'
}

export async function GET(request: NextRequest) {
  const context = await getCurrentUserContext()
  if (!context?.isActive || !isAllowed(context.role)) {
    return NextResponse.json({ error: 'You are not allowed to view financial analytics.' }, { status: 403 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const centreId = searchParams.get('centreId') || ''
  const month = searchParams.get('month') || format(new Date(), 'yyyy-MM')
  const year = Number(searchParams.get('year') || new Date().getFullYear())

  let centres: CentreRow[] = []
  if (context.role === 'ceo') {
    const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
    centres = (data ?? []) as CentreRow[]
  } else {
    const { data } = await supabase
      .from('user_centre_assignments')
      .select('centres!inner(id, centre_name)')
      .eq('user_id', context.userId)
      .eq('is_active', true)
    centres = (data ?? []).map((row: { centres: CentreRow | CentreRow[] | null }) => (Array.isArray(row.centres) ? row.centres[0] : row.centres) as CentreRow).filter(Boolean)
  }

  const allowedCentreIds = new Set(centres.map((centre) => centre.id))
  if (centreId && !allowedCentreIds.has(centreId)) {
    return NextResponse.json({ error: 'You are not allowed to view financial analytics for this centre.' }, { status: 403 })
  }

  const scopedCentreId = centreId || centres[0]?.id || ''
  if (!scopedCentreId) {
    return NextResponse.json({
      filters: { centres: [], batches: [] },
      summary: { totalCollected: 0, pendingDues: 0, totalExpenses: 0, salaryPaid: 0 },
      expenseBreakdown: [],
      yearlyExpenseTrend: [],
      salarySummaries: [],
      feeSummaries: [],
    })
  }

  const { data: batchData, error: batchError } = await supabase
    .from('batches')
    .select('id, batch_name, centre_id')
    .eq('centre_id', scopedCentreId)
    .eq('is_active', true)
    .order('batch_name')

  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 400 })
  const batches = (batchData ?? []) as BatchRow[]

  const monthStart = startOfMonth(new Date(`${month}-01T00:00:00`))
  const monthStartStr = format(monthStart, 'yyyy-MM-dd')
  const monthEndStr = format(endOfMonth(monthStart), 'yyyy-MM-dd')

  const { data: expenseRows, error: expenseError } = await supabase
    .from('centre_expenses')
    .select('id, centre_id, month_year, category, amount, description, entered_by, created_at')
    .eq('centre_id', scopedCentreId)
    .eq('month_year', monthStartStr)

  if (expenseError) return NextResponse.json({ error: expenseError.message }, { status: 400 })

  const { data: salaryRows, error: salaryError } = await supabase
    .from('staff_salaries')
    .select('id, user_id, centre_id, month_year, amount_due, amount_paid, status, payment_date, assignment_snapshot, users(full_name)')
    .eq('centre_id', scopedCentreId)
    .lte('month_year', monthEndStr)
    .order('month_year', { ascending: false })

  if (salaryError) return NextResponse.json({ error: salaryError.message }, { status: 400 })

  const { data: invoiceRows, error: invoiceError } = await supabase
    .from('student_invoices')
    .select('id, student_id, batch_id, month_year, amount_due, amount_paid, amount_discount, payment_status, batches!inner(batch_name, centre_id), students!inner(student_code, current_points, users!inner(full_name))')
    .in('batch_id', batches.map((batch) => batch.id))
    .lte('month_year', monthEndStr)
    .order('month_year', { ascending: false })

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 400 })

  const totalCollected = (invoiceRows ?? []).filter((row: { month_year: string }) => row.month_year === monthStartStr).reduce((sum: number, row: { amount_paid: number }) => sum + Number(row.amount_paid), 0)
  const pendingDues = (invoiceRows ?? []).reduce((sum: number, row: { amount_due: number; amount_paid: number; amount_discount: number }) => sum + Math.max(0, Number(row.amount_due) - Number(row.amount_paid) - Number(row.amount_discount)), 0)
  const totalExpenses = (expenseRows ?? []).reduce((sum: number, row: { amount: number }) => sum + Number(row.amount), 0)
  const salaryPaid = (salaryRows ?? []).filter((row: { month_year: string }) => row.month_year === monthStartStr).reduce((sum: number, row: { amount_paid: number }) => sum + Number(row.amount_paid), 0)

  const expenseBreakdownMap = new Map<string, number>()
  for (const row of (expenseRows ?? []) as Array<{ category: string; amount: number }>) {
    expenseBreakdownMap.set(row.category, (expenseBreakdownMap.get(row.category) ?? 0) + Number(row.amount))
  }
  const expenseBreakdown = Array.from(expenseBreakdownMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))

  const { data: yearlyExpenseRows, error: yearlyExpenseError } = await supabase
    .from('centre_expenses')
    .select('month_year, amount')
    .eq('centre_id', scopedCentreId)
    .gte('month_year', `${year}-01-01`)
    .lte('month_year', `${year}-12-31`)
    .order('month_year', { ascending: true })

  if (yearlyExpenseError) return NextResponse.json({ error: yearlyExpenseError.message }, { status: 400 })

  const yearMap = new Map<string, number>()
  for (let monthIndex = 1; monthIndex <= 12; monthIndex += 1) {
    yearMap.set(`${year}-${String(monthIndex).padStart(2, '0')}`, 0)
  }
  for (const row of (yearlyExpenseRows ?? []) as Array<{ month_year: string; amount: number }>) {
    const key = row.month_year.slice(0, 7)
    yearMap.set(key, (yearMap.get(key) ?? 0) + Number(row.amount))
  }
  const yearlyExpenseTrend = Array.from(yearMap.entries()).map(([monthKey, amount]) => ({
    month: monthKey,
    expense: amount,
    running_total: Array.from(yearMap.entries()).filter(([key]) => key <= monthKey).reduce((sum, [, value]) => sum + value, 0),
  }))

  const salarySummaryMap = new Map<string, {
    teacher_id: string
    teacher_name: string
    paid_till: string | null
    pending_months: string[]
    total_pending_amount: number
    batch_names: string[]
  }>()

  for (const row of (salaryRows ?? []) as Array<{ user_id: string; month_year: string; amount_due: number; amount_paid: number; status: string; assignment_snapshot: Array<{ batch_name: string }>; users: { full_name: string | null } | null }>) {
    const existing = salarySummaryMap.get(row.user_id) ?? {
      teacher_id: row.user_id,
      teacher_name: row.users?.full_name ?? 'Unknown',
      paid_till: null,
      pending_months: [],
      total_pending_amount: 0,
      batch_names: [],
    }

    if (row.status === 'paid') {
      if (!existing.paid_till || row.month_year > existing.paid_till) existing.paid_till = row.month_year
    } else {
      existing.pending_months.push(row.month_year)
      existing.total_pending_amount += Math.max(0, Number(row.amount_due) - Number(row.amount_paid))
    }

    for (const assignment of row.assignment_snapshot ?? []) {
      if (!existing.batch_names.includes(assignment.batch_name)) existing.batch_names.push(assignment.batch_name)
    }

    salarySummaryMap.set(row.user_id, existing)
  }

  const feeSummaryMap = new Map<string, {
    student_id: string
    student_name: string
    student_code: string | null
    paid_till: string | null
    pending_months: string[]
    total_pending_amount: number
    batch_names: string[]
  }>()

  for (const row of (invoiceRows ?? []) as Array<{ student_id: string; month_year: string; amount_due: number; amount_paid: number; amount_discount: number; payment_status: string; batches: { batch_name: string } | { batch_name: string }[] | null; students: { student_code: string | null; users: { full_name: string | null } | null } | { student_code: string | null; users: { full_name: string | null } | null }[] | null }>) {
    const studentInfo = Array.isArray(row.students) ? row.students[0] : row.students
    const batchInfo = Array.isArray(row.batches) ? row.batches[0] : row.batches
    const existing = feeSummaryMap.get(row.student_id) ?? {
      student_id: row.student_id,
      student_name: studentInfo?.users?.full_name ?? 'Unknown',
      student_code: studentInfo?.student_code ?? null,
      paid_till: null,
      pending_months: [],
      total_pending_amount: 0,
      batch_names: [],
    }

    if (row.payment_status === 'paid') {
      if (!existing.paid_till || row.month_year > existing.paid_till) existing.paid_till = row.month_year
    } else {
      existing.pending_months.push(row.month_year)
      existing.total_pending_amount += Math.max(0, Number(row.amount_due) - Number(row.amount_paid) - Number(row.amount_discount))
    }
    if (batchInfo?.batch_name && !existing.batch_names.includes(batchInfo.batch_name)) existing.batch_names.push(batchInfo.batch_name)

    feeSummaryMap.set(row.student_id, existing)
  }

  return NextResponse.json({
    filters: { centres, batches },
    summary: { totalCollected, pendingDues, totalExpenses, salaryPaid },
    expenseBreakdown,
    yearlyExpenseTrend,
    salarySummaries: Array.from(salarySummaryMap.values()).sort((left, right) => left.teacher_name.localeCompare(right.teacher_name)),
    feeSummaries: Array.from(feeSummaryMap.values()).sort((left, right) => left.student_name.localeCompare(right.student_name)),
  })
}
