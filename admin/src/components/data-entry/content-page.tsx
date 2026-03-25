'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileText, Plus, Search, Video } from 'lucide-react'
import { toast } from 'sonner'

import { TaskBatchSelector } from '@/components/data-entry/shared/task-batch-selector'
import { fetchJson } from '@/lib/http/fetch-json'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ContentItem } from '@/lib/types/entities'
import { useTaskBatches } from '@/lib/hooks/use-task-batches'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

const TYPE_ICONS: Record<ContentItem['content_type'], React.ComponentType<{ className?: string }>> = {
  video: Video,
  document: FileText,
}

const TYPE_COLORS: Record<ContentItem['content_type'], string> = {
  video: 'bg-violet-500/10 text-violet-600 border-violet-200',
  document: 'bg-blue-500/10 text-blue-600 border-blue-200',
}

export function ContentPage() {
  const queryClient = useQueryClient()
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [contentSearch, setContentSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [contentType, setContentType] = useState<'video' | 'document'>('video')
  const [remarks, setRemarks] = useState('')

  const batchesQuery = useTaskBatches('/api/data-entry/content', 'content')

  const contentQuery = useQuery({
    queryKey: ['task-content-items', selectedBatchId || 'default'],
    queryFn: () => fetchJson<{ content: ContentItem[] }>(`/api/data-entry/content?batch_id=${selectedBatchId || batchesQuery.data?.batches?.[0]?.id || ''}`, { errorPrefix: 'Load content items' }),
    enabled: Boolean(selectedBatchId || batchesQuery.data?.batches?.[0]?.id),
    staleTime: 30_000,
  })

  useQueryErrorToast(batchesQuery.error, 'Failed to load batches')
  useQueryErrorToast(contentQuery.error, 'Failed to load content')

  const batches = useMemo(() => batchesQuery.data?.batches ?? [], [batchesQuery.data?.batches])
  const effectiveSelectedBatchId = selectedBatchId || batches[0]?.id || ''
  const content = useMemo(() => contentQuery.data?.content ?? [], [contentQuery.data?.content])
  const loadingBatches = batchesQuery.isPending || batchesQuery.isFetching
  const loadingContent = contentQuery.isPending || contentQuery.isFetching

  const addMutation = useMutation({
    mutationFn: () => fetchJson('/api/data-entry/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: effectiveSelectedBatchId,
        title,
        content_url: contentUrl,
        content_type: contentType,
        remarks,
      }),
    }),
    onSuccess: async () => {
      toast.success('Content added')
      setDialogOpen(false)
      setTitle('')
      setContentUrl('')
      setContentType('video')
      setRemarks('')
      await queryClient.invalidateQueries({ queryKey: ['task-content-items', effectiveSelectedBatchId] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add content')
    },
  })

  const togglePublishMutation = useMutation({
    mutationFn: (item: ContentItem) => fetchJson('/api/data-entry/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_published: !item.is_published }),
    }),
    onSuccess: async (_, item) => {
      toast.success(item.is_published ? 'Content unpublished' : 'Content published')
      await queryClient.invalidateQueries({ queryKey: ['task-content-items', effectiveSelectedBatchId] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update content status')
    },
  })

  const filteredContent = useMemo(() => {
    const query = contentSearch.trim().toLowerCase()
    if (!query) return content
    return content.filter((item) =>
      [item.title, item.content_type, item.remarks ?? '', item.uploader_name ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [content, contentSearch])

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === effectiveSelectedBatchId) ?? null,
    [batches, effectiveSelectedBatchId],
  )

  async function handleAdd() {
    await addMutation.mutateAsync()
  }

  async function togglePublish(item: ContentItem) {
    await togglePublishMutation.mutateAsync(item)
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel soft-ring rounded-[32px] px-8 py-8">
        <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Tasks</Badge>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-secondary dark:text-primary">Content Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">Open any assigned batch, review its published material, and add new study links with context for students.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <TaskBatchSelector
          title="Assigned Batches"
          description="Select a batch to view its content library."
          batches={batches}
          selectedBatchId={effectiveSelectedBatchId}
          onSelect={setSelectedBatchId}
          loading={loadingBatches}
          emptyMessage="No assigned batches found."
          searchPlaceholder="Search batches"
        />

        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Batch Content</CardTitle>
                <CardDescription className="mt-0.5">{selectedBatch ? `Content uploaded for ${selectedBatch.batch_name}` : 'Select a batch to view content items.'}</CardDescription>
              </div>
              {effectiveSelectedBatchId && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Add Content
                </Button>
              )}
            </div>
          </div>

          {!effectiveSelectedBatchId ? (
            <div className="flex min-h-[420px] items-center justify-center p-10 text-center text-sm text-muted-foreground">
              Select a batch to review its content library.
            </div>
          ) : (
            <div className="space-y-4 px-5 py-5">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={contentSearch} onChange={(event) => setContentSearch(event.target.value)} className="pl-9" placeholder="Search content items" />
              </div>

              {loadingContent ? (
                <div className="h-56 animate-pulse rounded-[24px] bg-primary/10 dark:bg-white/[0.04]" />
              ) : filteredContent.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-secondary/20 bg-white/40 dark:bg-white/[0.02] p-10 text-center text-sm text-muted-foreground">No content has been added for this batch yet.</div>
              ) : (
                <div className="space-y-3">
                  {filteredContent.map((item) => {
                    const TypeIcon = TYPE_ICONS[item.content_type]

                    return (
                       <div key={item.id} className="rounded-[24px] border border-secondary/10 bg-white/60 p-4 dark:bg-white/[0.04]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-secondary dark:text-foreground">{item.title}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{item.remarks || 'No remarks provided.'}</div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className={TYPE_COLORS[item.content_type]}>
                              <TypeIcon className="mr-1 h-3 w-3" />{item.content_type}
                            </Badge>
                            <Badge variant="outline" className={item.is_published ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-amber-500/10 text-amber-600 border-amber-200'}>
                              {item.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <div>Uploaded by: <span className="font-medium text-secondary dark:text-foreground">{item.uploader_name || 'Unknown'}</span></div>
                          <div>Created: <span className="font-medium text-secondary dark:text-foreground">{item.created_at.slice(0, 10)}</span></div>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={item.content_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open Link
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void togglePublish(item)}>
                            {item.is_published ? 'Unpublish' : 'Publish'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <ManageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add Content"
        description="Choose the content type, paste the link, and add remarks to explain what students should use it for."
        onSubmit={handleAdd}
        saving={addMutation.isPending}
        submitLabel="Add Content"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content-title">Title *</Label>
            <Input id="content-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Chapter 3 Thermodynamics" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-url">Link *</Label>
                <Input id="content-url" value={contentUrl} onChange={(event) => setContentUrl(event.target.value)} placeholder="https://..." required />
          </div>
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={contentType} onValueChange={(value) => setContentType(value as 'video' | 'document')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-remarks">Remarks / Description</Label>
            <Textarea id="content-remarks" rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="How should students use this content?" />
          </div>
        </div>
      </ManageDialog>
    </div>
  )
}
