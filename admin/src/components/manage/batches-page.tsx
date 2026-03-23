'use client'

/**
 * Manage Batches Page Component
 * Allows admins and centre heads to manage student batches.
 * Features: Creating, editing, and deactivating batches within specific centres and courses.
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Power } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { useManageData } from '@/lib/hooks/use-manage-data'
import { type Batch, type Centre, type Course, type AppRole } from '@/lib/types/entities'

export function BatchesPage({ role }: { role: AppRole }) {
    const [filterCentre, setFilterCentre] = useState('')

    type BatchesPayload = { batches: Batch[], centres: Centre[], courses: Course[] }
    const { data, loading, reload } = useManageData<BatchesPayload>({ 
        endpoint: 'batches', 
        initialFilters: { centreId: filterCentre } 
    })

    const batches = data?.batches || []
    const centres = data?.centres || []
    const courses = data?.courses || []

    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState<Batch | null>(null)

    // Form state
    const [centreId, setCentreId] = useState('')
    const [courseId, setCourseId] = useState('')
    const [batchCode, setBatchCode] = useState('')
    const [batchName, setBatchName] = useState('')
    const [academicYear, setAcademicYear] = useState('')



    function openAdd() {
        setEditing(null); setCentreId(centres[0]?.id ?? ''); setCourseId(courses[0]?.id ?? '')
        setBatchCode(''); setBatchName(''); setAcademicYear(new Date().getFullYear().toString())
        setDialogOpen(true)
    }

    function openEdit(b: Batch) {
        setEditing(b); setCentreId(b.centre_id); setCourseId(b.course_id)
        setBatchCode(b.batch_code); setBatchName(b.batch_name); setAcademicYear(b.academic_year)
        setDialogOpen(true)
    }

    async function handleSave() {
        setSaving(true)
        try {
            if (editing) {
                const res = await fetch('/api/manage/batches', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editing.id, batch_name: batchName, course_id: courseId, academic_year: academicYear })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                toast.success('Batch updated')
            } else {
                const res = await fetch('/api/manage/batches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ centre_id: centreId, course_id: courseId, batch_code: batchCode, batch_name: batchName, academic_year: academicYear })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                toast.success('Batch created')
            }
            setDialogOpen(false)
            await reload({ centreId: filterCentre })
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Unknown error') }
        finally { setSaving(false) }
    }

    async function toggleActive(b: Batch) {
        try {
            const res = await fetch('/api/manage/batches', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: b.id, is_active: !b.is_active })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(`Batch ${b.is_active ? 'deactivated' : 'activated'}`)
            await reload({ centreId: filterCentre })
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Unknown error') }
    }

    function handleCentreFilter(v: string) {
        const val = v === 'all' ? '' : v
        setFilterCentre(val)
        reload({ centreId: val })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-tight">Batch Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Create and manage batches for your centres.</p>
                </div>
                <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Batch</Button>
            </div>

            {/* Centre filter */}
            <div className="flex items-center gap-3">
                <Label>Centre:</Label>
                <Select value={filterCentre || 'all'} onValueChange={handleCentreFilter}>
                    <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="All centres" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All centres</SelectItem>
                        {centres.map(c => <SelectItem key={c.id} value={c.id}>{c.centre_name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b bg-muted/30 px-5 py-3.5">
                    <CardTitle className="text-base tracking-tight">All Batches</CardTitle>
                    <CardDescription className="mt-0.5">{batches.length} batch(es) found</CardDescription>
                </div>
                {loading ? (
                    <div className="animate-pulse h-40 bg-muted/20" />
                ) : batches.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No batches found.</div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Batch Name</TableHead>
                                <TableHead>Course</TableHead>
                                <TableHead>Centre</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right pr-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {batches.map((b, i) => (
                                <TableRow key={b.id} className="transition-colors hover:bg-muted/30">
                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="font-mono text-xs">{b.batch_code}</TableCell>
                                    <TableCell className="font-medium">{b.batch_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{b.course_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{b.centre_name}</TableCell>
                                    <TableCell className="tabular-nums">{b.academic_year}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={b.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}>
                                            {b.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => toggleActive(b)}>
                                                <Power className={`h-3.5 w-3.5 ${b.is_active ? 'text-red-500' : 'text-emerald-500'}`} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <ManageDialog
                open={dialogOpen} onOpenChange={setDialogOpen}
                title={editing ? 'Edit Batch' : 'Add New Batch'}
                description={editing ? 'Update batch details.' : 'Create a new batch for a centre.'}
                onSubmit={handleSave} saving={saving} submitLabel={editing ? 'Update' : 'Create'}
            >
                {!editing && (
                    <div className="space-y-2">
                        <Label>Centre *</Label>
                        <Select value={centreId} onValueChange={setCentreId}>
                            <SelectTrigger><SelectValue placeholder="Select centre" /></SelectTrigger>
                            <SelectContent>
                                {centres.map(c => <SelectItem key={c.id} value={c.id}>{c.centre_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select value={courseId} onValueChange={setCourseId}>
                        <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                        <SelectContent>
                            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {!editing && (
                    <div className="space-y-2">
                        <Label htmlFor="bcode">Batch Code *</Label>
                        <Input id="bcode" value={batchCode} onChange={e => setBatchCode(e.target.value)} placeholder="e.g. JEE-2026-A" required />
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="bname">Batch Name *</Label>
                    <Input id="bname" value={batchName} onChange={e => setBatchName(e.target.value)} placeholder="e.g. JEE Foundation Batch A" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="byear">Academic Year *</Label>
                    <Input id="byear" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="e.g. 2026" required />
                </div>
            </ManageDialog>
        </div>
    )
}
