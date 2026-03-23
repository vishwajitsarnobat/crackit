'use client'

/**
 * Content Library Page Component
 * Allows teachers and admins to upload/link educational content (videos, PDFs, notes) for a batch.
 * Features: Adding YouTube links or Google Drive PDFs, toggling publish status, viewing uploaded content.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Eye, EyeOff, ExternalLink, Video, FileText, StickyNote } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ManageDialog } from '@/components/manage/manage-dialog'
import type { AppRole, ContentItem } from '@/lib/types/entities'

type BatchOption = { id: string; batch_name: string; batch_code: string; centre_name: string }

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    video: Video,
    pdf: FileText,
    notes: StickyNote,
}

const TYPE_COLORS: Record<string, string> = {
    video: 'bg-violet-500/10 text-violet-600 border-violet-200',
    pdf: 'bg-blue-500/10 text-blue-600 border-blue-200',
    notes: 'bg-amber-500/10 text-amber-600 border-amber-200',
}

export function ContentPage({ role }: { role: AppRole }) {
    const [batches, setBatches] = useState<BatchOption[]>([])
    const [selectedBatch, setSelectedBatch] = useState('')
    const [content, setContent] = useState<ContentItem[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Add dialog state
    const [dialogOpen, setDialogOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [contentUrl, setContentUrl] = useState('')
    const [contentType, setContentType] = useState<'video' | 'pdf' | 'notes'>('video')

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/data-entry/content')
            const json = await res.json()
            if (res.ok) setBatches(json.batches ?? [])
            setLoading(false)
        }
        load()
    }, [])

    const loadContent = useCallback(async (batchId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/data-entry/content?batch_id=${batchId}`)
            const json = await res.json()
            if (res.ok) setContent(json.content ?? [])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedBatch) loadContent(selectedBatch)
    }, [selectedBatch, loadContent])

    async function handleAdd() {
        setSaving(true)
        try {
            const res = await fetch('/api/data-entry/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch_id: selectedBatch, title, content_url: contentUrl, content_type: contentType }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            toast.success('Content added')
            setDialogOpen(false)
            setTitle(''); setContentUrl(''); setContentType('video')
            loadContent(selectedBatch)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to add')
        } finally {
            setSaving(false)
        }
    }

    async function togglePublish(item: ContentItem) {
        try {
            const res = await fetch('/api/data-entry/content', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, is_published: !item.is_published }),
            })
            if (!res.ok) { const json = await res.json(); throw new Error(json.error) }
            toast.success(item.is_published ? 'Content unpublished' : 'Content published')
            loadContent(selectedBatch)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to toggle')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-tight">Content Library</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Upload PDF notes and link YouTube video URLs for students.</p>
                </div>
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
                {selectedBatch && (
                    <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Content</Button>
                )}
            </div>

            {selectedBatch && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3.5">
                        <CardTitle className="text-base tracking-tight">Content Items</CardTitle>
                        <CardDescription className="mt-0.5">{content.length} item(s)</CardDescription>
                    </div>
                    {loading ? (
                        <div className="animate-pulse h-40 bg-muted/20" />
                    ) : content.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No content added for this batch yet.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="text-center">Type</TableHead>
                                    <TableHead>Uploaded By</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right pr-4">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {content.map((item, i) => {
                                    const TypeIcon = TYPE_ICONS[item.content_type] || FileText
                                    return (
                                        <TableRow key={item.id} className="transition-colors hover:bg-muted/30">
                                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="font-medium max-w-[250px] truncate">{item.title}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={TYPE_COLORS[item.content_type] || ''}>
                                                    <TypeIcon className="h-3 w-3 mr-1" />{item.content_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{item.uploader_name || '—'}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={item.is_published ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-amber-500/10 text-amber-600 border-amber-200'}>
                                                    {item.is_published ? 'Published' : 'Draft'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a href={item.content_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => togglePublish(item)}>
                                                        {item.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}

            <ManageDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title="Add Content"
                description="Link a YouTube video or PDF for this batch's students."
                onSubmit={handleAdd}
                saving={saving}
                submitLabel="Add"
            >
                <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 3 — Thermodynamics" required />
                </div>
                <div className="space-y-2">
                    <Label>URL *</Label>
                    <Input value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://youtube.com/watch?v=… or https://drive.google.com/…" required />
                </div>
                <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={contentType} onValueChange={v => setContentType(v as 'video' | 'pdf' | 'notes')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="notes">Notes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </ManageDialog>
        </div>
    )
}
