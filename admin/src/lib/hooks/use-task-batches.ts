import { useQuery } from '@tanstack/react-query'

import { fetchJson } from '@/lib/http/fetch-json'
import type { TaskBatchOption } from '@/lib/types/entities'

type TaskBatchEndpoint = '/api/data-entry/attendance' | '/api/data-entry/marks' | '/api/data-entry/content'

export function useTaskBatches(endpoint: TaskBatchEndpoint, keySuffix: string) {
  return useQuery({
    queryKey: ['task-batches', keySuffix],
    queryFn: () => fetchJson<{ batches: TaskBatchOption[] }>(endpoint, { errorPrefix: `Load task batches from ${endpoint}` }),
    staleTime: 60_000,
  })
}
