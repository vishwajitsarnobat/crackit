/**
 * Fees Task API
 * GET   — Returns batches, batch invoices, or invoice transactions.
 * POST  — Records a payment against an existing invoice.
 * PATCH — Applies reward-point redemption to an invoice as an auditable discount.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { recordPaymentSchema, updateDiscountSchema } from '@/lib/validations/data-entry'

type BatchRow = {
  id: string
  batch_name: string
  batch_code: string
  centres: { centre_name: string | null } | null
}

type InvoiceRow = {
  id: string
  student_id: string
  batch_id: string
  month_year: string
  monthly_fee: number
  amount_due: number
  amount_paid: number
  amount_discount: number
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue'
  students: {
    student_code: string | null
    current_points: number | null
    users: { full_name: string | null } | null
  } | null
  batches: { batch_name: string | null } | null
}

type TransactionRow = {
  id: string
  student_invoice_id: string
  payment_date: string
  amount: number
  payment_mode: 'cash' | 'online'
  collected_by: string | null
  receipt_number: string
  created_at: string
  users: { full_name: string | null } | null
}

type AllocationRow = {
  id: string
  student_invoice_id: string
  points_transaction_id: string | null
  allocation_amount: number
  created_by: string | null
  created_at: string
  users: { full_name: string | null } | null
  points_transactions: {
    reason: 'rule_award' | 'manual_adjustment' | 'manual_deduction' | 'redeemed' | 'redeemed_reversal' | null
    description: string | null
    month_year: string | null
  } | null
}

type ScopedInvoiceRow = {
  id: string
  student_id: string
  batch_id: string
  month_year: string
  amount_due: number
  amount_paid: number
  amount_discount: number
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue'
  batches: { centre_id: string | null } | null
}

type InvoiceAllocationSummaryRow = {
  student_invoice_id: string
  allocation_amount: number
}

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const batchId = searchParams.get('batch_id')
  const monthYear = searchParams.get('month_year')
  const status = searchParams.get('status')
  const invoiceId = searchParams.get('invoice_id')

  if (invoiceId) {
    const supabase = await createClient()
    const { data: invoice, error: invoiceError } = await supabase
      .from('student_invoices')
      .select('id, batch_id, batches!inner(centre_id)')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) return apiError('Invoice not found.', 404)
    if (!ctx.profile.centreIds.includes((invoice.batches as { centre_id: string | null } | null)?.centre_id ?? '')) {
      return apiError('You are not authorized to view this invoice.', 403)
    }

    const { data, error } = await supabase
      .from('fee_transactions')
      .select('id, student_invoice_id, payment_date, amount, payment_mode, collected_by, receipt_number, created_at, users!collected_by(full_name)')
      .eq('student_invoice_id', invoiceId)
      .order('payment_date', { ascending: false })

    if (error) return apiError(error.message, 500)

    const { data: allocationData, error: allocationError } = await supabase
      .from('invoice_reward_allocations')
      .select('id, student_invoice_id, points_transaction_id, allocation_amount, created_by, created_at, users!created_by(full_name), points_transactions(reason, description, month_year)')
      .eq('student_invoice_id', invoiceId)
      .order('created_at', { ascending: false })

    if (allocationError) return apiError(allocationError.message, 500)

    return apiSuccess({
      transactions: ((data ?? []) as unknown as TransactionRow[]).map((transaction) => ({
        ...transaction,
        collected_by_name: transaction.users?.full_name ?? null,
      })),
      reward_allocations: ((allocationData ?? []) as unknown as AllocationRow[]).map((allocation) => ({
        id: allocation.id,
        student_invoice_id: allocation.student_invoice_id,
        points_transaction_id: allocation.points_transaction_id,
        allocation_amount: Number(allocation.allocation_amount),
        created_by: allocation.created_by,
        created_by_name: allocation.users?.full_name ?? null,
        created_at: allocation.created_at,
        points_reason: allocation.points_transactions?.reason ?? null,
        points_description: allocation.points_transactions?.description ?? null,
        points_month_year: allocation.points_transactions?.month_year ?? null,
      })),
    })
  }

  if (!batchId) {
    const supabase = await createClient()
    let query = supabase
      .from('batches')
      .select('id, batch_name, batch_code, centre_id, centres!inner(centre_name)')
      .eq('is_active', true)
      .order('batch_name')

    query = query.in('centre_id', ctx.profile.centreIds)

    const { data, error } = await query
    if (error) return apiError(error.message, 500)

    const batches = ((data ?? []) as unknown as BatchRow[]).map((batch) => ({
      id: batch.id,
      batch_name: batch.batch_name,
      batch_code: batch.batch_code,
      centre_name: batch.centres?.centre_name ?? '',
    }))

    return apiSuccess({ batches })
  }

  const supabase = await createClient()

  const { data: batchScope, error: batchScopeError } = await supabase
    .from('batches')
    .select('id, centre_id')
    .eq('id', batchId)
    .single()

  if (batchScopeError || !batchScope) return apiError('Batch not found.', 404)
  if (!ctx.profile.centreIds.includes(batchScope.centre_id)) {
    return apiError('You are not authorized for this batch.', 403)
  }

  if (monthYear) {
    const { error: generationError } = await supabase.rpc('generate_student_invoices_for_month', {
      p_month_year: monthYear,
      p_batch_id: batchId,
    })

    if (generationError) return apiError(generationError.message, 500)
  }

  let query = supabase
    .from('student_invoices')
    .select('*, students!inner(student_code, current_points, users!inner(full_name)), batches!inner(batch_name)')
    .eq('batch_id', batchId)
    .order('month_year', { ascending: false })

  if (monthYear) query = query.eq('month_year', monthYear)
  if (status && status !== 'all') query = query.eq('payment_status', status)

  const { data, error } = await query
  if (error) return apiError(error.message, 500)

  const invoices = ((data ?? []) as unknown as InvoiceRow[]).map((invoice) => {
    const currentPoints = Number(invoice.students?.current_points ?? 0)
    const payableAmount = Math.max(0, Number(invoice.amount_due) - Number(invoice.amount_discount) - Number(invoice.amount_paid))

    return {
      id: invoice.id,
      student_id: invoice.student_id,
      student_name: invoice.students?.users?.full_name ?? 'Unknown',
      student_code: invoice.students?.student_code ?? null,
      batch_id: invoice.batch_id,
      batch_name: invoice.batches?.batch_name ?? '',
      month_year: invoice.month_year,
      monthly_fee: Number(invoice.monthly_fee),
      amount_due: Number(invoice.amount_due),
      amount_paid: Number(invoice.amount_paid),
      amount_discount: Number(invoice.amount_discount),
      current_points: currentPoints,
      payable_amount: payableAmount,
      payment_status: invoice.payment_status,
    }
  })

  return apiSuccess({ invoices })
}, ['centre_head', 'accountant'])

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const parsed = recordPaymentSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

  const adminClient = createAdminClient()
  const { data: invoice, error: invoiceError } = await adminClient
    .from('student_invoices')
    .select('id, amount_due, amount_paid, amount_discount, batch_id')
    .eq('id', parsed.data.student_invoice_id)
    .single()

  if (invoiceError || !invoice) return apiError('Invoice not found.', 404)

  const { data: batch, error: batchError } = await adminClient
    .from('batches')
    .select('centre_id')
    .eq('id', invoice.batch_id)
    .single()

  if (batchError || !batch || !ctx.profile.centreIds.includes(batch.centre_id)) {
    return apiError('You are not authorized to record payment for this invoice.', 403)
  }

  const remainingAmount = Math.max(0, Number(invoice.amount_due) - Number(invoice.amount_discount) - Number(invoice.amount_paid))
  if (parsed.data.amount > remainingAmount) {
    return apiError('Payment amount cannot exceed the remaining payable fee.', 400)
  }

  const { data, error } = await adminClient
    .from('fee_transactions')
    .insert({
      student_invoice_id: parsed.data.student_invoice_id,
      amount: parsed.data.amount,
      payment_mode: parsed.data.payment_mode,
      payment_date: parsed.data.payment_date || null,
      collected_by: ctx.user.id,
    })
    .select()
    .single()

  if (error) return apiError(error.message, 400)
  return apiSuccess({ transaction: data })
}, ['centre_head', 'accountant'])

export const PATCH = withAuth(async (request, ctx) => {
  const body = await request.json()
  const parsed = updateDiscountSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

  const adminClient = createAdminClient()
  const { data: student, error: studentError } = await adminClient
    .from('students')
    .select('id, current_points')
    .eq('id', parsed.data.student_id)
    .single()

  if (studentError || !student) return apiError('Student not found.', 404)

  const { data: invoiceRows, error: invoiceError } = await adminClient
    .from('student_invoices')
    .select('id, student_id, batch_id, month_year, amount_due, amount_paid, amount_discount, payment_status, batches!inner(centre_id)')
    .eq('student_id', parsed.data.student_id)
    .order('month_year', { ascending: true })

  if (invoiceError) return apiError(invoiceError.message, 400)

  const scopedInvoices = ((invoiceRows ?? []) as unknown as ScopedInvoiceRow[]).filter((invoice) => {
    const centreId = invoice.batches?.centre_id ?? ''
    return ctx.profile.centreIds.includes(centreId)
  })

  if (scopedInvoices.length === 0) {
    return apiError('You are not authorized to update reward allocation for this student.', 403)
  }

  const { data: allocationSummaryRows, error: allocationSummaryError } = await adminClient
    .from('invoice_reward_allocations')
    .select('student_invoice_id, allocation_amount')
    .in('student_invoice_id', scopedInvoices.map((invoice) => invoice.id))

  if (allocationSummaryError) return apiError(allocationSummaryError.message, 400)

  const allocationSummaryMap = new Map<string, number>()
  for (const row of ((allocationSummaryRows ?? []) as unknown as InvoiceAllocationSummaryRow[])) {
    allocationSummaryMap.set(
      row.student_invoice_id,
      Number((allocationSummaryMap.get(row.student_invoice_id) ?? 0) + Number(row.allocation_amount)),
    )
  }

  const baselineAllocations = scopedInvoices
    .filter((invoice) => Number(invoice.amount_discount) > 0 && !allocationSummaryMap.has(invoice.id))
    .map((invoice) => ({
      student_invoice_id: invoice.id,
      allocation_amount: Number(invoice.amount_discount),
      created_by: ctx.user.id,
    }))

  if (baselineAllocations.length > 0) {
    const { error: baselineError } = await adminClient
      .from('invoice_reward_allocations')
      .insert(baselineAllocations)

    if (baselineError) return apiError(baselineError.message, 400)
  }

  const currentAllocatedTotal = scopedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount_discount), 0)
  const currentPoints = Number(student.current_points ?? 0)
  const maxRedeemableByPoints = currentPoints + currentAllocatedTotal
  const maxRedeemableByOutstanding = scopedInvoices.reduce((sum, invoice) => {
    if (invoice.payment_status === 'paid') return sum
    return sum + Math.max(0, Number(invoice.amount_due) - Number(invoice.amount_paid))
  }, 0)

  const targetDiscountTotal = Math.max(0, Number(parsed.data.target_discount_total))
  if (targetDiscountTotal > maxRedeemableByPoints) {
    return apiError('Student does not have enough reward points for the requested allocation.', 400)
  }

  if (targetDiscountTotal > maxRedeemableByOutstanding) {
    return apiError('Reward allocation cannot exceed the student\'s remaining pending fee amount.', 400)
  }

  const eligibleInvoices = scopedInvoices
    .filter((invoice) => invoice.payment_status !== 'paid' || Number(invoice.amount_discount) > 0)
    .sort((left, right) => left.month_year.localeCompare(right.month_year))

  let remainingToAllocate = targetDiscountTotal
  const deltas = eligibleInvoices.map((invoice) => {
    const maxInvoiceAllocation = Math.max(0, Number(invoice.amount_due) - Number(invoice.amount_paid))
    const desiredAllocation = Math.min(maxInvoiceAllocation, remainingToAllocate)
    remainingToAllocate = Math.max(0, remainingToAllocate - desiredAllocation)
    const currentAllocation = Number(invoice.amount_discount)

    return {
      invoiceId: invoice.id,
      currentAllocation,
      desiredAllocation,
      delta: Number((desiredAllocation - currentAllocation).toFixed(2)),
    }
  }).filter((entry) => entry.delta !== 0)

  if (deltas.length === 0) {
    return apiSuccess({
      ok: true,
      target_discount_total: targetDiscountTotal,
      applied_discount_total: currentAllocatedTotal,
    })
  }

  const netDelta = Number((targetDiscountTotal - currentAllocatedTotal).toFixed(2))

  let pointsTransactionId: string | null = null
  if (netDelta !== 0) {
    const { data: pointsTransaction, error: pointsError } = await adminClient
      .from('points_transactions')
      .insert({
        student_id: parsed.data.student_id,
        points: netDelta > 0 ? -netDelta : Math.abs(netDelta),
        reason: netDelta > 0 ? 'redeemed' : 'redeemed_reversal',
        month_year: new Date().toISOString().slice(0, 10),
        created_by: ctx.user.id,
        description: netDelta > 0
          ? 'Applied reward points across pending fee invoices (oldest first).'
          : 'Reduced reward points allocation across pending fee invoices.',
      })
      .select('id')
      .single()

    if (pointsError || !pointsTransaction) {
      return apiError(pointsError?.message ?? 'Failed to record reward redemption.', 400)
    }

    pointsTransactionId = pointsTransaction.id
  }

  const allocationRows = deltas.map((entry) => ({
    student_invoice_id: entry.invoiceId,
    points_transaction_id: pointsTransactionId,
    allocation_amount: entry.delta,
    created_by: ctx.user.id,
  }))

  const { error: allocationError } = await adminClient
    .from('invoice_reward_allocations')
    .insert(allocationRows)

  if (allocationError) return apiError(allocationError.message, 400)

  const { data: refreshedInvoices, error: refreshedError } = await adminClient
    .from('student_invoices')
    .select('id, amount_discount')
    .in('id', eligibleInvoices.map((invoice) => invoice.id))

  if (refreshedError) return apiError(refreshedError.message, 400)

  const appliedDiscountTotal = (refreshedInvoices ?? []).reduce((sum, invoice) => sum + Number(invoice.amount_discount ?? 0), 0)

  return apiSuccess({
    ok: true,
    target_discount_total: targetDiscountTotal,
    applied_discount_total: appliedDiscountTotal,
    points_transaction_id: pointsTransactionId,
  })
}, ['centre_head', 'accountant'])
