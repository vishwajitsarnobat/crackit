'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Banknote, ReceiptText, Search, TrendingDown, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

import { SelectField } from '@/components/shared/form/select-field'
import { fetchJson } from '@/lib/http/fetch-json'
import { EmptyState } from '@/components/analytics/shared/empty-state'
import { FilterBar, SelectFilter, type FilterOption } from '@/components/analytics/shared/filter-bar'
import { SectionCard } from '@/components/analytics/shared/section-card'
import { StatCard } from '@/components/analytics/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFinancialAnalyticsFilterStore } from '@/lib/stores/financial-analytics-filters'

type FinancialPayload = {
  filters: {
    centres: { id: string; centre_name: string }[]
    batches: { id: string; batch_name: string; centre_id: string }[]
  }
  summary: {
    totalCollected: number
    pendingDues: number
    totalExpenses: number
    salaryPaid: number
  }
  expenseBreakdown: { category: string; amount: number }[]
  yearlyExpenseTrend: { month: string; expense: number; running_total: number }[]
  salarySummaries: {
    teacher_id: string
    teacher_name: string
    paid_till: string | null
    pending_months: string[]
    total_pending_amount: number
    batch_names: string[]
  }[]
  feeSummaries: {
    student_id: string
    student_name: string
    student_code: string | null
    paid_till: string | null
    pending_months: string[]
    total_pending_amount: number
    batch_names: string[]
  }[]
}

type AppliedFinancialFilters = {
  centreId: string
  month: string
  year: string
}

const chartConfig = {
  expense: { label: 'Expense', color: '#fb7185' },
  running_total: { label: 'Running total', color: '#38bdf8' },
} satisfies ChartConfig

function prettyMonth(value: string) {
  return format(new Date(`${value}-01T00:00:00`), 'MMM')
}

