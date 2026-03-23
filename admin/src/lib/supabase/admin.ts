/**
 * Supabase Admin Client (server-side only)
 * Uses SUPABASE_SERVICE_ROLE_KEY for full database access, bypassing RLS.
 * Used for admin operations: user creation, approval processing, cross-table queries.
 * Exports: createAdminClient()
 */
import {createClient} from "@supabase/supabase-js";

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // this bypasses all RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            "Supabase admin environment variables are not configured.",
        );
    }

    // no cookies, session, JWT
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
