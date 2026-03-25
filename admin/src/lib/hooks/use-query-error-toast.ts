import { useEffect } from 'react'
import { toast } from 'sonner'

export function useQueryErrorToast(error: unknown, fallback: string) {
  useEffect(() => {
    if (!error) return
    toast.error(error instanceof Error ? error.message : fallback)
  }, [error, fallback])
}
