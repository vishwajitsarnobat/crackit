'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Receipt, Save } from 'lucide-react'
import { toast } from 'sonner'

import { SelectField } from '@/components/shared/form/select-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { fetchJson } from '@/lib/http/fetch-json'
import type { CentreExpense } from '@/lib/types/entities'
import { useTaskCentres } from '@/lib/hooks/use-task-centres'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

type MonthSummary = {
  month_year: string
  total: number
  count: number
  categories: Record<string, number>
}

const CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'electricity_bill', label: 'Electricity Bill' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'internet_bill', label: 'Internet Bill' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
] as const

type DraftExpense = {
  category: string
  amount: string
  description: string
}

function getRecentMonths() {
  const result: MonthSummary[] = []
  const today = new Date()

  for (let index = 0; index < 6; index += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1)
    result.push({
      month_year: format(date, 'yyyy-MM-01'),
      total: 0,
      count: 0,
      categories: {},
    })
  }

  return result
}

export function ExpensesPage() {
  const queryClient = useQueryClient()
  const [selectedCentre, setSelectedCentre] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM-01'))
  const [drafts, setDrafts] = useState<DraftExpense[]>([{ category: 'rent', amount: '', description: '' }])
  const centresQuery = useTaskCentres('/api/data-entry/expenses', 'expenses')

  const centres = useMemo(() => centresQuery.data?.centres ?? [], [centresQuery.data?.centres])
  const effectiveSelectedCentre = selectedCentre || centres[0]?.id || ''

  const monthsQuery = useQuery({
    queryKey: ['task-expense-months', effectiveSelectedCentre],
    queryFn: () => fetchJson<{ months: MonthSummary[] }>(`/api/data-entry/expenses?centre_id=${effectiveSelectedCentre}`, { errorPrefix: 'Load expense months' }),
    enabled: Boolean(effectiveSelectedCentre),
    staleTime: 30_000,
  })

  const entriesQuery = useQuery({
    queryKey: ['task-expense-entries', effectiveSelectedCentre || 'default', selectedMonth],
    queryFn: () => fetchJson<{ expenses: CentreExpense[] }>(`/api/data-entry/expenses?centre_id=${effectiveSelectedCentre}&month_year=${selectedMonth}`, { errorPrefix: 'Load expense entries' }),
    enabled: Boolean(effectiveSelectedCentre && selectedMonth),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (records: Array<{ category: string; amount: number; description: string | null }>) =>
      fetchJson<{ count: number }>('/api/data-entry/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centre_id: effectiveSelectedCentre, month_year: selectedMonth, expenses: records }),
      }),
    onSuccess: async (json) => {
      toast.success(`${json.count} expense entr${json.count === 1 ? 'y' : 'ies'} added`)
      setDrafts([{ category: 'rent', amount: '', description: '' }])
      await queryClient.invalidateQueries({ queryKey: ['task-expense-months', effectiveSelectedCentre] })
      await queryClient.invalidateQueries({ queryKey: ['task-expense-entries', effectiveSelectedCentre, selectedMonth] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save expense entries')
    },
  })

  useQueryErrorToast(centresQuery.error, 'Failed to load centres')
  useQueryErrorToast(monthsQuery.error, 'Failed to load expense months')
  useQueryErrorToast(entriesQuery.error, 'Failed to load expense entries')

  const months = useMemo(() => {
    const summaryMap = new Map<string, MonthSummary>(((monthsQuery.data?.months) ?? []).map((month: MonthSummary) => [month.month_year, month]))
    return getRecentMonths().map((month) => summaryMap.get(month.month_year) ?? month)
  }, [monthsQuery.data?.months])
  const entries = entriesQuery.data?.expenses ?? []
  const loadingCentres = centresQuery.isPending || centresQuery.isFetching
  const loadingMonths = monthsQuery.isPending || monthsQuery.isFetching
  const loadingEntries = entriesQuery.isPending || entriesQuery.isFetching
  const saving = saveMutation.isPending

  const selectedMonthSummary = useMemo(
    () => months.find((month) => month.month_year === selectedMonth) ?? months[0] ?? null,
    [months, selectedMonth],
  )

  function updateDraft(index: number, field: keyof DraftExpense, value: string) {
    setDrafts((previous) => previous.map((draft, draftIndex) => (
      draftIndex === index ? { ...draft, [field]: value } : draft
    )))
  }

  function addDraft() {
    setDrafts((previous) => [...previous, { category: 'miscellaneous', amount: '', description: '' }])
  }

  async function handleSave() {
    try {
      const records = drafts
        .filter((draft) => draft.amount && parseFloat(draft.amount) !== 0)
        .map((draft) => ({
          category: draft.category,
          amount: parseFloat(draft.amount),
          description: draft.description || null,
        }))

      if (records.length === 0) {
        toast.error('Enter at least one non-zero expense entry.')
        return
      }

      await saveMutation.mutateAsync(records)
    } catch {
      // handled by mutation callbacks
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel soft-ring rounded-[32px] px-8 py-8">
        <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Tasks</Badge>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-secondary dark:text-primary">Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Each month is represented as a summary card. Open a month to review immutable entries and append new ones.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[240px]">
          <SelectField id="expenses-centre" label="Centre" value={effectiveSelectedCentre} onChange={setSelectedCentre} options={centres.map((centre) => ({ value: centre.id, label: centre.centre_name }))} placeholder={loadingCentres ? 'Loading centres...' : 'Select centre'} />
        </div>
      </div>

      {effectiveSelectedCentre && (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
              <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Month Cards</CardTitle>
              <CardDescription className="mt-0.5">Current and recent months appear here with summary totals even before opening the detail view.</CardDescription>
            </div>
            {loadingMonths ? (
              <div className="h-40 animate-pulse bg-primary/10 dark:bg-white/[0.04]" />
            ) : (
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                {months.map((month) => (
                  <button
                    key={month.month_year}
                    type="button"
                    onClick={() => setSelectedMonth(month.month_year)}
                    className={`rounded-2xl border p-4 text-left transition-colors hover:bg-primary/10 dark:hover:bg-white/[0.04] ${selectedMonth === month.month_year ? 'border-primary/35 bg-primary/12 dark:bg-primary/10' : 'bg-white/60 dark:bg-white/[0.04]'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-secondary dark:text-foreground">{format(new Date(month.month_year), 'MMMM yyyy')}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{month.count} entr{month.count === 1 ? 'y' : 'ies'}</div>
                      </div>
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-4 text-2xl font-semibold text-secondary dark:text-foreground">Rs {Number(month.total).toLocaleString('en-IN')}</div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {Object.entries(month.categories).length === 0
                        ? 'No expenses added yet.'
                        : Object.entries(month.categories)
                            .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
                            .slice(0, 2)
                            .map(([category, amount]) => `${category.replaceAll('_', ' ')}: Rs ${Number(amount).toLocaleString('en-IN')}`)
                            .join(' · ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
            <Card className="overflow-hidden py-0">
              <div className="flex items-center justify-between border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
                <div>
                  <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Add Expense Entries</CardTitle>
                  <CardDescription className="mt-0.5">Appending to {selectedMonthSummary ? format(new Date(selectedMonthSummary.month_year), 'MMMM yyyy') : 'selected month'}. Use negative miscellaneous entries to compensate mistakes.</CardDescription>
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />{saving ? 'Saving...' : 'Save'}
                </Button>
              </div>

              <div className="divide-y divide-secondary/10">
                {drafts.map((draft, index) => (
                  <div key={`${draft.category}-${index}`} className="grid gap-4 px-5 py-4 md:grid-cols-[220px_180px_1fr]">
                    <SelectField id={`expense-category-${index}`} label="Category" value={draft.category} onChange={(value) => updateDraft(index, 'category', value)} options={CATEGORIES.map((category) => ({ value: category.value, label: category.label }))} />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Amount (Rs)</Label>
                      <Input type="number" value={draft.amount} onChange={(event) => updateDraft(index, 'amount', event.target.value)} placeholder="Negative misc for corrections" className="tabular-nums" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Textarea value={draft.description} onChange={(event) => updateDraft(index, 'description', event.target.value)} placeholder="Why this entry is being added" rows={1} className="resize-none" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t px-5 py-4">
                <Button type="button" variant="outline" onClick={addDraft}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Another Entry</Button>
              </div>
            </Card>

            <Card className="overflow-hidden py-0">
              <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
                <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Month Detail</CardTitle>
                <CardDescription className="mt-0.5">{selectedMonthSummary ? `${format(new Date(selectedMonthSummary.month_year), 'MMMM yyyy')} · Rs ${Number(selectedMonthSummary.total).toLocaleString('en-IN')}` : 'Select a month card to review entries'}</CardDescription>
              </div>

              {loadingEntries ? (
                <div className="h-60 animate-pulse bg-primary/10 dark:bg-white/[0.04]" />
              ) : entries.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No expense entries found for this month.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-primary/10 dark:bg-white/[0.04]">
                     <TableRow>
                       <TableHead>#</TableHead>
                       <TableHead>Category</TableHead>
                       <TableHead className="text-right">Amount (Rs)</TableHead>
                       <TableHead>Description</TableHead>
                       <TableHead>Entered By</TableHead>
                       <TableHead>Recorded At</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium capitalize">{entry.category.replaceAll('_', ' ')}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(entry.amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.description || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.entered_by_name || 'Unknown'}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{entry.created_at.slice(0, 10)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
