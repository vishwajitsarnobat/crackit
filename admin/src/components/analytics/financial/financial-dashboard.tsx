'use client'

/**
 * Financial Dashboard Component
 * Data visualization for revenue (fees collected), expenses, and staff salaries.
 * Features: KPI stat cards, monthly/yearly trend line charts, expense donut charts, and detailed data tables.
 */

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ArrowUpRight, ArrowDownRight, Wallet, ReceiptText, Banknote } from 'lucide-react'
import {
    Pie, PieChart, Cell,
    Bar, BarChart, XAxis, YAxis,
    Line, LineChart, CartesianGrid,
    ComposedChart
} from 'recharts'
import { toast } from 'sonner'

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

import { StatCard } from '@/components/analytics/shared/stat-card'
import { FilterBar, SelectFilter } from '@/components/analytics/shared/filter-bar'
import { EmptyState } from '@/components/analytics/shared/empty-state'
import { SectionCard } from '@/components/analytics/shared/section-card'

/* ── Types ────────────────────────────────────────── */

type ExpenseRow = {
    id: string; centre_id: string; month_year: string
    category: string; amount: number; description: string | null
}
type SalaryRow = {
    id: string; staff_name: string; centre_name: string
    amount_due: number; amount_paid: number; status: string; payment_date: string | null; month_year: string
}
type InvoiceRow = {
    id: string; student_name: string; student_code: string | null; batch_name: string
    amount_due: number; amount_paid: number; payment_status: string; month_year: string
}
type TrendPoint = { month: string; revenue: number; expenses: number; salaries: number; profit: number }

type FinancialPayload = {
    viewMode: 'month' | 'year'
    filters: { centres: { id: string; centre_name: string }[] }
    summary: {
        totalRevenue: number; totalExpenses: number; totalSalariesPaid: number
        netProfit: number; pendingReceivables: number; expectedRevenue: number
    }
    visualizations: {
        expenseBreakdown: { name: string; value: number }[]
        collectionStatus: Record<string, number>
    }
    monthlyTrend: TrendPoint[]
    tables: { expenses: ExpenseRow[]; salaries: SalaryRow[]; invoices: InvoiceRow[] }
}

/* ── Helpers ───────────────────────────────────────── */

const formatInr = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

const fmtCategory = (cat: string) =>
    cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

const monthLabel = (m: string) => {
    const [, mm] = m.split('-')
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return names[parseInt(mm) - 1] ?? m
}

/* ── Charts ───────────────────────────────────────── */

const EXPENSE_COLORS: Record<string, string> = {
    rent: '#3b82f6', electricity_bill: '#f59e0b', internet_bill: '#10b981',
    stationery: '#8b5cf6', miscellaneous: '#64748b'
}

function ExpenseDonutChart({ data }: { data: FinancialPayload['visualizations']['expenseBreakdown'] }) {
    if (!data.length) return <EmptyState title="No expenses" message="No expenses recorded for this period." />
    const formattedData = data.map(d => ({ ...d, displayName: fmtCategory(d.name), color: EXPENSE_COLORS[d.name] || '#94a3b8' }))
    const config = Object.fromEntries(formattedData.map(d => [d.name, { label: d.displayName, color: d.color }])) satisfies ChartConfig

    return (
        <ChartContainer config={config} className="mx-auto aspect-square max-h-[300px]">
            <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={formattedData} dataKey="value" nameKey="displayName" innerRadius={60} strokeWidth={2} paddingAngle={2}>
                    {formattedData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                </Pie>
            </PieChart>
        </ChartContainer>
    )
}

const STATUS_COLORS: Record<string, { label: string; color: string }> = {
    paid: { label: 'Paid', color: '#10b981' }, partial: { label: 'Partial', color: '#f59e0b' },
    pending: { label: 'Pending', color: '#64748b' }, overdue: { label: 'Overdue', color: '#ef4444' }
}

function CollectionStatusBar({ data }: { data: FinancialPayload['visualizations']['collectionStatus'] }) {
    if (Object.keys(data).length === 0) return <EmptyState title="No invoices" message="No invoices issued for this period." />
    const total = Object.values(data).reduce((s, v) => s + v, 0)
    const order = ['paid', 'partial', 'pending', 'overdue']
    const stackedData = [order.reduce((acc, key) => { if (data[key]) acc[key] = data[key]; return acc }, {} as Record<string, number>)]
    const config = Object.fromEntries(order.map(key => [key, STATUS_COLORS[key]])) satisfies ChartConfig

    return (
        <div className="flex flex-col h-full justify-center space-y-4">
            <ChartContainer config={config} className="h-[120px] w-full mt-4">
                <BarChart data={stackedData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis type="number" hide domain={[0, total]} />
                    <YAxis type="category" hide />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    {order.map(key => data[key] ? (
                        <Bar key={key} dataKey={key} stackId="a" fill={`var(--color-${key})`} maxBarSize={40} radius={
                            key === order.find(k => data[k]) && key === [...order].reverse().find(k => data[k]) ? 4 :
                                key === order.find(k => data[k]) ? [4, 0, 0, 4] :
                                    key === [...order].reverse().find(k => data[k]) ? [0, 4, 4, 0] : 0
                        } />
                    ) : null)}
                </BarChart>
            </ChartContainer>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm px-4">
                {order.map(key => data[key] ? (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS[key].color }} />
                        <span className="text-muted-foreground">{STATUS_COLORS[key].label}</span>
                        <span className="font-medium">({data[key]})</span>
                    </div>
                ) : null)}
            </div>
        </div>
    )
}

