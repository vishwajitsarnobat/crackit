'use client'

/**
 * Manage Enrollments Page Component
 * Allows centre heads and admins to enroll students into specific batches.
 * Features: Adding students, viewing enrollments, and deactivating enrolled students.
 */

import { useState, useEffect } from 'react'
import { format, getDaysInMonth, getDate } from 'date-fns'
import { toast } from 'sonner'
import { Plus, Power, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { useManageData } from '@/lib/hooks/use-manage-data'
import { type Batch, type Centre, type AppRole } from '@/lib/types/entities'

type EnrollmentRow = {
    student_id: string; student_code: string; student_name: string;
    enrollment_id: string | null; batch_id: string | null; batch_name: string; centre_id: string | null;
    enrollment_date: string | null; status: string; monthly_fee: number | null
}

export function EnrollmentsPage({ role }: { role: AppRole }) {
    const [filterCentre, setFilterCentre] = useState('')
    const [filterBatch, setFilterBatch] = useState('')

    type EnrollmentsPayload = { enrollments: EnrollmentRow[], centres: Centre[], batches: Batch[] }
    const { data, loading, reload } = useManageData<EnrollmentsPayload>({
        endpoint: 'enrollments',
        initialFilters: { centreId: filterCentre, batchId: filterBatch }
    })

    const enrollments = data?.enrollments || []
    const centres = data?.centres || []
    const batches = data?.batches || []

    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [batchId, setBatchId] = useState('')
    const [studentToEnroll, setStudentToEnroll] = useState<{id: string, name: string, code: string} | null>(null)
    const [enrollDate, setEnrollDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [monthlyFee, setMonthlyFee] = useState('')



    function openAdd(student: EnrollmentRow) {
        if (batches.length === 0) {
            toast.error("No batches available. Create a batch first.")
            return
        }
        setStudentToEnroll({ id: student.student_id, name: student.student_name, code: student.student_code })
        setBatchId(batches[0].id)
        setEnrollDate(format(new Date(), 'yyyy-MM-dd'))
        setMonthlyFee('')
        setDialogOpen(true)
    }

    async function handleSave() {
        setSaving(true)
        try {
            const res = await fetch('/api/manage/enrollments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    student_id: studentToEnroll?.id, 
                    batch_id: batchId, 
                    enrollment_date: enrollDate, 
                    monthly_fee: monthlyFee 
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            
            toast.success(`Student enrolled! First invoice generated: ₹${data.amount_due}`)
            setDialogOpen(false)
            await reload({ centreId: filterCentre, batchId: filterBatch })
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Unknown error') }
        finally { setSaving(false) }
    }

    async function handleWithdraw(eId: string) {
        if (!confirm("Are you sure you want to withdraw this student? Their status will change immediately.")) return

        try {
            const res = await fetch('/api/manage/enrollments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: eId, status: 'withdrawn' })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Student withdrawn.')
            await reload({ centreId: filterCentre, batchId: filterBatch })
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Unknown error') }
    }

    function handleFilterCentre(v: string) {
        const val = v === 'all' ? '' : v
        setFilterCentre(val)
        setFilterBatch('')
        reload({ centreId: val, batchId: '' })
    }

    function handleFilterBatch(v: string) {
        const val = v === 'all' ? '' : v
        setFilterBatch(val)
        reload({ centreId: filterCentre, batchId: val })
    }

    // Dynamic Prorata preview
    let proratedEst = 0
    if (enrollDate && monthlyFee) {
        const d = new Date(enrollDate + 'T00:00:00')
        if (!isNaN(d.getTime())) {
            const dim = getDaysInMonth(d)
            const cd = getDate(d)
            const rem = dim - cd + 1
            const mf = parseFloat(monthlyFee)
            if (!isNaN(mf) && mf >= 0) {
                proratedEst = Math.round((mf * rem) / dim * 100) / 100
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-tight">Student Enrollments</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Enroll students into batches and set their monthly fee.</p>
                </div>
                {/* No global add button, enroll happens directly via table row */}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground">Centre:</Label>
                    <Select value={filterCentre || 'all'} onValueChange={handleFilterCentre}>
                        <SelectTrigger className="w-[200px]"><SelectValue placeholder="All centres" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All centres</SelectItem>
                            {centres.map(c => <SelectItem key={c.id} value={c.id}>{c.centre_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground">Batch:</Label>
                    <Select value={filterBatch || 'all'} onValueChange={handleFilterBatch}>
                        <SelectTrigger className="w-[240px]"><SelectValue placeholder="All batches" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All batches</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {batches
                                .filter(b => !filterCentre || b.centre_id === filterCentre)
                                .map(b => <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b bg-muted/30 px-5 py-3.5">
                    <CardTitle className="text-base tracking-tight">Enrollment Roster</CardTitle>
                    <CardDescription className="mt-0.5">{enrollments.length} enrollment(s) found</CardDescription>
                </div>
                {loading ? (
                    <div className="animate-pulse h-40 bg-muted/20" />
                ) : enrollments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <Users className="h-8 w-8 mb-4 opacity-20" />
                        <p className="text-sm">No students found matching the selected filters.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>Date Enrolled</TableHead>
                                <TableHead className="text-right">Monthly Fee</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right pr-4">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrollments.map((e, i) => (
                                <TableRow key={`${e.student_id}-${e.enrollment_id ?? 'none'}`} className="transition-colors hover:bg-muted/30">
                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{e.student_name}</div>
                                        <div className="text-xs font-mono text-muted-foreground">{e.student_code}</div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {e.batch_name === 'Unassigned' ? <span className="text-muted-foreground italic">Unassigned</span> : e.batch_name}
                                    </TableCell>
                                    <TableCell className="tabular-nums text-muted-foreground">
                                        {e.enrollment_date ? format(new Date(e.enrollment_date), 'dd MMM yyyy') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {e.monthly_fee ? `₹${e.monthly_fee}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={
                                            e.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                                            e.status === 'unassigned' ? 'bg-muted/50 text-muted-foreground border-border' :
                                            'bg-red-500/10 text-red-600 border-red-200'
                                        }>
                                            {e.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        {e.status === 'unassigned' && (
                                            <Button variant="outline" size="sm" onClick={() => openAdd(e)}>
                                                Enroll
                                            </Button>
                                        )}
                                        {e.status === 'active' && e.enrollment_id && (
                                            <Button variant="ghost" size="sm" onClick={() => handleWithdraw(e.enrollment_id!)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                                Withdraw
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <ManageDialog
                open={dialogOpen} onOpenChange={setDialogOpen}
                title="Enroll Student"
                description="Assign a student to a batch and set their fee."
                onSubmit={handleSave} saving={saving} submitLabel="Enroll & Invoice"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Enroll Student</Label>
                        <div className="p-3 border rounded-md bg-muted/20">
                            <div className="font-medium">{studentToEnroll?.name}</div>
                            <div className="text-sm font-mono text-muted-foreground">{studentToEnroll?.code}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Select Batch *</Label>
                        <Select value={batchId} onValueChange={setBatchId}>
                            <SelectTrigger><SelectValue placeholder="Choose batch" /></SelectTrigger>
                            <SelectContent>
                                {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edate">Enrollment Date *</Label>
                            <Input id="edate" type="date" value={enrollDate} onChange={e => setEnrollDate(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fee">Monthly Fee (₹) *</Label>
                            <Input id="fee" type="number" min="0" step="0.01" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} placeholder="e.g. 5000" required />
                        </div>
                    </div>

                    {parseFloat(monthlyFee) > 0 && (
                        <div className="p-3 bg-muted/50 rounded-lg text-sm border">
                            <div className="flex justify-between items-center text-muted-foreground mb-1">
                                <span>Prorated first invoice:</span>
                                <span>Prorated for remaining days in month</span>
                            </div>
                            <div className="flex justify-between items-center font-medium">
                                <span>Amount Due:</span>
                                <span className="text-lg text-emerald-600 dark:text-emerald-400 tabular-nums pb-0.5">₹{proratedEst.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </ManageDialog>
        </div>
    )
}
