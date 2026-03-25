import { useMutation, useQueryClient } from '@tanstack/react-query'

import { fetchJson } from '@/lib/http/fetch-json'

type UseManageMutationOptions<TVariables> = {
  endpoint: string
  method: 'POST' | 'PATCH'
  buildBody: (variables: TVariables) => unknown
  errorPrefix: string
  invalidateKeys?: Array<readonly unknown[]>
}

export function useManageMutation<TVariables>(options: UseManageMutationOptions<TVariables>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: TVariables) => fetchJson(`/api/manage/${options.endpoint}`, {
      method: options.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options.buildBody(variables)),
      errorPrefix: options.errorPrefix,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['manage-data', options.endpoint] })
      for (const key of options.invalidateKeys ?? []) {
        await queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