/* ── Monthly Trend (Yearly view) ─────────────────── */

const trendConfig = {
    revenue: { label: 'Revenue', color: '#10b981' },
    expenses: { label: 'Expenses', color: '#f59e0b' },
    salaries: { label: 'Salaries', color: '#3b82f6' },
    profit: { label: 'Net Profit', color: '#8b5cf6' },
} satisfies ChartConfig

function MonthlyTrendChart({ data }: { data: TrendPoint[] }) {
    if (!data.length) return <EmptyState title="No data" message="No monthly data available for this year." />
    const chartData = data.map(d => ({ ...d, monthLabel: monthLabel(d.month) }))

    return (
        <ChartContainer config={trendConfig} className="h-[300px] w-full">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="salaries" stroke="var(--color-salaries)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
        </ChartContainer>
    )
}

/* ── Net Profit Bar + Line (Yearly view) ─────────── */

const profitConfig = {
    profit: { label: 'Net Profit', color: '#8b5cf6' },
} satisfies ChartConfig

function ProfitBarLineChart({ data }: { data: TrendPoint[] }) {
    if (!data.length) return <EmptyState title="No data" message="No monthly data available for this year." />
    const chartData = data.map(d => ({
        monthLabel: monthLabel(d.month),
        profit: d.profit,
        fill: d.profit >= 0 ? '#10b981' : '#ef4444',
    }))

    return (
        <ChartContainer config={profitConfig} className="h-[300px] w-full">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, i) => (
                        <Cell key={`bar-${i}`} fill={entry.fill} />
                    ))}
                </Bar>
                <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: '#8b5cf6' }} tooltipType="none" legendType="none" />
            </ComposedChart>
        </ChartContainer>
    )
}

/* ── Status Badge ────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        paid: 'text-emerald-500 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20',
        partial: 'text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-950/20',
        overdue: 'text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-950/20',
        pending: 'text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-950/20',
        unpaid: 'text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-950/20',
    }
    return <Badge variant="outline" className={styles[status] ?? 'text-slate-500'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
}

/* ── Data Tables ──────────────────────────────────── */

