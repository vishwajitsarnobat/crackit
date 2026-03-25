import { endOfMonth } from 'date-fns'

import { createAdminClient } from '@/lib/supabase/admin'

export type RewardRuleRow = {
  id: string
  rule_name: string
  description: string | null
  trigger_type: 'attendance' | 'perfect_attendance' | 'attendance_streak' | 'performance' | 'timely_fee_payment'
  award_frequency: 'monthly'
  scope_type: 'global' | 'centre' | 'batch'
  centre_id: string | null
  batch_id: string | null
  points_awarded: number
  criteria: Record<string, unknown>
  is_active: boolean
}

type BatchRow = { id: string; centre_id: string; batch_name: string }
type AttendanceRow = { student_id: string; status: 'present' | 'absent'; batch_id: string }
type ExamRow = { id: string; total_marks: number; subject: string | null; batch_id: string }
type MarkRow = { student_id: string; marks_obtained: number; is_absent: boolean; exam_id: string }
type InvoiceRow = {
  id: string
  student_id: string
  amount_due: number
  amount_discount: number
  payment_status: string
  batch_id: string
}
type FeeTransactionRow = {
  student_invoice_id: string
  amount: number
  payment_date: string | null
}

function getMonthBounds(monthYear: string) {
  const start = new Date(`${monthYear.slice(0, 7)}-01T00:00:00`)
  return {
    start: start.toISOString().slice(0, 10),
    end: endOfMonth(start).toISOString().slice(0, 10),
  }
}

function getSettledOnDate(invoice: InvoiceRow, transactions: FeeTransactionRow[]) {
  const payableAmount = Math.max(0, Number(invoice.amount_due) - Number(invoice.amount_discount))
  if (payableAmount === 0) return null

  let runningTotal = 0
  const orderedTransactions = [...transactions]
    .filter((transaction) => transaction.payment_date)
    .sort((left, right) => {
      if (left.payment_date === right.payment_date) return 0
      return (left.payment_date ?? '') < (right.payment_date ?? '') ? -1 : 1
    })

  for (const transaction of orderedTransactions) {
    runningTotal += Number(transaction.amount)
    if (runningTotal >= payableAmount) {
      return transaction.payment_date
    }
  }

  return null
}

function getFirstPaymentOnDate(transactions: FeeTransactionRow[]) {
  const orderedTransactions = [...transactions]
    .filter((transaction) => transaction.payment_date && Number(transaction.amount) > 0)
    .sort((left, right) => {
      if (left.payment_date === right.payment_date) return 0
      return (left.payment_date ?? '') < (right.payment_date ?? '') ? -1 : 1
    })

  return orderedTransactions[0]?.payment_date ?? null
}

async function resolveScopedBatches(adminClient: ReturnType<typeof createAdminClient>, rule: RewardRuleRow) {
  let query = adminClient.from('batches').select('id, centre_id, batch_name').eq('is_active', true)

  if (rule.scope_type === 'centre' && rule.centre_id) {
    query = query.eq('centre_id', rule.centre_id)
  }

  if (rule.scope_type === 'batch' && rule.batch_id) {
    query = query.eq('id', rule.batch_id)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []) as BatchRow[]
}

