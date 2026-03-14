import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AppRole, CurrentUserContext } from '@/lib/auth/current-user'

export type ApiContext = {
    user: { id: string }
    profile: {
        isActive: boolean
        role: AppRole | null
        centreIds: string[]
    }
}

// Reusable Next.js API Response formatting
export function apiSuccess(data: unknown, status = 200) {
    return NextResponse.json(data, { status })
}

export function apiError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status })
}

// Higher-order API route wrapper that enforces Authentication and optionally Roles
type RouteHandler = (req: NextRequest, ctx: ApiContext, props?: unknown) => Promise<NextResponse> | NextResponse

export function withAuth(handler: RouteHandler, allowedRoles?: AppRole[]) {
    return async (req: NextRequest, props?: unknown) => {
        try {
            const supabase = await createClient()

            // 1. Authenticate user
            const { data: { user }, error: authErr } = await supabase.auth.getUser()
            if (authErr || !user) {
                return apiError('Unauthorized.', 401)
            }

            // 2. Fetch profile + role in a single joined query
            const { data: profile } = await supabase
                .from('users')
                .select('is_active, roles!inner(role_name)')
                .eq('id', user.id)
                .single()

            if (!profile?.is_active) {
                return apiError('Your account is not active.', 403)
            }

            const role = (profile.roles as any)?.role_name as AppRole | undefined

            if (!role) {
                return apiError('Your role is not configured.', 403)
            }

            // 3. Check Role Authorization if needed
            if (allowedRoles && allowedRoles.length > 0) {
                if (!allowedRoles.includes(role)) {
                    return apiError('Forbidden.', 403)
                }
            }

            // 4. Pre-fetch centre assignments for non-CEOs
            let centreIds: string[] = []
            if (role !== 'ceo') {
                const { data: assignments } = await supabase
                    .from('user_centre_assignments')
                    .select('centre_id')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                
                centreIds = (assignments ?? []).map(a => a.centre_id)

                // Enforce that centre heads/teachers must have at least one assigned centre
                if ((role === 'centre_head' || role === 'teacher') && centreIds.length === 0) {
                    return apiError('No active centre assignment found for your account.', 403)
                }
            }

            // Build Context
            const ctx: ApiContext = {
                user: { id: user.id },
                profile: {
                    isActive: true,
                    role: role,
                    centreIds
                }
            }

            // Call internal handler
            return await handler(req, ctx, props)
        } catch (error) {
            console.error('[API Error]', error)
            return apiError(error instanceof Error ? error.message : 'Unexpected internal error', 500)
        }
    }
}
