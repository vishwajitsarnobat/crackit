'use client'

import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'

import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TaskBatchOption } from '@/lib/types/entities'

type TaskBatchSelectorProps = {
  title: string
  description: string
  batches: TaskBatchOption[]
  selectedBatchId: string
  onSelect: (batchId: string) => void
  loading: boolean
  emptyMessage: string
  searchPlaceholder?: string
}

export function TaskBatchSelector({
  title,
  description,
  batches,
  selectedBatchId,
  onSelect,
  loading,
  emptyMessage,
  searchPlaceholder = 'Search batches',
}: TaskBatchSelectorProps) {
  const [search, setSearch] = useState('')

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return batches

    return batches.filter((batch) =>
      [batch.batch_name, batch.batch_code, batch.centre_name].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [batches, search])

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
        <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">{title}</CardTitle>
        <CardDescription className="mt-0.5">{description}</CardDescription>
      </div>
      <div className="border-b border-secondary/10 px-5 py-4">
        <Label htmlFor="task-batch-search" className="sr-only">Search batches</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="task-batch-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder={searchPlaceholder}
          />
        </div>
      </div>
      <div className="max-h-[620px] overflow-y-auto">
        {loading ? (
           <div className="h-56 animate-pulse bg-primary/10 dark:bg-white/[0.04]" />
        ) : filteredBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
            <Users className="mb-3 h-8 w-8 opacity-20" />
            {emptyMessage}
          </div>
        ) : (
           <div className="divide-y divide-secondary/10">
             {filteredBatches.map((batch) => (
               <button
                key={batch.id}
                type="button"
                onClick={() => onSelect(batch.id)}
                 className={`w-full px-5 py-4 text-left transition-colors hover:bg-primary/10 dark:hover:bg-white/[0.04] ${selectedBatchId === batch.id ? 'bg-primary/14 dark:bg-white/[0.06]' : ''}`}
               >
                 <div className="font-medium text-secondary dark:text-foreground">{batch.batch_name}</div>
                 <div className="mt-1 font-mono text-xs text-muted-foreground">{batch.batch_code}</div>
                 <div className="mt-2 text-xs text-muted-foreground">{batch.centre_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