export async function getEligibleStudents(adminClient: ReturnType<typeof createAdminClient>, rule: RewardRuleRow, monthYear: string) {
  const batches = await resolveScopedBatches(adminClient, rule)
  const batchIds = batches.map((batch) => batch.id)
  if (batchIds.length === 0) return [] as Array<{ student_id: string; source_reference_id: string | null; metadata: Record<string, unknown> }>

  const { start, end } = getMonthBounds(monthYear)

  if (rule.trigger_type === 'attendance') {
    const minimumPercentage = Number(rule.criteria.minimum_percentage ?? 85)
    const { data, error } = await adminClient
      .from('attendance')
      .select('student_id, status, batch_id')
      .in('batch_id', batchIds)
      .gte('attendance_date', start)
      .lte('attendance_date', end)

    if (error) throw new Error(error.message)

    const studentStats = new Map<string, { total: number; present: number; batch_id: string }>()
    for (const row of (data ?? []) as AttendanceRow[]) {
      const stat = studentStats.get(row.student_id) ?? { total: 0, present: 0, batch_id: row.batch_id }
      stat.total += 1
      if (row.status === 'present') stat.present += 1
      studentStats.set(row.student_id, stat)
    }

    return Array.from(studentStats.entries())
      .filter(([, stat]) => stat.total > 0 && (stat.present / stat.total) * 100 >= minimumPercentage)
      .map(([studentId, stat]) => ({
        student_id: studentId,
        source_reference_id: null,
        metadata: {
          batch_id: stat.batch_id,
          present_count: stat.present,
          total_count: stat.total,
          percentage: Number(((stat.present / stat.total) * 100).toFixed(2)),
        },
      }))
  }

  if (rule.trigger_type === 'perfect_attendance') {
    const minimumDays = Number(rule.criteria.minimum_days ?? 1)
    const { data, error } = await adminClient
      .from('attendance')
      .select('student_id, status, batch_id')
      .in('batch_id', batchIds)
      .gte('attendance_date', start)
      .lte('attendance_date', end)

    if (error) throw new Error(error.message)

    const studentStats = new Map<string, { total: number; present: number; batch_id: string }>()
    for (const row of (data ?? []) as AttendanceRow[]) {
      const stat = studentStats.get(row.student_id) ?? { total: 0, present: 0, batch_id: row.batch_id }
      stat.total += 1
      if (row.status === 'present') stat.present += 1
      studentStats.set(row.student_id, stat)
    }

    return Array.from(studentStats.entries())
      .filter(([, stat]) => stat.total >= minimumDays && stat.present === stat.total)
      .map(([studentId, stat]) => ({
        student_id: studentId,
        source_reference_id: null,
        metadata: {
          batch_id: stat.batch_id,
          present_count: stat.present,
          total_count: stat.total,
          rule_variant: 'perfect_attendance',
        },
      }))
  }

  if (rule.trigger_type === 'attendance_streak') {
    const minimumStreakDays = Number(rule.criteria.minimum_streak_days ?? 5)
    const { data, error } = await adminClient
      .from('attendance')
      .select('student_id, status, batch_id, attendance_date')
      .in('batch_id', batchIds)
      .gte('attendance_date', start)
      .lte('attendance_date', end)
      .order('attendance_date', { ascending: true })

    if (error) throw new Error(error.message)

    const streaks = new Map<string, { batch_id: string; best: number; current: number }>()
    for (const row of (data ?? []) as Array<AttendanceRow & { attendance_date: string }>) {
      const stat = streaks.get(row.student_id) ?? { batch_id: row.batch_id, best: 0, current: 0 }
      if (row.status === 'present') {
        stat.current += 1
        stat.best = Math.max(stat.best, stat.current)
      } else {
        stat.current = 0
      }
      streaks.set(row.student_id, stat)
    }

    return Array.from(streaks.entries())
      .filter(([, stat]) => stat.best >= minimumStreakDays)
      .map(([studentId, stat]) => ({
        student_id: studentId,
        source_reference_id: null,
        metadata: {
          batch_id: stat.batch_id,
          best_streak_days: stat.best,
          minimum_streak_days: minimumStreakDays,
          rule_variant: 'attendance_streak',
        },
      }))
  }

  if (rule.trigger_type === 'performance') {
    const minimumPercentage = Number(rule.criteria.minimum_percentage ?? 75)
    const subject = typeof rule.criteria.subject === 'string' ? rule.criteria.subject : null

    let examQuery = adminClient
      .from('exams')
      .select('id, total_marks, subject, batch_id')
      .in('batch_id', batchIds)
      .gte('exam_date', start)
      .lte('exam_date', end)

    if (subject) examQuery = examQuery.eq('subject', subject)

    const { data: examData, error: examError } = await examQuery
    if (examError) throw new Error(examError.message)

    const exams = (examData ?? []) as ExamRow[]
    const examIds = exams.map((exam) => exam.id)
    if (examIds.length === 0) return []

    const examMap = new Map(exams.map((exam) => [exam.id, exam]))
    const { data: marksData, error: marksError } = await adminClient
      .from('student_marks')
      .select('student_id, marks_obtained, is_absent, exam_id')
      .in('exam_id', examIds)

    if (marksError) throw new Error(marksError.message)

    const studentStats = new Map<string, { totalPercentage: number; count: number; batch_id: string }>()
    for (const row of (marksData ?? []) as MarkRow[]) {
      const exam = examMap.get(row.exam_id)
      if (!exam) continue

      const percentage = row.is_absent ? 0 : (Number(row.marks_obtained) / Number(exam.total_marks)) * 100
      const stat = studentStats.get(row.student_id) ?? { totalPercentage: 0, count: 0, batch_id: exam.batch_id }
      stat.totalPercentage += percentage
      stat.count += 1
      studentStats.set(row.student_id, stat)
    }

    return Array.from(studentStats.entries())
      .filter(([, stat]) => stat.count > 0 && stat.totalPercentage / stat.count >= minimumPercentage)
      .map(([studentId, stat]) => ({
        student_id: studentId,
        source_reference_id: null,
        metadata: {
          batch_id: stat.batch_id,
          average_percentage: Number((stat.totalPercentage / stat.count).toFixed(2)),
          exam_count: stat.count,
          subject,
        },
      }))
  }

  const dueDayOfMonth = Number(rule.criteria.due_day_of_month ?? 31)
  const requireFullPaymentByDueDate = rule.criteria.require_full_payment_by_due_date !== false
  const dueCutoffDate = new Date(`${start}T00:00:00`)
  dueCutoffDate.setDate(Math.min(dueDayOfMonth, endOfMonth(dueCutoffDate).getDate()))
  const dueCutoff = dueCutoffDate.toISOString().slice(0, 10)

  const { data, error } = await adminClient
    .from('student_invoices')
    .select('id, student_id, amount_due, amount_discount, payment_status, batch_id')
    .in('batch_id', batchIds)
    .eq('month_year', start)

  if (error) throw new Error(error.message)

  const invoices = (data ?? []) as InvoiceRow[]
  if (invoices.length === 0) return []

  const invoiceIds = invoices.map((invoice) => invoice.id)
  const { data: feeTransactionData, error: feeTransactionError } = await adminClient
    .from('fee_transactions')
    .select('student_invoice_id, amount, payment_date')
    .in('student_invoice_id', invoiceIds)
    .order('payment_date', { ascending: true })

  if (feeTransactionError) throw new Error(feeTransactionError.message)

  const transactionsByInvoice = new Map<string, FeeTransactionRow[]>()
  for (const transaction of (feeTransactionData ?? []) as FeeTransactionRow[]) {
    const existing = transactionsByInvoice.get(transaction.student_invoice_id) ?? []
    existing.push(transaction)
    transactionsByInvoice.set(transaction.student_invoice_id, existing)
  }

  return invoices
    .map((invoice) => ({
      invoice,
      settledOn: getSettledOnDate(invoice, transactionsByInvoice.get(invoice.id) ?? []),
      firstPaymentOn: getFirstPaymentOnDate(transactionsByInvoice.get(invoice.id) ?? []),
    }))
    .filter(({ invoice, settledOn, firstPaymentOn }) => {
      if (requireFullPaymentByDueDate) {
        return invoice.payment_status === 'paid' && settledOn !== null && settledOn <= dueCutoff
      }

      return firstPaymentOn !== null && firstPaymentOn <= dueCutoff
    })
    .map(({ invoice, settledOn, firstPaymentOn }) => ({
      student_id: invoice.student_id,
      source_reference_id: invoice.id,
      metadata: {
        batch_id: invoice.batch_id,
        invoice_id: invoice.id,
        settled_on: settledOn,
        first_payment_on: firstPaymentOn,
        due_cutoff: dueCutoff,
        require_full_payment_by_due_date: requireFullPaymentByDueDate,
      },
    }))
}

