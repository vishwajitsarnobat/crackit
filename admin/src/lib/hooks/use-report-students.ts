import { useQuery } from '@tanstack/react-query'

import { fetchJson } from '@/lib/http/fetch-json'

type ReportStudentsOptions = {
  endpoint: '/api/reports/student-profile' | '/api/reports/attendance' | '/api/reports/performance'
  query: string
  centreId: string
  batchId: string
  fromDate?: string
  toDate?: string
}

function buildReportStudentsQueryString(options: ReportStudentsOptions) {
  const params = new URLSearchParams()
  if (options.query.trim()) params.set('search', options.query.trim())
  if (options.centreId) params.set('centre_id', options.centreId)
  if (options.batchId) params.set('batch_id', options.batchId)
  if (options.fromDate) params.set('from', options.fromDate)
  if (options.toDate) params.set('to', options.toDate)
  return params.toString()
}

export function useReportStudents<T>(options: ReportStudentsOptions) {
  return useQuery({
    queryKey: ['report-students', options.endpoint, options.query, options.centreId, options.batchId, options.fromDate ?? '', options.toDate ?? ''],
    queryFn: () => fetchJson<{ students: T[] }>(`${options.endpoint}?${buildReportStudentsQueryString(options)}`, {
      errorPrefix: `Load report cards from ${options.endpoint}`,
    }),
    staleTime: 30_000,
  })
}