function DetailedTabs({ data }: { data: FinancialPayload['tables'] }) {
    return (
        <Tabs defaultValue="invoices" className="w-full">
            <div className="px-5 py-3">
                <TabsList>
                    <TabsTrigger value="invoices">Fee Collections</TabsTrigger>
                    <TabsTrigger value="expenses">Centre Expenses</TabsTrigger>
                    <TabsTrigger value="salaries">Staff Salaries</TabsTrigger>
                </TabsList>
            </div>

            {/* Invoices */}
            <TabsContent value="invoices" className="p-0 m-0 border-none outline-none">
                {data.invoices.length === 0 ? <div className="p-5"><EmptyState title="No invoices" message="No student invoices found for this period." /></div> : (
                    <div className="overflow-hidden rounded-lg border m-4">
                        <ScrollArea className="w-full">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="w-10">#</TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead>Month</TableHead>
                                        <TableHead className="text-right">Amount Due</TableHead>
                                        <TableHead className="text-right">Amount Paid</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.invoices.map((inv, i) => (
                                        <TableRow key={inv.id} className={`transition-colors hover:bg-muted/30 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                                        {inv.student_name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium leading-none">{inv.student_name}</p>
                                                        {inv.student_code && <p className="text-xs text-muted-foreground mt-1">{inv.student_code}</p>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{inv.batch_name}</TableCell>
                                            <TableCell className="text-muted-foreground">{monthLabel(inv.month_year)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatInr(Number(inv.amount_due))}</TableCell>
                                            <TableCell className="text-right tabular-nums font-medium">{formatInr(Number(inv.amount_paid))}</TableCell>
                                            <TableCell className="text-center"><StatusBadge status={inv.payment_status} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                )}
            </TabsContent>

            {/* Expenses */}
            <TabsContent value="expenses" className="p-0 m-0 border-none outline-none">
                {data.expenses.length === 0 ? <div className="p-5"><EmptyState title="No expenses" message="No centre expenses recorded for this period." /></div> : (
                    <div className="overflow-hidden rounded-lg border m-4">
                        <ScrollArea className="w-full">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="w-10">#</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Month</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.expenses.map((exp, i) => (
                                        <TableRow key={exp.id || i} className={`transition-colors hover:bg-muted/30 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="font-medium">{fmtCategory(exp.category)}</TableCell>
                                            <TableCell className="text-muted-foreground">{exp.description || '-'}</TableCell>
                                            <TableCell className="text-muted-foreground">{monthLabel(exp.month_year)}</TableCell>
                                            <TableCell className="text-right tabular-nums font-medium">{formatInr(Number(exp.amount))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                )}
            </TabsContent>

            {/* Salaries */}
            <TabsContent value="salaries" className="p-0 m-0 border-none outline-none">
                {data.salaries.length === 0 ? <div className="p-5"><EmptyState title="No salaries" message="No staff salaries recorded for this period." /></div> : (
                    <div className="overflow-hidden rounded-lg border m-4">
                        <ScrollArea className="w-full">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="w-10">#</TableHead>
                                        <TableHead>Staff Name</TableHead>
                                        <TableHead>Centre</TableHead>
                                        <TableHead>Month</TableHead>
                                        <TableHead className="text-right">Amount Due</TableHead>
                                        <TableHead className="text-right">Amount Paid</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.salaries.map((sal, i) => (
                                        <TableRow key={sal.id || i} className={`transition-colors hover:bg-muted/30 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                                        {sal.staff_name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <p className="font-medium">{sal.staff_name}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{sal.centre_name}</TableCell>
                                            <TableCell className="text-muted-foreground">{monthLabel(sal.month_year)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatInr(Number(sal.amount_due))}</TableCell>
                                            <TableCell className="text-right tabular-nums font-medium">{formatInr(Number(sal.amount_paid))}</TableCell>
                                            <TableCell className="text-center"><StatusBadge status={sal.status} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    )
}

/* ── Main Dashboard ───────────────────────────────── */

export function FinancialDashboard() {
    const [data, setData] = useState<FinancialPayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [centreId, setCentreId] = useState('')
    const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
    const [monthOffset, setMonthOffset] = useState(0)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

    async function loadData() {
        setLoading(true)
        const params = new URLSearchParams()
        if (centreId) params.set('centreId', centreId)

        if (viewMode === 'year') {
            params.set('year', selectedYear)
        } else {
            const targetDate = new Date()
            targetDate.setMonth(targetDate.getMonth() + monthOffset)
            params.set('month', format(targetDate, 'yyyy-MM'))
        }

        const res = await fetch(`/api/analytics/financials?${params}`, { cache: 'no-store' })
        const payload = await res.json().catch(() => null)
        setLoading(false)

        if (!res.ok || !payload) {
            toast.error(payload?.error ?? 'Failed to load financial data.')
            return
        }
        setData(payload)
    }

    useEffect(() => { loadData() }, [centreId, monthOffset, viewMode, selectedYear])

    const centreOpts = [{ value: 'all', label: 'All centres' }, ...(data?.filters.centres.map(c => ({ value: c.id, label: c.centre_name })) ?? [])]

    const monthOpts = Array.from({ length: 12 }).map((_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        return { value: (-i).toString(), label: format(d, 'MMMM yyyy') }
    })

    const yearOpts = Array.from({ length: 5 }).map((_, i) => {
        const y = (new Date().getFullYear() - i).toString()
        return { value: y, label: y }
    })

    const summary = data?.summary ?? {
        totalRevenue: 0, totalExpenses: 0, totalSalariesPaid: 0,
        netProfit: 0, pendingReceivables: 0, expectedRevenue: 0
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Financial Overview</h1>
                <p className="mt-1 text-sm text-muted-foreground">Monitor revenue, expenses, and overall centre profitability.</p>
            </div>

            {/* Filters */}
            <FilterBar description="Filter by centre and time period.">
                <SelectFilter id="f-centre" label="Centre" value={centreId || 'all'} options={centreOpts} onChange={v => setCentreId(v === 'all' ? '' : v)} />
                <SelectFilter id="f-view" label="View" value={viewMode} options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} onChange={v => setViewMode(v as 'month' | 'year')} />
                {viewMode === 'month' ? (
                    <SelectFilter id="f-month" label="Month" value={monthOffset.toString()} options={monthOpts} onChange={v => setMonthOffset(parseInt(v))} />
                ) : (
                    <SelectFilter id="f-year" label="Year" value={selectedYear} options={yearOpts} onChange={setSelectedYear} />
                )}
            </FilterBar>

            {/* KPI Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Net Profit"
                    value={formatInr(summary.netProfit)}
                    icon={summary.netProfit >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    accent={summary.netProfit >= 0 ? 'success' : 'danger'}
                />
                <StatCard
                    label="Revenue (Fees Collected)"
                    value={formatInr(summary.totalRevenue)}
                    icon={<Wallet className="h-5 w-5" />}
                />
                <StatCard
                    label="Total Outflow"
                    value={formatInr(summary.totalExpenses + summary.totalSalariesPaid)}
                    icon={<Banknote className="h-5 w-5" />}
                    accent={summary.totalExpenses + summary.totalSalariesPaid > 0 ? 'danger' : 'default'}
                />
                <StatCard
                    label="Pending Receivables"
                    value={formatInr(summary.pendingReceivables)}
                    icon={<ReceiptText className="h-5 w-5" />}
                    accent={summary.pendingReceivables > 0 ? 'warning' : 'default'}
                />
            </div>

            {/* Monthly Trend + Profit Chart (yearly view only) */}
            {viewMode === 'year' && (
                <>
                    <SectionCard title="Monthly Trend" description="Month-by-month revenue, expenses, salaries, and net profit.">
                        <MonthlyTrendChart data={data?.monthlyTrend ?? []} />
                    </SectionCard>
                    <SectionCard title="Net Profit" description="Monthly profit/loss with trend line — green for profit, red for loss.">
                        <ProfitBarLineChart data={data?.monthlyTrend ?? []} />
                    </SectionCard>
                </>
            )}

            {/* Visualizations */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <SectionCard title="Expense Breakdown" description={`Distribution of centre expenses by category.`}>
                    <ExpenseDonutChart data={data?.visualizations?.expenseBreakdown ?? []} />
                </SectionCard>
                <SectionCard title="Fee Collection Status" description={`Breakdown of student invoices by payment status.`}>
                    <CollectionStatusBar data={data?.visualizations?.collectionStatus ?? {}} />
                </SectionCard>
            </div>

            {/* Data Tables */}
            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b bg-muted/30 px-5 py-3.5">
                    <CardTitle className="text-base tracking-tight">Detailed Reports</CardTitle>
                    <CardDescription className="mt-0.5">Line-by-line financial records for the selected period.</CardDescription>
                </div>
                <DetailedTabs data={data?.tables ?? { expenses: [], salaries: [], invoices: [] }} />
            </Card>
        </div>
    )
}
