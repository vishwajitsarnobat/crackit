'use client'

/**
 * Expenses Page Component
 * Allows accountants and admins to log monthly expenses for a specific centre.
 * Features: Category-wise expense entry (Rent, Electricity, etc.), description notes, and cost calculation.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AppRole, CentreExpense } from '@/lib/types/entities'

type CentreOption = { id: string; centre_name: string; centre_code: string }

const CATEGORIES = [
    { value: 'rent', label: 'Rent' },
    { value: 'electricity_bill', label: 'Electricity Bill' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'internet_bill', label: 'Internet Bill' },
    { value: 'miscellaneous', label: 'Miscellaneous' },
] as const

type ExpenseRow = {
    category: string
    label: string
    amount: string
    description: string
}

export function ExpensesPage({ role }: { role: AppRole }) {
    const [centres, setCentres] = useState<CentreOption[]>([])
    const [selectedCentre, setSelectedCentre] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
    const [expenses, setExpenses] = useState<ExpenseRow[]>(
        CATEGORIES.map(c => ({ category: c.value, label: c.label, amount: '', description: '' }))
    )
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/data-entry/expenses')
            const json = await res.json()
            if (res.ok) setCentres(json.centres ?? [])
            setLoading(false)
        }
        load()
    }, [])

    const loadExpenses = useCallback(async (centreId: string, month: string) => {
        setLoading(true)
        try {
            const monthYear = `${month}-01`
            const res = await fetch(`/api/data-entry/expenses?centre_id=${centreId}&month_year=${monthYear}`)
            const json = await res.json()
            if (res.ok) {
                const existing = json.expenses ?? []
                const existingMap = new Map(existing.map((e: CentreExpense) => [e.category, e]))

                setExpenses(CATEGORIES.map(c => {
                    const ex = existingMap.get(c.value) as CentreExpense | undefined
                    return {
                        category: c.value,
                        label: c.label,
                        amount: ex ? String(ex.amount) : '',
                        description: ex?.description ?? '',
                    }
                }))
            }
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedCentre && selectedMonth) loadExpenses(selectedCentre, selectedMonth)
    }, [selectedCentre, selectedMonth, loadExpenses])

    function updateExpense(index: number, field: 'amount' | 'description', value: string) {
        setExpenses(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
    }

    async function handleSave() {
        setSaving(true)
        try {
            const monthYear = `${selectedMonth}-01`
            const records = expenses
                .filter(e => e.amount && parseFloat(e.amount) > 0)
                .map(e => ({
                    category: e.category,
                    amount: parseFloat(e.amount),
                    description: e.description || null,
                }))

            if (records.length === 0) {
                toast.error('Enter at least one expense.')
                setSaving(false)
                return
            }

            const res = await fetch('/api/data-entry/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ centre_id: selectedCentre, month_year: monthYear, expenses: records }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            toast.success(`${json.count} expense(s) saved`)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Expense Logging</h1>
                <p className="mt-1 text-sm text-muted-foreground">Record monthly expenses per centre and category.</p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2 min-w-[220px]">
                    <Label>Centre</Label>
                    <Select value={selectedCentre} onValueChange={setSelectedCentre}>
                        <SelectTrigger><SelectValue placeholder="Select centre…" /></SelectTrigger>
                        <SelectContent>
                            {centres.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.centre_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Month</Label>
                    <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-[180px]" />
                </div>
            </div>

            {selectedCentre && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3.5 flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base tracking-tight">Expense Categories</CardTitle>
                            <CardDescription className="mt-0.5">Total: ₹{total.toLocaleString('en-IN')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                            <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save'}
                        </Button>
                    </div>
                    {loading ? (
                        <div className="animate-pulse h-60 bg-muted/20" />
                    ) : (
                        <div className="divide-y">
                            {expenses.map((exp, i) => (
                                <div key={exp.category} className="px-5 py-4 grid grid-cols-[1fr_160px_1fr] gap-4 items-start">
                                    <div className="flex items-center gap-2 pt-2">
                                        <span className="text-sm font-medium">{exp.label}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Amount (₹)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={exp.amount}
                                            onChange={e => updateExpense(i, 'amount', e.target.value)}
                                            placeholder="0"
                                            className="tabular-nums"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Description</Label>
                                        <Textarea
                                            value={exp.description}
                                            onChange={e => updateExpense(i, 'description', e.target.value)}
                                            placeholder="Optional notes…"
                                            rows={1}
                                            className="resize-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
