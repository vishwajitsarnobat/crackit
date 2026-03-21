// gives function to fetch data without crashes (infinite rendering on component change)
// provides reload alias to fetchData as needed on frontend.

import {useState, useCallback, useEffect, useRef} from "react";
import {apiError} from "../api/api-helpers";

type UseManageDataOptions = {
    endpoint: string;
    initialFilters?: Record<string, string>;
};

export function useManageData<T>({
    endpoint,
    initialFilters = {},
}: UseManageDataOptions) {
    // useState hold state or simply data that triggers UI update on change
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    // useRef hold persistent data, but do not trigger re-render on change
    const filtersRef = useRef(initialFilters);

    // useCalback defines functions which won't restart from scratch on changes, until
    // the mention dependencies change, it avoids infinite loops in useEffect
    // useCallback(()=>{function}, [dependencies])
    const fetchData = useCallback(
        // the default value is stored in filtersRef.current
        async (filters: Record<string, string> = filtersRef.current) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(filters)) {
                    if (value && value !== "all") {
                        params.set(key, value);
                    }
                }

                const res = await fetch(`/api/manage/${endpoint}?${params}`);
                const json = await res.json();
                if (!res.ok)
                    throw new Error(json.error || "Failed to fetch data");

                setData(json);
            } catch (error: unknown) {
                apiError(
                    error instanceof Error
                        ? error.message
                        : "Unexpected server error",
                    500,
                );
                setData(null);
            } finally {
                setLoading(false);
            }
        },
        [endpoint],
    );

    // runs the function defined here, restarts the function run only when the mentioned
    // dependecies change. useEffect(()=>function, [dependencies])
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        reload: fetchData, // alias, reference
    };
}
