'use client'

/**
 * Fee Management Page Component
 * Allows accountants and admins to generate monthly invoices and record fee payments for students.
 * Features: Invoice creation, partial/full payment recording, receipt generation, and status tracking (Paid, Overdue, etc.).
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, CreditCard, Receipt } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ManageDialog } from '@/components/manage/manage-dialog'
import type { AppRole, StudentInvoice, FeeTransaction } from '@/lib/types/entities'

type BatchOption = { id: string; batch_name: string; batch_code: string; centre_name: string }

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
    partial: 'bg-blue-500/10 text-blue-600 border-blue-200',
    paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    overdue: 'bg-red-500/10 text-red-600 border-red-200',
}

export function FeesPage({ role }: { role: AppRole }) {
    const [batches, setBatches] = useState<BatchOption[]>([])
    const [selectedBatch, setSelectedBatch] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [invoices, setInvoices] = useState<StudentInvoice[]>([])
    const [transactions, setTransactions] = useState<FeeTransaction[]>([])
    const [selectedInvoice, setSelectedInvoice] = useState<StudentInvoice | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Create invoice dialog
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
    const [invStudentId, setInvStudentId] = useState('')
    const [invMonthYear, setInvMonthYear] = useState(format(new Date(), 'yyyy-MM'))
    const [invMonthlyFee, setInvMonthlyFee] = useState('')
    const [invAmountDue, setInvAmountDue] = useState('')

    // Record payment dialog
    const [payDialogOpen, setPayDialogOpen] = useState(false)
    const [payAmount, setPayAmount] = useState('')
    const [payMode, setPayMode] = useState<'cash' | 'online'>('cash')

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/data-entry/fees')
            const json = await res.json()
            if (res.ok) setBatches(json.batches ?? [])
            setLoading(false)
        }
        load()
    }, [])

    const loadInvoices = useCallback(async () => {
        if (!selectedBatch) return
        setLoading(true)
        try {
            const params = new URLSearchParams({ batch_id: selectedBatch })
            if (selectedMonth) params.set('month_year', `${selectedMonth}-01`)
            if (statusFilter !== 'all') params.set('status', statusFilter)

            const res = await fetch(`/api/data-entry/fees?${params}`)
            const json = await res.json()
            if (res.ok) setInvoices(json.invoices ?? [])
        } finally {
            setLoading(false)
        }
    }, [selectedBatch, selectedMonth, statusFilter])

    useEffect(() => {
        if (selectedBatch) loadInvoices()
    }, [selectedBatch, loadInvoices])

    async function loadTransactions(inv: StudentInvoice) {
        setSelectedInvoice(inv)
        const res = await fetch(`/api/data-entry/fees?invoice_id=${inv.id}`)
        const json = await res.json()
        if (res.ok) setTransactions(json.transactions ?? [])
    }

    async function handleCreateInvoice() {
        setSaving(true)
        try {
            const res = await fetch('/api/data-entry/fees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: invStudentId,
                    batch_id: selectedBatch,
                    month_year: `${invMonthYear}-01`,
                    monthly_fee: parseFloat(invMonthlyFee),
                    amount_due: parseFloat(invAmountDue || invMonthlyFee),
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            toast.success('Invoice created')
            setInvoiceDialogOpen(false)
            setInvStudentId(''); setInvMonthlyFee(''); setInvAmountDue('')
            loadInvoices()
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to create invoice')
        } finally {
            setSaving(false)
        }
    }

    async function handleRecordPayment() {
        if (!selectedInvoice) return
        setSaving(true)
        try {
            const res = await fetch('/api/data-entry/fees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_invoice_id: selectedInvoice.id,
                    amount: parseFloat(payAmount),
                    payment_mode: payMode,
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            toast.success(`Payment recorded · Receipt: ${json.transaction?.receipt_number || 'Generated'}`)
            setPayDialogOpen(false)
            setPayAmount('')
            loadTransactions(selectedInvoice)
            loadInvoices()
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to record payment')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Fee Management</h1>
                <p className="mt-1 text-sm text-muted-foreground">Generate invoices, record fee payments, and track payment status.</p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2 min-w-[220px]">
                    <Label>Batch</Label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                        <SelectTrigger><SelectValue placeholder="Select batch…" /></SelectTrigger>
                        <SelectContent>
                            {batches.map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.batch_name} — {b.centre_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Month</Label>
                    <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-[180px]" />
                </div>
                <div className="space-y-2 min-w-[150px]">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {selectedBatch && (
                    <Button onClick={() => setInvoiceDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
                )}
            </div>

            {selectedBatch && (
                <Tabs defaultValue="invoices" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="invoices" className="flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5" />Invoices</TabsTrigger>
                        <TabsTrigger value="payments" className="flex items-center gap-1.5" disabled={!selectedInvoice}><CreditCard className="h-3.5 w-3.5" />Payments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="invoices">
                        <Card className="gap-0 py-0 overflow-hidden">
                            <div className="border-b bg-muted/30 px-5 py-3.5">
                                <CardTitle className="text-base tracking-tight">Student Invoices</CardTitle>
                                <CardDescription className="mt-0.5">{invoices.length} invoice(s)</CardDescription>
                            </div>
                            {loading ? (
                                <div className="animate-pulse h-40 bg-muted/20" />
                            ) : invoices.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">No invoices found.</div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Month</TableHead>
                                            <TableHead className="text-right">Due (₹)</TableHead>
                                            <TableHead className="text-right">Paid (₹)</TableHead>
                                            <TableHead className="text-right">Discount (₹)</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right pr-4">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map((inv, i) => (
                                            <TableRow key={inv.id} className="transition-colors hover:bg-muted/30">
                                                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{inv.student_name}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{inv.student_code || ''}</div>
                                                </TableCell>
                                                <TableCell className="tabular-nums">{inv.month_year?.slice(0, 7)}</TableCell>
                                                <TableCell className="text-right tabular-nums">₹{Number(inv.amount_due).toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right tabular-nums">₹{Number(inv.amount_paid).toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right tabular-nums">₹{Number(inv.amount_discount).toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={STATUS_COLORS[inv.payment_status] || ''}>
                                                        {inv.payment_status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-4">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => { loadTransactions(inv); }}>View</Button>
                                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(inv); setPayDialogOpen(true) }}>
                                                            <CreditCard className="h-3.5 w-3.5 mr-1" />Pay
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Card>
                    </TabsContent>

                    <TabsContent value="payments">
                        {selectedInvoice && (
                            <Card className="gap-0 py-0 overflow-hidden">
                                <div className="border-b bg-muted/30 px-5 py-3.5">
                                    <CardTitle className="text-base tracking-tight">Payment History — {selectedInvoice.student_name}</CardTitle>
                                    <CardDescription className="mt-0.5">Invoice: {selectedInvoice.month_year?.slice(0, 7)} | Due: ₹{Number(selectedInvoice.amount_due).toLocaleString('en-IN')}</CardDescription>
                                </div>
                                {transactions.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm">No payments recorded yet.</div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>#</TableHead>
                                                <TableHead>Receipt No.</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Amount (₹)</TableHead>
                                                <TableHead className="text-center">Mode</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((t, i) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                                    <TableCell className="font-mono text-xs">{t.receipt_number}</TableCell>
                                                    <TableCell className="tabular-nums">{t.payment_date}</TableCell>
                                                    <TableCell className="text-right tabular-nums font-medium">₹{Number(t.amount).toLocaleString('en-IN')}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={t.payment_mode === 'online' ? 'bg-blue-500/10 text-blue-600 border-blue-200' : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'}>
                                                            {t.payment_mode}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            {/* Create Invoice Dialog */}
            <ManageDialog
                open={invoiceDialogOpen}
                onOpenChange={setInvoiceDialogOpen}
                title="Create Invoice"
                description="Generate a fee invoice for a student."
                onSubmit={handleCreateInvoice}
                saving={saving}
                submitLabel="Create"
            >
                <div className="space-y-2">
                    <Label>Student ID *</Label>
                    <Input value={invStudentId} onChange={e => setInvStudentId(e.target.value)} placeholder="Student UUID" required />
                </div>
                <div className="space-y-2">
                    <Label>Month *</Label>
                    <Input type="month" value={invMonthYear} onChange={e => setInvMonthYear(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label>Monthly Fee (₹) *</Label>
                        <Input type="number" min={0} value={invMonthlyFee} onChange={e => setInvMonthlyFee(e.target.value)} placeholder="e.g. 5000" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Amount Due (₹)</Label>
                        <Input type="number" min={0} value={invAmountDue} onChange={e => setInvAmountDue(e.target.value)} placeholder="Same as fee if blank" />
                    </div>
                </div>
            </ManageDialog>

            {/* Record Payment Dialog */}
            <ManageDialog
                open={payDialogOpen}
                onOpenChange={setPayDialogOpen}
                title="Record Payment"
                description={selectedInvoice ? `Recording payment for ${selectedInvoice.student_name} — ${selectedInvoice.month_year?.slice(0, 7)}` : ''}
                onSubmit={handleRecordPayment}
                saving={saving}
                submitLabel="Record"
            >
                <div className="space-y-2">
                    <Label>Amount (₹) *</Label>
                    <Input type="number" min={1} value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="e.g. 5000" required />
                </div>
                <div className="space-y-2">
                    <Label>Payment Mode *</Label>
                    <Select value={payMode} onValueChange={v => setPayMode(v as 'cash' | 'online')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </ManageDialog>
        </div>
    )
}