function titleCase(value: string) {
  return value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

function buildFinancialQueryString(filters: AppliedFinancialFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return params.toString()
}

export function FinancialDashboard() {
  const {
    centreId,
    month,
    year,
    salarySearch,
    salaryBatchFilter,
    feeSearch,
    feeBatchFilter,
    setFilter,
  } = useFinancialAnalyticsFilterStore()
  const [appliedFilters, setAppliedFilters] = useState<AppliedFinancialFilters>({
    centreId: '',
    month: format(new Date(), 'yyyy-MM'),
    year: String(new Date().getFullYear()),
  })

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: ['analytics-financials', appliedFilters],
    queryFn: async () => {
      const payload = await fetchJson<FinancialPayload>(`/api/analytics/financials?${buildFinancialQueryString(appliedFilters)}`, {
        cache: 'no-store',
        errorPrefix: 'Load financial analytics',
      })
      return payload
    },
    staleTime: 30_000,
    retry: false,
  })

  const loading = isPending || isFetching

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load financial analytics')
    }
  }, [error])

  function applyFilters(next?: Partial<AppliedFinancialFilters>) {
    setAppliedFilters((current) => ({
      centreId,
      month,
      year,
      ...current,
      ...next,
    }))
  }

  const centreOptions: FilterOption[] = [{ value: 'all', label: 'All centres' }, ...(data?.filters.centres.map((centre) => ({ value: centre.id, label: centre.centre_name })) ?? [])]
  const batchOptions: FilterOption[] = [{ value: 'all', label: 'All batches' }, ...(data?.filters.batches.map((batch) => ({ value: batch.batch_name, label: batch.batch_name })) ?? [])]

  const filteredSalarySummaries = useMemo(() => (data?.salarySummaries ?? []).filter((row) => {
    const query = salarySearch.trim().toLowerCase()
    const matchesSearch = !query || row.teacher_name.toLowerCase().includes(query)
    const matchesBatch = salaryBatchFilter === 'all' || row.batch_names.includes(salaryBatchFilter)
    return matchesSearch && matchesBatch
  }), [data?.salarySummaries, salaryBatchFilter, salarySearch])

  const filteredFeeSummaries = useMemo(() => (data?.feeSummaries ?? []).filter((row) => {
    const query = feeSearch.trim().toLowerCase()
    const matchesSearch = !query || row.student_name.toLowerCase().includes(query) || (row.student_code ?? '').toLowerCase().includes(query)
    const matchesBatch = feeBatchFilter === 'all' || row.batch_names.includes(feeBatchFilter)
    return matchesSearch && matchesBatch
  }), [data?.feeSummaries, feeBatchFilter, feeSearch])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden glass-panel soft-ring rounded-[32px] px-8 py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.34),transparent_30%),radial-gradient(circle_at_right,rgba(4,231,254,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.16))] dark:bg-[radial-gradient(circle_at_top_left,rgba(148,198,145,0.18),transparent_28%),radial-gradient(circle_at_right,rgba(4,231,254,0.08),transparent_22%),linear-gradient(180deg,rgba(24,35,28,0.34),rgba(10,16,12,0.16))]" />
        <div className="relative space-y-4">
          <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Analytics</Badge>
          <div className="max-w-3xl">
            <h1 className="font-serif text-4xl tracking-tight text-secondary dark:text-foreground sm:text-5xl">Financial Overview</h1>
            <p className="mt-3 text-base text-muted-foreground">Track collections, pending dues, salary status, and expense structure with a clearer institute finance view.</p>
          </div>
        </div>
      </section>

      <FilterBar title="Financial Filters" description="Use month for KPI and summary sections, and year for the yearly expense trend." gridClass="md:grid-cols-3" actions={null}>
        {data?.filters.centres && data.filters.centres.length > 1 && <SelectFilter id="financial-centre" label="Centre" value={centreId || 'all'} options={centreOptions} onChange={(value) => { const next = value === 'all' ? '' : value; setFilter('centreId', next); applyFilters({ centreId: next }) }} />}
        <div className="space-y-2"><Label htmlFor="financial-month">Month</Label><Input id="financial-month" type="month" value={month} onChange={(event) => { const next = event.target.value; setFilter('month', next); applyFilters({ month: next }) }} /></div>
        <div className="space-y-2"><Label htmlFor="financial-year">Year</Label><Input id="financial-year" type="number" min="2000" max="2100" value={year} onChange={(event) => { const next = event.target.value; setFilter('year', next); applyFilters({ year: next }) }} /></div>
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected This Month" value={`Rs ${(data?.summary.totalCollected ?? 0).toLocaleString('en-IN')}`} icon={<Wallet className="h-5 w-5" />} accent="success" />
        <StatCard label="Pending Dues" value={`Rs ${(data?.summary.pendingDues ?? 0).toLocaleString('en-IN')}`} icon={<ReceiptText className="h-5 w-5" />} accent="warning" />
        <StatCard label="Total Expenses" value={`Rs ${(data?.summary.totalExpenses ?? 0).toLocaleString('en-IN')}`} icon={<TrendingDown className="h-5 w-5" />} accent="danger" />
        <StatCard label="Salary Paid" value={`Rs ${(data?.summary.salaryPaid ?? 0).toLocaleString('en-IN')}`} icon={<Banknote className="h-5 w-5" />} />
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-[28px] border border-secondary/10 bg-primary/10 dark:bg-white/[0.04]" />
      ) : (
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <SectionCard title="Expense Breakdown" description="Sorted by contribution for the selected month. This is the only category-level expense chart in the finance view.">
          {!data?.expenseBreakdown.length ? (
            <EmptyState title="No expense breakdown" message="No expense entries were recorded for the selected month." />
          ) : (
            <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
              <BarChart data={data.expenseBreakdown.map((row) => ({ name: titleCase(row.category), amount: row.amount }))} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="amount" fill="var(--color-expense)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </SectionCard>

        <SectionCard title="Yearly Expense Tracking" description="Month-wise expense bars with a running-total line for the selected year.">
          {!data?.yearlyExpenseTrend.length ? (
            <EmptyState title="No yearly expense trend" message="No expense records exist for the selected year." />
          ) : (
            <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
              <ComposedChart data={data.yearlyExpenseTrend.map((row) => ({ ...row, label: prettyMonth(row.month) }))}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis yAxisId="expense" tickLine={false} axisLine={false} />
                <YAxis yAxisId="running" orientation="right" tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar yAxisId="expense" dataKey="expense" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />
                <Line yAxisId="running" type="monotone" dataKey="running_total" stroke="var(--color-running_total)" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ChartContainer>
          )}
        </SectionCard>
      </div>
      )}

      <SectionCard title="Staff Salaries" description="Search or filter teachers and review paid-till month, pending months, and total pending amount. No extra charts are shown here to keep the page clean.">
        <div className="mb-4 grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="space-y-2"><Label htmlFor="salary-search">Search teacher</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="salary-search" value={salarySearch} onChange={(event) => setFilter('salarySearch', event.target.value)} className="pl-9" placeholder="Search teacher name" /></div></div>
          <SelectField id="financial-salary-batch-filter" label="Batch filter" value={salaryBatchFilter} onChange={(value) => setFilter('salaryBatchFilter', value)} options={batchOptions} />
        </div>

        {!filteredSalarySummaries.length ? (
          <EmptyState title="No salary summaries" message="No teacher salary summaries match the current filters." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredSalarySummaries.map((teacher) => (
              <div key={teacher.teacher_id} className="rounded-2xl border border-secondary/10 bg-white/55 dark:bg-white/[0.04] p-4">
                <div className="font-semibold text-secondary dark:text-foreground">{teacher.teacher_name}</div>
                <div className="mt-2 text-sm text-muted-foreground">Paid salary till month</div>
                <div className="font-medium text-secondary dark:text-foreground">{teacher.paid_till ? teacher.paid_till.slice(0, 7) : 'Not paid yet'}</div>
                <div className="mt-3 text-sm text-muted-foreground">Pending for months</div>
                <div className="font-medium text-secondary dark:text-foreground">{teacher.pending_months.length ? teacher.pending_months.map((monthKey) => monthKey.slice(0, 7)).join(', ') : 'None'}</div>
                <div className="mt-3 text-sm text-muted-foreground">Total pending amount</div>
                <div className="font-medium text-secondary dark:text-foreground">Rs {teacher.total_pending_amount.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Student Fees" description="Search or filter students and review paid-till month, pending months, and total pending amount. This section stays list-based for clarity.">
        <div className="mb-4 grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="space-y-2"><Label htmlFor="fee-search">Search student</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="fee-search" value={feeSearch} onChange={(event) => setFilter('feeSearch', event.target.value)} className="pl-9" placeholder="Search student name or code" /></div></div>
          <SelectField id="financial-fee-batch-filter" label="Batch filter" value={feeBatchFilter} onChange={(value) => setFilter('feeBatchFilter', value)} options={batchOptions} />
        </div>

        {!filteredFeeSummaries.length ? (
          <EmptyState title="No fee summaries" message="No student fee summaries match the current filters." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredFeeSummaries.map((student) => (
              <div key={student.student_id} className="rounded-2xl border border-secondary/10 bg-white/55 dark:bg-white/[0.04] p-4">
                <div className="font-semibold text-secondary dark:text-foreground">{student.student_name}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{student.student_code || '-'}</div>
                <div className="mt-2 text-sm text-muted-foreground">Paid fees till month</div>
                <div className="font-medium text-secondary dark:text-foreground">{student.paid_till ? student.paid_till.slice(0, 7) : 'Not paid yet'}</div>
                <div className="mt-3 text-sm text-muted-foreground">Pending for months</div>
                <div className="font-medium text-secondary dark:text-foreground">{student.pending_months.length ? student.pending_months.map((monthKey) => monthKey.slice(0, 7)).join(', ') : 'None'}</div>
                <div className="mt-3 text-sm text-muted-foreground">Total pending amount</div>
                <div className="font-medium text-secondary dark:text-foreground">Rs {student.total_pending_amount.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
