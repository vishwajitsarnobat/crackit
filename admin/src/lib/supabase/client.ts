// client facing, full RLS is followed, used in insecure environment
// like that when user is using

// it is helper for browser-side usage, handles cookies and session
import {createBrowserClient} from "@supabase/ssr";

export function createClient() {
    return createBrowserClient(
        // ! says, trust me it is not null
        process.env.NEXT_PUBLIC_SUPABASE_URL!, // project url
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // public anonymous key
    );
}