export async function previewRewardRule(params: {
  rule: RewardRuleRow
  monthYear: string
  limit?: number
}) {
  const adminClient = createAdminClient()
  const eligibleStudents = await getEligibleStudents(adminClient, params.rule, params.monthYear)
  const sampleLimit = Math.max(1, Math.min(params.limit ?? 10, 25))

  if (eligibleStudents.length === 0) {
    return {
      eligibleCount: 0,
      sample: [] as Array<{ student_id: string; student_name: string; student_code: string | null; metadata: Record<string, unknown> }>,
    }
  }

  const sampleStudentIds = [...new Set(eligibleStudents.slice(0, sampleLimit).map((student) => student.student_id))]
  const { data: studentRows, error: studentError } = await adminClient
    .from('students')
    .select('id, student_code, users!inner(full_name)')
    .in('id', sampleStudentIds)

  if (studentError) {
    throw new Error(studentError.message)
  }

  const studentMap = new Map(
    ((studentRows ?? []) as Array<{ id: string; student_code: string | null; users: { full_name: string | null } | Array<{ full_name: string | null }> | null }>).map((student) => {
      const studentUser = Array.isArray(student.users) ? student.users[0] : student.users
      return [
        student.id,
        {
          student_name: studentUser?.full_name ?? 'Unknown student',
          student_code: student.student_code,
        },
      ]
    }),
  )

  return {
    eligibleCount: eligibleStudents.length,
    sample: eligibleStudents.slice(0, sampleLimit).map((student) => ({
      student_id: student.student_id,
      student_name: studentMap.get(student.student_id)?.student_name ?? 'Unknown student',
      student_code: studentMap.get(student.student_id)?.student_code ?? null,
      metadata: student.metadata,
    })),
  }
}

