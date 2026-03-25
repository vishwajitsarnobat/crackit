'use client'

/**
 * Manage Batches Page Component
 * Allows admins and centre heads to manage student batches.
 * Features: Creating, editing, and deactivating batches within specific centres.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Power } from 'lucide-react'
import { SelectField } from '@/components/shared/form/select-field'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { useManageData } from '@/lib/hooks/use-manage-data'
import { useManageMutation } from '@/lib/hooks/use-manage-mutation'
import { type AppRole, type Batch, type Centre } from '@/lib/types/entities'

type StatusFilter = 'all' | 'active' | 'inactive'

export function BatchesPage({ role }: { role: AppRole }) {
    const [filterCentre, setFilterCentre] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

    type BatchesPayload = { batches: Batch[], centres: Centre[] }
    const { data, loading, reload } = useManageData<BatchesPayload>({ 
        endpoint: 'batches', 
        initialFilters: { centreId: filterCentre } 
    })

    const centres = data?.centres || []
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<Batch | null>(null)

    const createBatchMutation = useManageMutation<{ centre_id: string; batch_code: string; batch_name: string; academic_year: string }>({
        endpoint: 'batches',
        method: 'POST',
        errorPrefix: 'Create batch',
        buildBody: (variables) => variables,
    })

    const updateBatchMutation = useManageMutation<{ id: string; batch_name?: string; academic_year?: string; is_active?: boolean }>({
        endpoint: 'batches',
        method: 'PATCH',
        errorPrefix: 'Update batch',
        buildBody: (variables) => variables,
    })

    const saving = createBatchMutation.isPending || updateBatchMutation.isPending

    // Form state
    const [centreId, setCentreId] = useState('')
    const [batchCode, setBatchCode] = useState('')
    const [batchName, setBatchName] = useState('')
    const [academicYear, setAcademicYear] = useState('')

    const filteredBatches = useMemo(() => {
        const query = search.trim().toLowerCase()

        return (data?.batches ?? []).filter((batch) => {
            const matchesSearch = !query || [
                batch.batch_code,
                batch.batch_name,
                batch.centre_name,
                batch.academic_year,
            ].some((value) => value.toLowerCase().includes(query))

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && batch.is_active) ||
                (statusFilter === 'inactive' && !batch.is_active)

            return matchesSearch && matchesStatus
        })
    }, [data?.batches, search, statusFilter])



    function openAdd() {
        setEditing(null); setCentreId(centres[0]?.id ?? '')
        setBatchCode(''); setBatchName(''); setAcademicYear(new Date().getFullYear().toString())
        setDialogOpen(true)
    }

    function openEdit(b: Batch) {
        setEditing(b); setCentreId(b.centre_id)
        setBatchCode(b.batch_code); setBatchName(b.batch_name); setAcademicYear(b.academic_year)
        setDialogOpen(true)
    }

    async function handleSave() {
        try {
            if (editing) {
                await updateBatchMutation.mutateAsync({ id: editing.id, batch_name: batchName, academic_year: academicYear })
                toast.success('Batch updated')
            } else {
                await createBatchMutation.mutateAsync({ centre_id: centreId, batch_code: batchCode, batch_name: batchName, academic_year: academicYear })
                toast.success('Batch created')
            }
            setDialogOpen(false)
            await reload({ centreId: filterCentre })
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save batch changes') }
    }

    async function toggleActive(b: Batch) {
        if (role !== 'centre_head') return
        const actionLabel = b.is_active ? 'deactivate' : 'activate'
        if (!confirm(`Are you sure you want to ${actionLabel} ${b.batch_name}?`)) return

        try {
            await updateBatchMutation.mutateAsync({ id: b.id, is_active: !b.is_active })
            toast.success(`Batch ${b.is_active ? 'deactivated' : 'activated'}`)
            await reload({ centreId: filterCentre })
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to update batch status') }
    }

    function handleCentreFilter(v: string) {
        const val = v === 'all' ? '' : v
        setFilterCentre(val)
        reload({ centreId: val })
    }

    return (
        <div className="space-y-6">
            <div className="glass-panel soft-ring flex items-center justify-between rounded-[32px] px-8 py-8">
                <div>
                    <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Management</Badge>
                    <h1 className="mt-3 font-serif text-4xl tracking-tight text-secondary dark:text-primary">Batch Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Review batches across centres, filter by status, and manage batch details within your allowed scope.</p>
                </div>
                {role === 'centre_head' && (
                    <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Batch</Button>
                )}
            </div>

            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
                    <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Batch Filters</CardTitle>
                    <CardDescription className="mt-0.5">Search by code, name, centre, or academic year and narrow the table by centre and active status.</CardDescription>
                </div>
                <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_240px_200px]">
                    <div className="space-y-2">
                        <Label htmlFor="batch-search">Search</Label>
                        <Input
                            id="batch-search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search batches"
                        />
                    </div>
                    <SelectField id="batch-centre-filter" label="Centre" value={filterCentre || 'all'} onChange={handleCentreFilter} options={[{ value: 'all', label: 'All centres' }, ...centres.map((c) => ({ value: c.id, label: c.centre_name }))]} placeholder="All centres" />
                    <SelectField id="batch-status" label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                </div>
            </Card>

            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
                    <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">All Batches</CardTitle>
                    <CardDescription className="mt-0.5">{filteredBatches.length} batch(es) found</CardDescription>
                </div>
                {loading ? (
                    <div className="animate-pulse h-40 bg-primary/10 dark:bg-white/[0.04]" />
                ) : filteredBatches.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No batches found.</div>
                ) : (
                    <Table>
                        <TableHeader className="bg-primary/10 dark:bg-white/[0.04]">
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Batch Name</TableHead>
                                <TableHead>Centre</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right pr-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBatches.map((b, i) => (
                                <TableRow key={b.id} className="transition-colors hover:bg-primary/8 dark:hover:bg-white/[0.03]">
                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="font-mono text-xs">{b.batch_code}</TableCell>
                                    <TableCell className="font-medium">{b.batch_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{b.centre_name}</TableCell>
                                    <TableCell className="tabular-nums">{b.academic_year}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={b.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}>
                                            {b.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div className="flex justify-end gap-1">
                                            {role === 'centre_head' ? (
                                                <>
                                                    <Button variant="ghost" size="sm" onClick={() => openEdit(b)} title="Edit batch"><Pencil className="h-3.5 w-3.5" /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => toggleActive(b)} title={b.is_active ? 'Deactivate batch' : 'Activate batch'}>
                                                        <Power className={`h-3.5 w-3.5 ${b.is_active ? 'text-red-500' : 'text-emerald-500'}`} />
                                                    </Button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Read only</span>
                                            )}
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
                    <SelectField id="batch-centre" label="Centre *" value={centreId} onChange={setCentreId} options={centres.map((c) => ({ value: c.id, label: c.centre_name }))} placeholder="Select centre" />
                )}
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
