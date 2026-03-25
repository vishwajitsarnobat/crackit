/**
 * Manage Data Fetching Hook (client-side)
 * - useManageData<T>(endpoint, initialFilters) — fetches from /api/manage/{endpoint}
 *   through TanStack Query and keeps filter changes query-key aware.
 */

import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchJson } from '@/lib/http/fetch-json'

type ManageFilters = Record<string, string>

type UseManageDataOptions = {
  endpoint: string
  initialFilters?: ManageFilters
}

function normalizeFilters(filters: ManageFilters) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value && value !== 'all')
      .sort(([left], [right]) => left.localeCompare(right)),
  )
}

async function fetchManageData<T>(endpoint: string, filters: ManageFilters) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    params.set(key, value)
  }

  return fetchJson<T>(`/api/manage/${endpoint}?${params.toString()}`, {
    errorPrefix: `[useManageData] ${endpoint}`,
  })
}

export function useManageData<T>({ endpoint, initialFilters = {} }: UseManageDataOptions) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<ManageFilters>(() => normalizeFilters(initialFilters))

  const queryKey = useMemo(() => ['manage-data', endpoint, filters] as const, [endpoint, filters])

  const query = useQuery<T>({
    queryKey,
    queryFn: () => fetchManageData<T>(endpoint, filters),
    staleTime: 30_000,
  })

  const reload = useCallback(async (nextFilters?: ManageFilters) => {
    if (nextFilters) {
      const normalized = normalizeFilters(nextFilters)
      setFilters(normalized)

      await queryClient.invalidateQueries({
        queryKey: ['manage-data', endpoint],
      })
      return
    }

    await query.refetch()
  }, [endpoint, query, queryClient])

  return {
    data: query.data ?? null,
    loading: query.isPending || query.isFetching,
    reload,
    error: query.error,
    filters,
  }
}