export async function executeRewardRule(params: {
  rule: RewardRuleRow
  monthYear: string
  triggeredBy: string | null
}) {
  const adminClient = createAdminClient()
  const { rule, monthYear, triggeredBy } = params

  const { data: executionRow, error: executionError } = await adminClient
    .from('reward_rule_executions')
    .insert({
      reward_rule_id: rule.id,
      run_month: monthYear,
      status: 'running',
      triggered_by: triggeredBy,
      metadata: {
        trigger_type: rule.trigger_type,
        scope_type: rule.scope_type,
      },
    })
    .select('id')
    .single()

  if (executionError || !executionRow) {
    throw new Error(executionError?.message ?? 'Failed to start reward execution.')
  }

  let eligibleCount = 0
  let awardedCount = 0
  let skippedCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    const eligibleStudents = await getEligibleStudents(adminClient, rule, monthYear)
    eligibleCount = eligibleStudents.length

    for (const student of eligibleStudents) {
      const awardKey = `${rule.id}:${student.student_id}:${monthYear}`
      const { data: transactionId, error } = await adminClient.rpc('record_reward_rule_award', {
        p_reward_rule_id: rule.id,
        p_student_id: student.student_id,
        p_points: rule.points_awarded,
        p_award_key: awardKey,
        p_source_month: monthYear,
        p_source_reference_id: student.source_reference_id,
        p_description: `Rule applied: ${rule.rule_name}`,
        p_created_by: triggeredBy,
        p_metadata: student.metadata,
      })

      if (error) {
        failedCount += 1
        errors.push(`${student.student_id}: ${error.message}`)
        continue
      }

      if (transactionId) {
        awardedCount += 1
      } else {
        skippedCount += 1
      }
    }
  } catch (error) {
    failedCount = Math.max(1, failedCount)
    errors.push(error instanceof Error ? error.message : 'Unexpected reward execution failure')
  }

  const status = failedCount > 0
    ? (awardedCount > 0 ? 'partial' : 'failed')
    : 'success'

  const { error: finalizeError } = await adminClient
    .from('reward_rule_executions')
    .update({
      status,
      eligible_count: eligibleCount,
      awarded_count: awardedCount,
      skipped_count: skippedCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
      error_message: errors.length > 0 ? errors.join(' | ').slice(0, 4000) : null,
      metadata: {
        trigger_type: rule.trigger_type,
        scope_type: rule.scope_type,
        points_awarded: rule.points_awarded,
      },
    })
    .eq('id', executionRow.id)

  if (finalizeError) {
    throw new Error(finalizeError.message)
  }

  return {
    executionId: executionRow.id,
    status,
    eligibleCount,
    awardedCount,
    skippedCount,
    failedCount,
  }
}

export function getPreviousMonthDateString() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10)
}
