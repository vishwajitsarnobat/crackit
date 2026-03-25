'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CreditCard, Search } from 'lucide-react'
import { toast } from 'sonner'

import { DatePickerField } from '@/components/shared/form/date-picker-field'
import { SelectField } from '@/components/shared/form/select-field'
import { fetchJson } from '@/lib/http/fetch-json'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { StaffSalary, StaffSalaryPayment } from '@/lib/types/entities'
import { useScopedFilters } from '@/lib/hooks/use-scoped-filters'
import { useTaskCentres } from '@/lib/hooks/use-task-centres'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

type TeacherSummary = {
  user_id: string
  staff_name: string
  paidTill: string | null
  pendingMonths: StaffSalary[]
  allMonths: StaffSalary[]
  totalPendingAmount: number
  batchNames: string[]
}

function statusClass(status: StaffSalary['status']) {
  if (status === 'paid') return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
  if (status === 'partial') return 'bg-amber-500/10 text-amber-600 border-amber-200'
  return 'bg-red-500/10 text-red-600 border-red-200'
}

export function SalariesPage() {
  const queryClient = useQueryClient()
  const [selectedCentre, setSelectedCentre] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedSalaryId, setSelectedSalaryId] = useState('')
  const [targetPaidAmount, setTargetPaidAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [paymentDescription, setPaymentDescription] = useState('')
  const scopedFiltersQuery = useScopedFilters()

  const centresQuery = useTaskCentres('/api/data-entry/salaries', 'salaries')

  const centres = useMemo(() => centresQuery.data?.centres ?? [], [centresQuery.data?.centres])
  const batches = useMemo(() => scopedFiltersQuery.data?.batches ?? [], [scopedFiltersQuery.data?.batches])
  const effectiveSelectedCentre = selectedCentre || centres[0]?.id || ''
  const visibleBatches = useMemo(
    () => batches.filter((batch) => !selectedCentre || batch.centre_id === selectedCentre),
    [batches, selectedCentre],
  )
  const effectiveSelectedBatch = selectedBatch !== 'all' && !visibleBatches.some((batch) => batch.id === selectedBatch)
    ? 'all'
    : selectedBatch

  const salaryQuery = useQuery({
    queryKey: ['task-salary-records', effectiveSelectedCentre, effectiveSelectedBatch, selectedTeacherId || 'all'],
    queryFn: () => {
      const params = new URLSearchParams({ centre_id: effectiveSelectedCentre })
      if (effectiveSelectedBatch && effectiveSelectedBatch !== 'all') params.set('batch_id', effectiveSelectedBatch)
      if (selectedTeacherId) params.set('teacher_id', selectedTeacherId)
      return fetchJson<{ staff: StaffSalary[]; payments: StaffSalaryPayment[] }>(`/api/data-entry/salaries?${params.toString()}`, { errorPrefix: 'Load salary records' })
    },
    enabled: Boolean(effectiveSelectedCentre),
    staleTime: 30_000,
  })

  const paymentMutation = useMutation({
    mutationFn: () => fetchJson<{ count: number }>('/api/data-entry/salaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centre_id: effectiveSelectedCentre,
        month_year: selectedSalary?.month_year,
        salaries: [{
          salary_id: selectedSalary?.id,
          target_paid_amount: Number(targetPaidAmount),
          payment_date: paymentDate || null,
          description: paymentDescription || null,
        }],
      }),
    }),
    onSuccess: async (json) => {
      toast.success(json.count > 0 ? 'Salary payment recorded' : 'No new payment was needed')
      await queryClient.invalidateQueries({ queryKey: ['task-salary-records', effectiveSelectedCentre] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to record payment')
    },
  })

  useQueryErrorToast(centresQuery.error, 'Failed to load salary filters')
  useQueryErrorToast(scopedFiltersQuery.error, 'Failed to load salary filters')
  useQueryErrorToast(salaryQuery.error, 'Failed to load salary records')

  const salaries = useMemo(() => salaryQuery.data?.staff ?? [], [salaryQuery.data?.staff])
  const payments = useMemo(() => salaryQuery.data?.payments ?? [], [salaryQuery.data?.payments])
  const loading = centresQuery.isPending || centresQuery.isFetching || scopedFiltersQuery.isPending || scopedFiltersQuery.isFetching || salaryQuery.isPending || salaryQuery.isFetching
  const saving = paymentMutation.isPending

  const teacherSummaries = useMemo(() => {
    const map = new Map<string, TeacherSummary>()

    for (const salary of salaries) {
      const existing = map.get(salary.user_id) ?? {
        user_id: salary.user_id,
        staff_name: salary.staff_name,
        paidTill: null,
        pendingMonths: [],
        allMonths: [],
        totalPendingAmount: 0,
        batchNames: [],
      }

      existing.allMonths.push(salary)
      if (salary.status === 'paid') {
        if (!existing.paidTill || salary.month_year > existing.paidTill) {
          existing.paidTill = salary.month_year
        }
      } else {
        existing.pendingMonths.push(salary)
        existing.totalPendingAmount += Math.max(0, salary.amount_due - salary.amount_paid)
      }

      for (const assignment of salary.assignment_snapshot) {
        if (!existing.batchNames.includes(assignment.batch_name)) {
          existing.batchNames.push(assignment.batch_name)
        }
      }

      map.set(salary.user_id, existing)
    }

    return Array.from(map.values())
      .filter((teacher) => {
        const query = search.trim().toLowerCase()
        if (!query) return true
        return teacher.staff_name.toLowerCase().includes(query)
          || teacher.batchNames.some((batchName) => batchName.toLowerCase().includes(query))
      })
      .sort((left, right) => left.staff_name.localeCompare(right.staff_name))
  }, [salaries, search])

  useEffect(() => {
  }, [selectedTeacherId, teacherSummaries])

  const effectiveSelectedTeacherId = selectedTeacherId && teacherSummaries.some((teacher) => teacher.user_id === selectedTeacherId)
    ? selectedTeacherId
    : (teacherSummaries[0]?.user_id ?? '')

  const selectedTeacher = useMemo(
    () => teacherSummaries.find((teacher) => teacher.user_id === effectiveSelectedTeacherId) ?? null,
    [effectiveSelectedTeacherId, teacherSummaries],
  )

  const effectiveSelectedSalaryId = selectedTeacher?.allMonths.some((salary) => salary.id === selectedSalaryId)
    ? selectedSalaryId
    : (selectedTeacher?.pendingMonths[0]?.id ?? selectedTeacher?.allMonths[0]?.id ?? '')

  const selectedSalary = selectedTeacher?.allMonths.find((salary) => salary.id === effectiveSelectedSalaryId)
    ?? selectedTeacher?.pendingMonths[0]
    ?? null

  const paymentAmountValue = targetPaidAmount === '' && selectedSalary ? String(selectedSalary.amount_paid) : targetPaidAmount

  const salaryPayments = useMemo(
    () => payments.filter((payment) => payment.staff_salary_id === (selectedSalary?.id ?? '')),
    [payments, selectedSalary],
  )

  async function recordPayment() {
    if (!selectedSalary || !effectiveSelectedCentre) return
    await paymentMutation.mutateAsync()
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel soft-ring rounded-[32px] px-8 py-8">
        <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Tasks</Badge>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-secondary dark:text-primary">Salary Records</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track teacher salary months, pending balances, assignment snapshots, and payment history from one workspace.</p>
      </div>

      <div className="grid gap-4 rounded-[28px] border border-secondary/10 bg-white/45 p-5 dark:bg-white/[0.03] md:grid-cols-[240px_220px_1fr]">
        <SelectField id="salary-centre" label="Centre" value={effectiveSelectedCentre} onChange={(value) => { setSelectedCentre(value); setSelectedBatch('all'); setSelectedTeacherId(''); setSelectedSalaryId(''); setTargetPaidAmount('') }} options={centres.map((centre) => ({ value: centre.id, label: centre.centre_name }))} placeholder="Select centre" />
        <SelectField id="salary-batch" label="Batch" value={effectiveSelectedBatch} onChange={setSelectedBatch} options={[{ value: 'all', label: 'All batches' }, ...visibleBatches.map((batch) => ({ value: batch.id, label: batch.batch_name }))]} />
        <div className="space-y-2">
          <Label htmlFor="salary-search">Search Teacher</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="salary-search" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search teacher or batch" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
            <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Teacher Salary Cards</CardTitle>
            <CardDescription className="mt-0.5">{teacherSummaries.length} teacher card(s)</CardDescription>
          </div>
          <div className="max-h-[700px] overflow-y-auto">
            {loading ? (
              <div className="h-56 animate-pulse bg-primary/10 dark:bg-white/[0.04]" />
            ) : teacherSummaries.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No generated salary records found for this scope.</div>
            ) : (
              <div className="divide-y divide-secondary/10">
                {teacherSummaries.map((teacher) => (
                  <button
                    key={teacher.user_id}
                    type="button"
                      onClick={() => { setSelectedTeacherId(teacher.user_id); setSelectedSalaryId(''); setTargetPaidAmount('') }}
                      className={`w-full px-5 py-4 text-left transition-colors hover:bg-primary/8 dark:hover:bg-white/[0.03] ${effectiveSelectedTeacherId === teacher.user_id ? 'bg-primary/14 dark:bg-white/[0.06]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-secondary dark:text-foreground">{teacher.staff_name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{teacher.batchNames.join(', ') || 'No batches linked'}</div>
                      </div>
                      <Badge variant="outline" className={teacher.pendingMonths.length > 0 ? 'bg-red-500/10 text-red-600 border-red-200' : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'}>
                        {teacher.pendingMonths.length > 0 ? `${teacher.pendingMonths.length} pending` : 'Up to date'}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <div>Paid till: <span className="font-medium text-secondary dark:text-foreground">{teacher.paidTill ? teacher.paidTill.slice(0, 7) : 'Not paid yet'}</span></div>
                      <div>Pending amount: <span className="font-medium text-secondary dark:text-foreground">Rs {teacher.totalPendingAmount.toLocaleString('en-IN')}</span></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
            <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Teacher Salary Detail</CardTitle>
            <CardDescription className="mt-0.5">Pending salary months are shown first, followed by historical salary records and payment history.</CardDescription>
          </div>

          {!selectedTeacher ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Select a teacher card to inspect salary details.</div>
          ) : (
            <div className="space-y-5 px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-secondary/10 bg-white/55 p-4 dark:bg-white/[0.04]">
                <div>
                  <div className="text-xl font-semibold text-secondary dark:text-foreground">{selectedTeacher.staff_name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Paid till {selectedTeacher.paidTill ? selectedTeacher.paidTill.slice(0, 7) : 'no completed salary month yet'}</div>
                </div>
                <div className="rounded-2xl border border-secondary/10 bg-white/70 px-4 py-3 text-right dark:bg-white/[0.05]">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Total pending</div>
                  <div className="text-2xl font-semibold text-secondary dark:text-primary">Rs {selectedTeacher.totalPendingAmount.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Monthly Salary Records</div>
                {selectedTeacher.allMonths.map((salary) => (
                  <button
                    key={salary.id}
                    type="button"
                    onClick={() => setSelectedSalaryId(salary.id)}
                    className={`w-full rounded-[24px] border border-secondary/10 p-4 text-left transition-colors hover:bg-primary/10 dark:hover:bg-white/[0.04] ${effectiveSelectedSalaryId === salary.id ? 'border-primary/35 bg-primary/12 dark:bg-primary/10' : 'bg-white/60 dark:bg-white/[0.04]'}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{salary.month_year.slice(0, 7)}</div>
                        <div className="mt-1 text-sm text-muted-foreground">Due Rs {salary.amount_due.toLocaleString('en-IN')} · Paid Rs {salary.amount_paid.toLocaleString('en-IN')}</div>
                      </div>
                      <Badge variant="outline" className={statusClass(salary.status)}>{salary.status}</Badge>
                    </div>
                  </button>
                ))}
              </div>

              {selectedSalary && (
                <>
                  <div className="space-y-3">
                    <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Assignment Breakdown</div>
                    <div className="space-y-3">
                      {selectedSalary.assignment_snapshot.map((assignment) => (
                        <div key={assignment.assignment_id} className="rounded-[24px] border border-secondary/10 bg-white/60 p-4 dark:bg-white/[0.04]">
                          <div className="font-medium text-secondary dark:text-foreground">{assignment.batch_name}{assignment.subject ? ` · ${assignment.subject}` : ''}</div>
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                            <div>Salary: <span className="font-medium text-secondary dark:text-foreground">Rs {Number(assignment.monthly_salary).toLocaleString('en-IN')}</span></div>
                            <div>Start: <span className="font-medium text-secondary dark:text-foreground">{assignment.assignment_start_date}</span></div>
                            <div>End: <span className="font-medium text-secondary dark:text-foreground">{assignment.assignment_end_date || 'Active'}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Record Payment</div>
                    <div className="grid gap-4 rounded-[24px] border border-secondary/10 bg-white/55 p-4 dark:bg-white/[0.04] md:grid-cols-[1fr_180px_1fr_auto]">
                      <div className="space-y-2">
                        <Label htmlFor="target-paid">Paid Total Target (Rs)</Label>
                        <Input id="target-paid" type="number" min={selectedSalary.amount_paid} max={selectedSalary.amount_due} value={paymentAmountValue} onChange={(event) => setTargetPaidAmount(event.target.value)} />
                      </div>
                      <DatePickerField id="salary-payment-date" label="Payment Date" value={paymentDate} onChange={setPaymentDate} max={format(new Date(), 'yyyy-MM-dd')} />
                      <div className="space-y-2">
                        <Label htmlFor="salary-description">Description</Label>
                        <Textarea id="salary-description" rows={1} value={paymentDescription} onChange={(event) => setPaymentDescription(event.target.value)} placeholder="Optional note for this payment" className="resize-none" />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={recordPayment} disabled={saving}>
                          <CreditCard className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Mark Paid'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment History</div>
                    {salaryPayments.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-secondary/20 bg-white/40 dark:bg-white/[0.02] p-6 text-sm text-muted-foreground">No payment records exist for this month yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {salaryPayments.map((payment) => (
                          <div key={payment.id} className="rounded-[24px] border border-secondary/10 bg-white/60 p-4 dark:bg-white/[0.04]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="font-medium">Payment of Rs {payment.amount.toLocaleString('en-IN')}</div>
                                <div className="mt-1 text-sm text-muted-foreground">{payment.description || 'No description provided.'}</div>
                                <div className="mt-1 text-xs text-muted-foreground">Recorded by {payment.recorded_by_name || 'Unknown'} · Logged {payment.created_at.slice(0, 10)}</div>
                              </div>
                              <div className="text-sm text-muted-foreground">{payment.payment_date}</div>
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
    </div>
  )
}
