'use client'

/**
 * Manage Teachers Page Component
 * Allows centre heads and admins to assign teachers to specific batches.
 * Features: Assigning teachers to a batch and unassigning them.
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { useManageData } from '@/lib/hooks/use-manage-data'
import { type Batch, type Centre, type TeacherAssignment as TeacherRow, type AppRole } from '@/lib/types/entities'

type Teacher = { id: string; full_name: string }

export function TeachersPage({ role }: { role: AppRole }) {
    const [filterCentre, setFilterCentre] = useState('')

    type TeachersPayload = { assignments: TeacherRow[], centres: Centre[], batches: Batch[], teachers: Teacher[] }
    const { data, loading, reload } = useManageData<TeachersPayload>({
        endpoint: 'teachers',
        initialFilters: { centreId: filterCentre }
    })

    const rows = data?.assignments || []
    const centres = data?.centres || []
    const batches = data?.batches || []
    const teachers = data?.teachers || []

    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [selectedTeacher, setSelectedTeacher] = useState('')
    const [selectedBatch, setSelectedBatch] = useState('')
    const [subject, setSubject] = useState('')



    function openAssign(teacher?: TeacherRow) {
        if (batches.length === 0) {
            toast.error('No batches available. Create a batch first.')
            return
        }
        setSelectedTeacher(teacher?.teacher_id ?? (teachers[0]?.id ?? ''))
        setSelectedBatch(batches[0]?.id ?? '')
        setSubject('')
        setDialogOpen(true)
    }

    async function handleSave() {
        setSaving(true)
        try {
            const res = await fetch('/api/manage/teachers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: selectedTeacher,
                    batch_id: selectedBatch,
                    subject: subject || null
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast.success('Teacher assigned to batch!')
            setDialogOpen(false)
            await reload({ centreId: filterCentre })
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to assign teacher')
        } finally {
            setSaving(false)
        }
    }

    async function handleUnassign(assignmentId: string) {
        if (!confirm('Are you sure you want to remove this teacher from this batch?')) return

        try {
            const res = await fetch('/api/manage/teachers', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: assignmentId, action: 'unassign' })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Teacher unassigned from batch.')
            await reload({ centreId: filterCentre })
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to unassign teacher')
        }
    }

    function handleFilterCentre(v: string) {
        const val = v === 'all' ? '' : v
        setFilterCentre(val)
        reload({ centreId: val })
    }

    const filteredBatches = batches.filter(b => !filterCentre || b.centre_id === filterCentre)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-tight">Teacher Allocation</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Assign teachers to batches and manage their allocations.</p>
                </div>
                <Button onClick={() => openAssign()}>
                    Assign Teacher
                </Button>
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
            </div>

            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b bg-muted/30 px-5 py-3.5">
                    <CardTitle className="text-base tracking-tight">Teacher Roster</CardTitle>
                    <CardDescription className="mt-0.5">{rows.length} allocation(s) found</CardDescription>
                </div>
                {loading ? (
                    <div className="animate-pulse h-40 bg-muted/20" />
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <Users className="h-8 w-8 mb-4 opacity-20" />
                        <p className="text-sm">No teachers found matching the selected filters.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Teacher</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right pr-4">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((r, i) => (
                                <TableRow key={`${r.teacher_id}-${r.assignment_id ?? 'none'}`} className="transition-colors hover:bg-muted/30">
                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{r.teacher_name}</div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {r.batch_name === 'Unassigned' ? <span className="italic">Unassigned</span> : r.batch_name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {r.subject || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={
                                            r.status === 'assigned' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                                            'bg-muted/50 text-muted-foreground border-border'
                                        }>
                                            {r.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        {r.status === 'unassigned' && (
                                            <Button variant="outline" size="sm" onClick={() => openAssign(r)}>
                                                Assign
                                            </Button>
                                        )}
                                        {r.status === 'assigned' && r.assignment_id && (
                                            <Button variant="ghost" size="sm" onClick={() => handleUnassign(r.assignment_id!)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                                Unassign
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
                title="Assign Teacher to Batch"
                description="Select a teacher and the batch to assign them to."
                onSubmit={handleSave} saving={saving} submitLabel="Assign"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Teacher *</Label>
                        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                            <SelectTrigger><SelectValue placeholder="Choose teacher" /></SelectTrigger>
                            <SelectContent>
                                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Batch *</Label>
                        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                            <SelectTrigger><SelectValue placeholder="Choose batch" /></SelectTrigger>
                            <SelectContent>
                                {filteredBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject (optional)</Label>
                        <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
                    </div>
                </div>
            </ManageDialog>
        </div>
    )
}
