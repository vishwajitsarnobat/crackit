/**
 * Supabase Browser Client (client-side)
 * Creates a Supabase client for browser-side usage (components with 'use client').
 * Full RLS is enforced. Uses cookies for session management.
 * Exports: createClient()
 */
import {createBrowserClient} from "@supabase/ssr";

export function createClient() {
    return createBrowserClient(
        // ! says, trust me it is not null
        process.env.NEXT_PUBLIC_SUPABASE_URL!, // project url
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // public anonymous key
    );
}
