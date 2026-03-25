import { useQuery } from '@tanstack/react-query'

import { fetchJson } from '@/lib/http/fetch-json'
import type { Batch, Centre } from '@/lib/types/entities'

type ScopedFiltersPayload = {
  centres: Centre[]
  batches: Batch[]
}

export function useScopedFilters() {
  return useQuery({
    queryKey: ['scoped-filters'],
    queryFn: () => fetchJson<ScopedFiltersPayload>('/api/meta/scoped-filters', { errorPrefix: 'Load scoped filters' }),
    staleTime: 60_000,
  })
}
