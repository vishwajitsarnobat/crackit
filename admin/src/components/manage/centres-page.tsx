'use client'

/**
 * Manage Centres Page Component
 * Allows the CEO to manage branches/centres.
 * Features: Adding, editing, and deactivating centres with location details.
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
import { ManageDialog } from '@/components/manage/manage-dialog'
import { useManageData } from '@/lib/hooks/use-manage-data'
import { type Centre, type AppRole } from '@/lib/types/entities'

export function CentresPage({ role }: { role: AppRole }) {
    const { data, loading, reload } = useManageData<{ centres: Centre[] }>({ endpoint: 'centres' })
    const centres = data?.centres || []

    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState<Centre | null>(null)

    // Form state
    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [phone, setPhone] = useState('')



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
                const res = await fetch('/api/manage/centres', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editing.id, centre_name: name, address, city, phone })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                toast.success('Centre updated')
            } else {
                const res = await fetch('/api/manage/centres', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ centre_code: code, centre_name: name, address, city, phone })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                toast.success('Centre created')
            }
            setDialogOpen(false)
            await reload()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Unknown error') }
        finally { setSaving(false) }
    }

    async function toggleActive(c: Centre) {
        try {
            const res = await fetch('/api/manage/centres', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: c.id, is_active: !c.is_active })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(`Centre ${c.is_active ? 'deactivated' : 'activated'}`)
            await reload()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Unknown error') }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-tight">Centre Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Add, edit, or deactivate coaching centres.</p>
                </div>
                <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Centre</Button>
            </div>

            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b bg-muted/30 px-5 py-3.5">
                    <CardTitle className="text-base tracking-tight">All Centres</CardTitle>
                    <CardDescription className="mt-0.5">{centres.length} centre(s) found</CardDescription>
                </div>
                {loading ? (
                    <div className="animate-pulse h-40 bg-muted/20" />
                ) : centres.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No centres found.</div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
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
                            {centres.map((c, i) => (
                                <TableRow key={c.id} className="transition-colors hover:bg-muted/30">
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
                                            {role === 'ceo' && (
                                                <Button variant="ghost" size="sm" onClick={() => toggleActive(c)}>
                                                    <Power className={`h-3.5 w-3.5 ${c.is_active ? 'text-red-500' : 'text-emerald-500'}`} />
                                                </Button>
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
