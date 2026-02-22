import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const isConfigured =
        supabaseUrl &&
        supabaseUrl !== "your-supabase-url" &&
        supabaseAnonKey &&
        supabaseAnonKey !== "your-supabase-anon-key"

    if (!isConfigured) {
        // If not configured, allow access to public pages only and skip Supabase logic
        const isLoginPage = request.nextUrl.pathname === "/login"
        const isSignupPage = request.nextUrl.pathname === "/signup"
        const isPublicAsset = !!request.nextUrl.pathname.match(/\.(.*)$/)

        if (isLoginPage || isSignupPage || isPublicAsset) {
            return supabaseResponse
        }

        // Redirect to login even if not configured so they can see the UI
        const url = request.nextUrl.clone()
        url.pathname = "/login"
        return NextResponse.redirect(url)
    }

    const supabase = createServerClient(
        supabaseUrl!,
        supabaseAnonKey!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 1. Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser()

    const isLoginPage = request.nextUrl.pathname === "/login"
    const isSignupPage = request.nextUrl.pathname === "/signup"
    const isAuthCallback = request.nextUrl.pathname.startsWith("/auth")
    const isPublicAsset = request.nextUrl.pathname.match(/\.(.*)$/)

    // 2. Protect Dashboard Routes
    if (!user && !isLoginPage && !isSignupPage && !isAuthCallback && !isPublicAsset) {
        const url = request.nextUrl.clone()
        url.pathname = "/login"
        return NextResponse.redirect(url)
    }

    // 3. User verification check (Public.users table)
    if (user && !isAuthCallback && !isPublicAsset) {
        // Check if user is active in the custom users table
        const { data: profile } = await supabase
            .from("users")
            .select("is_active, role_id")
            .eq("id", user.id)
            .single()

        // If user exists but is not active, redirect to a "waiting for approval" page
        // (except if already on that page)
        const isApprovalPendingPage = request.nextUrl.pathname === "/approval-pending"

        if (profile && !profile.is_active && !isApprovalPendingPage && !isLoginPage && !isSignupPage) {
            const url = request.nextUrl.clone()
            url.pathname = "/approval-pending"
            return NextResponse.redirect(url)
        }

        // Role-based redirection for logged in users trying to access login/signup
        if ((isLoginPage || isSignupPage) && profile?.is_active) {
            const url = request.nextUrl.clone()
            url.pathname = "/"
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
