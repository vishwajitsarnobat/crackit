import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'

type UseManageDataOptions = {
    endpoint: string,
    initialFilters?: Record<string, string>
}

export function useManageData<T>({ endpoint, initialFilters = {} }: UseManageDataOptions) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const filtersRef = useRef(initialFilters)

    const fetchData = useCallback(async (filters: Record<string, string> = filtersRef.current) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            for (const [key, value] of Object.entries(filters)) {
                if (value && value !== 'all') {
                    params.set(key, value)
                }
            }
            
            const res = await fetch(`/api/manage/${endpoint}?${params}`)
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Failed to fetch data')
            
            setData(json)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Unknown error occurred')
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [endpoint])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        data,
        loading,
        reload: fetchData
    }
}
