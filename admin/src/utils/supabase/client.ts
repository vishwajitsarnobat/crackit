import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || supabaseUrl === "your-supabase-url" || !supabaseAnonKey || supabaseAnonKey === "your-supabase-anon-key") {
        console.warn("Supabase credentials not found. Auth features will be disabled.")
        return null as any // Type assertion to avoid breaking existing code while allowing UI test
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
