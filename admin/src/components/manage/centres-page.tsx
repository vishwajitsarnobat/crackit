'use client'

/**
 * Manage Centres Page Component
 * Allows the CEO to manage branches/centres.
 * Features: Adding, editing, and deactivating centres with location details.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Power } from 'lucide-react'
import { fetchJson } from '@/lib/http/fetch-json'
import { SelectField } from '@/components/shared/form/select-field'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { useManageData } from '@/lib/hooks/use-manage-data'
import { type Centre } from '@/lib/types/entities'

type StatusFilter = 'all' | 'active' | 'inactive'

export function CentresPage() {
    const { data, loading, reload } = useManageData<{ centres: Centre[] }>({ endpoint: 'centres' })

    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState<Centre | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

    // Form state
    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [phone, setPhone] = useState('')

    const filteredCentres = useMemo(() => {
        const query = search.trim().toLowerCase()

        return (data?.centres ?? []).filter((centre) => {
            const matchesSearch = !query || [
                centre.centre_code,
                centre.centre_name,
                centre.city ?? '',
                centre.phone ?? '',
            ].some((value) => value.toLowerCase().includes(query))

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && centre.is_active) ||
                (statusFilter === 'inactive' && !centre.is_active)

            return matchesSearch && matchesStatus
        })
    }, [data?.centres, search, statusFilter])


    function openAdd() {
        setEditing(null)
        setCode(''); setName(''); setAddress(''); setCity(''); setPhone('')
        setDialogOpen(true)
    }

    function openEdit(c: Centre) {
        setEditing(c)
        setCode(c.centre_code); setName(c.centre_name); setAddress(c.address); setCity(c.city ?? ''); setPhone(c.phone ?? '')
        setDialogOpen(true)
    }

    async function handleSave() {
        setSaving(true)
        try {
            if (editing) {
                await fetchJson('/api/manage/centres', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editing.id, centre_name: name, address, city, phone })
                })
                toast.success('Centre updated')
            } else {
                await fetchJson('/api/manage/centres', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ centre_code: code, centre_name: name, address, city, phone })
                })
                toast.success('Centre created')
            }
            setDialogOpen(false)
            await reload()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save centre changes') }
        finally { setSaving(false) }
    }

    async function toggleActive(c: Centre) {
        const actionLabel = c.is_active ? 'deactivate' : 'activate'
        if (!confirm(`Are you sure you want to ${actionLabel} ${c.centre_name}?`)) return

        try {
            await fetchJson('/api/manage/centres', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: c.id, is_active: !c.is_active })
            })
            toast.success(`Centre ${c.is_active ? 'deactivated' : 'activated'}`)
            await reload()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to update centre status') }
    }

    return (
        <div className="space-y-6">
            <div className="glass-panel soft-ring flex items-center justify-between rounded-[32px] px-8 py-8">
                <div>
                    <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Management</Badge>
                    <h1 className="mt-3 font-serif text-4xl tracking-tight text-secondary dark:text-primary">Centre Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Search centres, review their current status, and manage add, edit, or deactivate actions from one place.</p>
                </div>
                <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Centre</Button>
            </div>

            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
                    <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Centre Filters</CardTitle>
                    <CardDescription className="mt-0.5">Search by code, name, city, or phone and filter by status.</CardDescription>
                </div>
                <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_220px]">
                    <div className="space-y-2">
                        <Label htmlFor="centre-search">Search</Label>
                        <Input
                            id="centre-search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by code, name, city, or phone"
                        />
                    </div>
                    <SelectField
                        id="centre-status"
                        label="Status"
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value as StatusFilter)}
                        options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                    />
                </div>
            </Card>

            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
                    <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">All Centres</CardTitle>
                    <CardDescription className="mt-0.5">{filteredCentres.length} centre(s) found</CardDescription>
                </div>
                {loading ? (
                    <div className="animate-pulse h-40 bg-primary/10 dark:bg-white/[0.04]" />
                ) : filteredCentres.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No centres found.</div>
                ) : (
                    <Table>
                        <TableHeader className="bg-primary/10 dark:bg-white/[0.04]">
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right pr-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCentres.map((c, i) => (
                                <TableRow key={c.id} className="transition-colors hover:bg-primary/8 dark:hover:bg-white/[0.03]">
                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="font-mono text-xs">{c.centre_code}</TableCell>
                                    <TableCell className="font-medium">{c.centre_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{c.city || '-'}</TableCell>
                                    <TableCell className="text-muted-foreground tabular-nums">{c.phone || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={c.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => toggleActive(c)} title={c.is_active ? 'Deactivate centre' : 'Activate centre'}>
                                                <Power className={`h-3.5 w-3.5 ${c.is_active ? 'text-red-500' : 'text-emerald-500'}`} />
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
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title={editing ? 'Edit Centre' : 'Add New Centre'}
                description={editing ? 'Update the centre details below.' : 'Fill in the details to create a new coaching centre.'}
                onSubmit={handleSave}
                saving={saving}
                submitLabel={editing ? 'Update' : 'Create'}
            >
                {!editing && (
                    <div className="space-y-2">
                        <Label htmlFor="code">Centre Code *</Label>
                        <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. CTR001" required />
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="name">Centre Name *</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Crack It Main Branch" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Delhi" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." />
                    </div>
                </div>
            </ManageDialog>
        </div>
    )
}
