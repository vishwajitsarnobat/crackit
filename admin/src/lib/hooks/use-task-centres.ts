import { useQuery } from '@tanstack/react-query'

import { fetchJson } from '@/lib/http/fetch-json'

export type TaskCentreOption = {
  id: string
  centre_name: string
  centre_code: string
}

type TaskCentreEndpoint = '/api/data-entry/expenses' | '/api/data-entry/salaries' | '/api/data-entry/staff-attendance'

export function useTaskCentres(endpoint: TaskCentreEndpoint, keySuffix: string) {
  return useQuery({
    queryKey: ['task-centres', keySuffix],
    queryFn: () => fetchJson<{ centres: TaskCentreOption[] }>(endpoint, { errorPrefix: `Load task centres from ${endpoint}` }),
    staleTime: 60_000,
  })
}
