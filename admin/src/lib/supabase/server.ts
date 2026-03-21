// this is used on server side, it checks auth, executes the query for user ensures the
// RLS policies are applied on request from browser side, it is not exposed to browser side

// helper for server side request management
import {createServerClient} from "@supabase/ssr";
import {cookies} from "next/headers";

// cookies store session, which stores JWT and refresh token
// cookies are async in modern Next.js, hence async function
export async function createClient() {
    // cookies are read for each request
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // reads cookies sent by browser to make supabase client on server with user tokens
                getAll() {
                    return cookieStore.getAll();
                },
                // supabase might update tokens, so they are written before sending response back to user
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({name, value, options}) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch (error) {
                        console.error("[Server Error]", error);
                        console.error(
                            error instanceof Error
                                ? error.message
                                : "Unexpected server error",
                            500,
                        );
                    }
                },
            },
        },
    );
}
