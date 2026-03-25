'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Search } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns';

import { ManageDialog } from '@/components/manage/manage-dialog'
import { DatePickerField } from '@/components/shared/form/date-picker-field'
import { SelectField } from '@/components/shared/form/select-field'
import { fetchJson } from '@/lib/http/fetch-json'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FeeTransaction, InvoiceRewardAllocation, StudentInvoice } from '@/lib/types/entities'

type BatchOption = { id: string; batch_name: string; batch_code: string; centre_name: string }

type StudentFeeSummary = {
  student_id: string
  student_name: string
  student_code: string | null
  current_points: number
  paidTill: string | null
  invoices: StudentInvoice[]
  pendingAmount: number
  pendingMonths: number
}

const STATUS_COLORS: Record<StudentInvoice['payment_status'], string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  partial: 'bg-blue-500/10 text-blue-600 border-blue-200',
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  overdue: 'bg-red-500/10 text-red-600 border-red-200',
}

export function FeesPage() {
  const queryClient = useQueryClient()
  const [selectedBatch, setSelectedBatch] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')

  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState<'cash' | 'online'>('cash')
  const [payDate, setPayDate] = useState('')
  const [discountTarget, setDiscountTarget] = useState('0')

  const batchesQuery = useQuery({
    queryKey: ['task-fee-batches'],
    queryFn: () => fetchJson<{ batches: BatchOption[] }>('/api/data-entry/fees', { errorPrefix: 'Load fee batches' }),
    staleTime: 60_000,
  })

  const batches = useMemo(() => batchesQuery.data?.batches ?? [], [batchesQuery.data?.batches])
  const effectiveSelectedBatch = selectedBatch || batches[0]?.id || ''

  const invoicesQuery = useQuery({
    queryKey: ['task-fee-invoices', effectiveSelectedBatch, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ batch_id: effectiveSelectedBatch })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return fetchJson<{ invoices: StudentInvoice[] }>(`/api/data-entry/fees?${params.toString()}`, { errorPrefix: 'Load fee invoices' })
    },
    enabled: Boolean(effectiveSelectedBatch),
    staleTime: 30_000,
  })

  const detailQuery = useQuery({
    queryKey: ['task-fee-details', selectedInvoiceId],
    queryFn: () => fetchJson<{ transactions: FeeTransaction[]; reward_allocations: InvoiceRewardAllocation[] }>(`/api/data-entry/fees?invoice_id=${selectedInvoiceId}`, { errorPrefix: 'Load fee payments' }),
    enabled: Boolean(selectedInvoiceId),
    staleTime: 15_000,
  })

  const recordPaymentMutation = useMutation({
    mutationFn: () => fetchJson<{ transaction?: { receipt_number?: string } }>('/api/data-entry/fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_invoice_id: selectedInvoiceId,
        amount: parseFloat(payAmount),
        payment_mode: payMode,
        payment_date: payDate || null,
      }),
    }),
    onSuccess: async (json) => {
      toast.success(`Payment recorded · Receipt: ${json.transaction?.receipt_number || 'Generated'}`)
      setPayDialogOpen(false)
      setPayAmount('')
      setPayDate('')
      await queryClient.invalidateQueries({ queryKey: ['task-fee-invoices', effectiveSelectedBatch, statusFilter] })
      await queryClient.invalidateQueries({ queryKey: ['task-fee-details', selectedInvoiceId] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to record payment')
    },
  })

  const rewardMutation = useMutation({
    mutationFn: (targetDiscountTotal: number) => fetchJson('/api/data-entry/fees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: effectiveSelectedStudentId, target_discount_total: targetDiscountTotal }),
    }),
    onSuccess: async () => {
      toast.success('Reward-point allocation updated across pending invoices')
      await queryClient.invalidateQueries({ queryKey: ['task-fee-invoices', effectiveSelectedBatch, statusFilter] })
      if (selectedInvoiceId) {
        await queryClient.invalidateQueries({ queryKey: ['task-fee-details', selectedInvoiceId] })
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update reward discount')
    },
  })

  useEffect(() => {
    if (batchesQuery.error) {
      toast.error(batchesQuery.error instanceof Error ? batchesQuery.error.message : 'Failed to load batches')
    }
  }, [batchesQuery.error])

  useEffect(() => {
    if (invoicesQuery.error) {
      toast.error(invoicesQuery.error instanceof Error ? invoicesQuery.error.message : 'Failed to load invoices')
    }
  }, [invoicesQuery.error])

  useEffect(() => {
    if (detailQuery.error) {
      toast.error(detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load payment history')
    }
  }, [detailQuery.error])

  const invoices = useMemo(() => invoicesQuery.data?.invoices ?? [], [invoicesQuery.data?.invoices])
  const transactions = detailQuery.data?.transactions ?? []
  const rewardAllocations = detailQuery.data?.reward_allocations ?? []
  const loading = batchesQuery.isPending || batchesQuery.isFetching || invoicesQuery.isPending || invoicesQuery.isFetching
  const detailsLoading = detailQuery.isPending || detailQuery.isFetching
  const saving = recordPaymentMutation.isPending || rewardMutation.isPending

  const studentSummaries = useMemo(() => {
    const grouped = new Map<string, StudentFeeSummary>()

    for (const invoice of invoices) {
      const existing = grouped.get(invoice.student_id) ?? {
        student_id: invoice.student_id,
        student_name: invoice.student_name,
        student_code: invoice.student_code,
        current_points: invoice.current_points,
        paidTill: null,
        invoices: [],
        pendingAmount: 0,
        pendingMonths: 0,
      }

      existing.current_points = invoice.current_points
      existing.invoices.push(invoice)

      if (invoice.payment_status === 'paid') {
        if (!existing.paidTill || invoice.month_year > existing.paidTill) {
          existing.paidTill = invoice.month_year
        }
      } else {
        existing.pendingAmount += invoice.payable_amount
        existing.pendingMonths += 1
      }

      grouped.set(invoice.student_id, existing)
    }

    return Array.from(grouped.values())
      .filter((student) => {
        const query = search.trim().toLowerCase()
        if (!query) return true
        return student.student_name.toLowerCase().includes(query)
          || (student.student_code ?? '').toLowerCase().includes(query)
      })
      .sort((left, right) => left.student_name.localeCompare(right.student_name))
  }, [invoices, search])

  const effectiveSelectedStudentId = selectedStudentId && studentSummaries.some((student) => student.student_id === selectedStudentId)
    ? selectedStudentId
    : (studentSummaries[0]?.student_id ?? '')

  const selectedStudent = useMemo(
    () => studentSummaries.find((student) => student.student_id === effectiveSelectedStudentId) ?? null,
    [effectiveSelectedStudentId, studentSummaries],
  )

  const effectiveSelectedInvoiceId = (() => {
    if (!selectedStudent) return ''
    if (selectedInvoiceId && selectedStudent.invoices.some((invoice) => invoice.id === selectedInvoiceId)) {
      return selectedInvoiceId
    }
    return selectedStudent.invoices.find((invoice) => invoice.payment_status !== 'paid')?.id ?? selectedStudent.invoices[0]?.id ?? ''
  })()

  const selectedInvoice = useMemo(
    () => selectedStudent?.invoices.find((invoice) => invoice.id === effectiveSelectedInvoiceId)
      ?? selectedStudent?.invoices[0]
      ?? null,
    [effectiveSelectedInvoiceId, selectedStudent],
  )

  const selectedStudentRewardAllocation = useMemo(
    () => selectedStudent?.invoices.reduce((sum, invoice) => sum + invoice.amount_discount, 0) ?? 0,
    [selectedStudent],
  )

  const selectedStudentRawPending = useMemo(
    () => selectedStudent?.invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount_due - invoice.amount_paid), 0) ?? 0,
    [selectedStudent],
  )

  const currentAllocationBreakdown = useMemo(
    () => (selectedStudent?.invoices ?? [])
      .filter((invoice) => invoice.amount_discount > 0)
      .map((invoice) => ({ month_year: invoice.month_year, amount_discount: invoice.amount_discount })),
    [selectedStudent],
  )

  const discountInputValue = discountTarget === '' ? String(selectedStudentRewardAllocation) : discountTarget

  async function handleRecordPayment() {
    if (!selectedInvoice) return
    await recordPaymentMutation.mutateAsync()
  }

  async function applyRewardDiscount(nextDiscount: string) {
    if (!selectedStudent) return

    const target = parseFloat(nextDiscount) || 0
    await rewardMutation.mutateAsync(target)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Task Fees</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review student fee cards, open month-wise invoice history, and collect full or partial payments with reward-point offsets.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[240px_180px_1fr]">
        <SelectField id="fees-batch" label="Batch" value={effectiveSelectedBatch} onChange={setSelectedBatch} options={batches.map((batch) => ({ value: batch.id, label: `${batch.batch_name} - ${batch.centre_name}` }))} placeholder="Select batch" />
        <SelectField id="fees-status" label="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }]} />
        <div className="space-y-2">
          <Label htmlFor="student-search">Search Student</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="student-search" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search student name or code" />
          </div>
        </div>
      </div>

      {effectiveSelectedBatch && (
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-b bg-muted/30 px-5 py-3.5">
              <CardTitle className="text-base tracking-tight">Student Fee Cards</CardTitle>
              <CardDescription className="mt-0.5">{studentSummaries.length} student card(s)</CardDescription>
            </div>
            <div className="max-h-[700px] overflow-y-auto">
              {loading ? (
                <div className="h-56 animate-pulse bg-muted/20" />
              ) : studentSummaries.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No student invoices match the current batch and status filter.</div>
              ) : (
                <div className="divide-y">
                  {studentSummaries.map((student) => (
                    <button
                      key={student.student_id}
                      type="button"
                      onClick={() => { setSelectedStudentId(student.student_id); setSelectedInvoiceId(''); setDiscountTarget('') }}
                      className={`w-full px-5 py-4 text-left transition-colors hover:bg-muted/30 ${effectiveSelectedStudentId === student.student_id ? 'bg-muted/40' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{student.student_name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{student.student_code || '-'}</div>
                        </div>
                        <Badge variant="outline" className={student.pendingMonths > 0 ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'}>
                          {student.pendingMonths > 0 ? `${student.pendingMonths} pending` : 'Up to date'}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <div>Paid till: <span className="font-medium text-foreground">{student.paidTill ? student.paidTill.slice(0, 7) : 'Not paid yet'}</span></div>
                        <div>Pending: <span className="font-medium text-foreground">Rs {student.pendingAmount.toLocaleString('en-IN')}</span></div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-b bg-muted/30 px-5 py-3.5">
              <CardTitle className="text-base tracking-tight">Student Fee Detail</CardTitle>
              <CardDescription className="mt-0.5">Month-wise invoice history, reward discount visibility, and payment records.</CardDescription>
            </div>

            {!selectedStudent ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Select a student card to review fee months and payments.</div>
            ) : (
              <div className="space-y-5 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                  <div>
                    <div className="text-xl font-semibold">{selectedStudent.student_name}</div>
                    <div className="mt-1 font-mono text-sm text-muted-foreground">{selectedStudent.student_code || '-'}</div>
                  </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-lg border bg-background px-3 py-2">
                        <div className="text-muted-foreground">Reward points</div>
                        <div className="font-medium">{selectedStudent.current_points}</div>
                      </div>
                      <div className="rounded-lg border bg-background px-3 py-2">
                        <div className="text-muted-foreground">Reward applied</div>
                        <div className="font-medium">Rs {selectedStudentRewardAllocation.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="rounded-lg border bg-background px-3 py-2">
                        <div className="text-muted-foreground">Pending amount</div>
                        <div className="font-medium">Rs {selectedStudent.pendingAmount.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoice Months</div>
                  {selectedStudent.invoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      type="button"
                       onClick={() => setSelectedInvoiceId(invoice.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/20 ${selectedInvoice?.id === invoice.id ? 'border-sky-400/50 bg-sky-500/5' : 'bg-background'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{invoice.month_year.slice(0, 7)}</div>
                          <div className="mt-1 text-sm text-muted-foreground">Due Rs {invoice.amount_due.toLocaleString('en-IN')} · Paid Rs {invoice.amount_paid.toLocaleString('en-IN')}</div>
                        </div>
                        <Badge variant="outline" className={STATUS_COLORS[invoice.payment_status]}>{invoice.payment_status}</Badge>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedInvoice && (
                  <>
                    <div className="space-y-3">
                      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Selected Invoice</div>
                      <div className="rounded-xl border bg-background p-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <div className="text-muted-foreground">Monthly fee</div>
                            <div className="font-medium">Rs {selectedInvoice.monthly_fee.toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Reward discount</div>
                            <div className="font-medium">Rs {selectedInvoice.amount_discount.toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Already paid</div>
                            <div className="font-medium">Rs {selectedInvoice.amount_paid.toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Payable now</div>
                            <div className="font-medium">Rs {selectedInvoice.payable_amount.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                          Payable fee is calculated as `max(0, pending fees - reward points applied)`. Reward discount is visible separately so money payments and point redemption remain auditable.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Reward Offset</div>
                      <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-[200px_1fr_auto]">
                        <div className="space-y-2">
                          <Label htmlFor="reward-discount">Total Reward Allocation (Rs)</Label>
                          <Input id="reward-discount" type="number" step="1" min={0} max={Math.min(selectedStudentRawPending, selectedStudent.current_points + selectedStudentRewardAllocation)} value={discountInputValue} onChange={(event) => setDiscountTarget(event.target.value)} />
                        </div>
                        <div className="flex items-end text-sm text-muted-foreground">
                          Reward allocation is applied oldest-first across all pending invoices for this student. Available points: {selectedStudent.current_points}. Raw pending before rewards: Rs {selectedStudentRawPending.toLocaleString('en-IN')}.
                        </div>
                        <div className="flex items-end">
                          <Button variant="outline" onClick={() => void applyRewardDiscount(discountInputValue)} disabled={saving}>Apply</Button>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-background p-4">
                        <div className="text-sm font-medium">Current allocation by invoice month</div>
                        {currentAllocationBreakdown.length === 0 ? (
                          <div className="mt-2 text-sm text-muted-foreground">No reward allocation is applied to this student right now.</div>
                        ) : (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {currentAllocationBreakdown.map((entry) => (
                              <div key={entry.month_year} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                                <div className="text-muted-foreground">{entry.month_year.slice(0, 7)}</div>
                                <div className="font-medium">Rs {entry.amount_discount.toLocaleString('en-IN')}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => setPayDialogOpen(true)} disabled={selectedInvoice.payable_amount <= 0}>
                        <CreditCard className="mr-2 h-4 w-4" />Record Payment
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Reward Allocation History</div>
                      {detailsLoading ? (
                        <div className="h-24 animate-pulse rounded-xl bg-muted/20" />
                      ) : rewardAllocations.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No reward allocation history exists for this invoice month yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {rewardAllocations.map((allocation) => (
                            <div key={allocation.id} className="rounded-xl border bg-background p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">Reward allocation of Rs {allocation.allocation_amount.toLocaleString('en-IN')}</div>
                                  <div className="mt-1 text-sm text-muted-foreground">{allocation.points_description || 'Reward allocation ledger entry'}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">Reason: {allocation.points_reason || 'N/A'} · By {allocation.created_by_name || 'Unknown'} · Logged {allocation.created_at.slice(0, 10)}</div>
                                </div>
                                {allocation.points_month_year && <div className="text-sm text-muted-foreground">{allocation.points_month_year.slice(0, 7)}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment History</div>
                      {detailsLoading ? (
                        <div className="h-32 animate-pulse rounded-xl bg-muted/20" />
                      ) : transactions.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No payments recorded for this invoice month yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {transactions.map((transaction) => (
                            <div key={transaction.id} className="rounded-xl border bg-background p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">Receipt {transaction.receipt_number}</div>
                                  <div className="mt-1 text-sm text-muted-foreground">{transaction.payment_mode} payment on {transaction.payment_date}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">Collected by {transaction.collected_by_name || 'Unknown'} · Logged {transaction.created_at.slice(0, 10)}</div>
                                </div>
                                <div className="font-medium">Rs {Number(transaction.amount).toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      <ManageDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        title="Record Fee Payment"
        description={selectedInvoice ? `Record a full or partial payment for ${selectedStudent?.student_name} (${selectedInvoice.month_year.slice(0, 7)})` : ''}
        onSubmit={handleRecordPayment}
        saving={saving}
        submitLabel="Record Payment"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Amount (Rs) *</Label>
            <Input id="pay-amount" type="number" min={1} max={selectedInvoice?.payable_amount ?? undefined} value={payAmount} onChange={(event) => setPayAmount(event.target.value)} placeholder="Enter full or partial amount" required />
          </div>
          <SelectField id="fees-pay-mode" label="Payment Mode *" value={payMode} onChange={(value) => setPayMode(value as 'cash' | 'online')} options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }]} />
          <DatePickerField id="pay-date" label="Payment Date" value={payDate} onChange={setPayDate} max={format(new Date(), 'yyyy-MM-dd')} />
        </div>
      </ManageDialog>
    </div>
  )
}
