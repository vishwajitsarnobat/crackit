'use client'

/**
 * Salary Management Page Component
 * Allows accountants and admins to record monthly salaries for centre staff using their user IDs.
 * Features: Salary generation, payment recording, and status tracking (Paid, Partial, Unpaid).
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppRole } from '@/lib/types/entities'

type CentreOption = { id: string; centre_name: string; centre_code: string }
type StaffRow = {
    user_id: string
    staff_name: string
    role: string
    amount_due: string
    amount_paid: string
    payment_date: string
}

export function SalariesPage({ role }: { role: AppRole }) {
    const [centres, setCentres] = useState<CentreOption[]>([])
    const [selectedCentre, setSelectedCentre] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
    const [staff, setStaff] = useState<StaffRow[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/data-entry/salaries')
            const json = await res.json()
            if (res.ok) setCentres(json.centres ?? [])
            setLoading(false)
        }
        load()
    }, [])

    const loadStaff = useCallback(async (centreId: string, month: string) => {
        setLoading(true)
        try {
            const monthYear = `${month}-01`
            const res = await fetch(`/api/data-entry/salaries?centre_id=${centreId}&month_year=${monthYear}`)
            const json = await res.json()
            if (res.ok) {
                setStaff((json.staff ?? []).map((s: any) => ({
                    user_id: s.user_id,
                    staff_name: s.staff_name,
                    role: s.role ?? '',
                    amount_due: s.amount_due ? String(s.amount_due) : '',
                    amount_paid: s.amount_paid ? String(s.amount_paid) : '',
                    payment_date: s.payment_date ?? '',
                })))
            }
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedCentre && selectedMonth) loadStaff(selectedCentre, selectedMonth)
    }, [selectedCentre, selectedMonth, loadStaff])

    function updateStaff(userId: string, field: keyof StaffRow, value: string) {
        setStaff(prev => prev.map(s => s.user_id === userId ? { ...s, [field]: value } : s))
    }

    async function handleSave() {
        setSaving(true)
        try {
            const monthYear = `${selectedMonth}-01`
            const salaries = staff
                .filter(s => s.amount_due && parseFloat(s.amount_due) > 0)
                .map(s => ({
                    user_id: s.user_id,
                    amount_due: parseFloat(s.amount_due),
                    amount_paid: parseFloat(s.amount_paid) || 0,
                    payment_date: s.payment_date || null,
                }))

            if (salaries.length === 0) {
                toast.error('Enter at least one salary record.')
                setSaving(false)
                return
            }

            const res = await fetch('/api/data-entry/salaries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ centre_id: selectedCentre, month_year: monthYear, salaries }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            toast.success(`${json.count} salary record(s) saved`)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    function getStatus(s: StaffRow): { label: string; color: string } {
        const due = parseFloat(s.amount_due) || 0
        const paid = parseFloat(s.amount_paid) || 0
        if (due <= 0) return { label: 'N/A', color: 'text-muted-foreground' }
        if (paid >= due) return { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' }
        if (paid > 0) return { label: 'Partial', color: 'bg-amber-500/10 text-amber-600 border-amber-200' }
        return { label: 'Unpaid', color: 'bg-red-500/10 text-red-600 border-red-200' }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Salary Management</h1>
                <p className="mt-1 text-sm text-muted-foreground">Record staff salaries by centre and month.</p>
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
                            <CardTitle className="text-base tracking-tight">Staff Salaries</CardTitle>
                            <CardDescription className="mt-0.5">{staff.length} staff member(s)</CardDescription>
                        </div>
                        <Button size="sm" onClick={handleSave} disabled={saving || staff.length === 0}>
                            <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save'}
                        </Button>
                    </div>
                    {loading ? (
                        <div className="animate-pulse h-40 bg-muted/20" />
                    ) : staff.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No staff assigned to this centre.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="w-[130px]">Due (₹)</TableHead>
                                    <TableHead className="w-[130px]">Paid (₹)</TableHead>
                                    <TableHead className="w-[140px]">Payment Date</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff.map((s, i) => {
                                    const status = getStatus(s)
                                    return (
                                        <TableRow key={s.user_id}>
                                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="font-medium">{s.staff_name}</TableCell>
                                            <TableCell className="text-muted-foreground capitalize text-sm">{s.role}</TableCell>
                                            <TableCell>
                                                <Input type="number" min={0} value={s.amount_due} onChange={e => updateStaff(s.user_id, 'amount_due', e.target.value)} className="tabular-nums" placeholder="0" />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" min={0} value={s.amount_paid} onChange={e => updateStaff(s.user_id, 'amount_paid', e.target.value)} className="tabular-nums" placeholder="0" />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="date" value={s.payment_date} onChange={e => updateStaff(s.user_id, 'payment_date', e.target.value)} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={status.color}>{status.label}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}
        </div>
    )
}
