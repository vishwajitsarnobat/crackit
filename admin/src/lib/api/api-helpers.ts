/**
 * API Helper Utilities (server-side)
 * - apiSuccess(data) / apiError(message, status) — standardized JSON responses
 * - withAuth(handler, allowedRoles)              — HOF that authenticates, checks role,
 *   pre-fetches centreIds for non-CEO, and passes AuthContext to the handler
 */

// we define a template for functions to run with auth here?
// when we run some function as withAuth(func_name, allowedRoles), auth is
// ran first, which is nothing but the code in the withAuth return and then
// handler runs the actual funtion func_name is all the conditions are satisfied.

import {NextResponse, type NextRequest} from "next/server";
import {type AppRole} from "@/lib/auth/current-user";
import { createClient } from "../supabase/server";

// only centreIds is extra as compared to CurrentUserContext
export type ApiContext = {
    user: {id: string};
    profile: {
        isActive: boolean;
        role: AppRole | null;
        centreIds: string[];
    };
};

// Reusable Next.js API Response formatting
// can change the behaviour of success and fail return
export function apiSuccess(data: unknown, status = 200) {
    return NextResponse.json(data, {status});
}

export function apiError(message: string, status = 400) {
    return NextResponse.json({error: message}, {status});
}

// Higher-order API route wrapper that enforces Authentication and optionally Roles
// req contains headers, cookies, url, etc. ctx conatins our defined custom object or payload

// when we write a function to put through withAuth, we can use ctx and its attributes in that function.
// This is because we know eventually ctx will be given to function by withAuth
type RouteHandler = (
    req: NextRequest,
    ctx: ApiContext,
    props?: unknown,
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: RouteHandler, allowedRoles?: AppRole[]) {
    return async (req: NextRequest, props?: unknown) => {
        try {
            const supabase = await createClient();
            const {data: {user}}=await supabase.auth.getUser();

            if (!user) {
                return apiError("Your account is not authenticated.", 401);
            }

            const {data: profile, error} = await supabase
                .from("users")
                .select("is_active, roles!inner(role_name)") // match the role too
                .eq("id", user.id)
                .single();
            
            if (error) {
                return apiError("No entry in users table found.", 403);
            }

            if (!profile.is_active) {
                return apiError("Your account is not active.", 403);
            }

            const roleName = (profile.roles as any)?.role_name as AppRole | undefined;

            if (roleName === undefined) {
                return apiError("Your role is not configured.", 403);
            }

            if (allowedRoles && !allowedRoles.includes(roleName)) {
                // we are not using allowedRoles.length > 0
                // by default if allowedRoles are passes, even if empty, it will block the requests.
                return apiError(
                    "Your role is forbidden to access this content.",
                    403,
                );
            }

            // pre-fetch centre assignments for non-CEOs
            let centreIds: string[] = [];
            if (roleName !== "ceo") {
                const {data: assignments, error} = await supabase
                    .from("user_centre_assignments")
                    .select("centre_id")
                    .eq("user_id", user.id)
                    .eq("is_active", true);

                if (error) {
                    return apiError(
                        "Failed to fetch user_centre_assignments",
                        500,
                    );
                }

                // we get user centre_id map, we need only the centre_id
                centreIds = (assignments ?? []).map((a) => a.centre_id); // creates array, not set

                // Enforce that centre heads/teachers/accountants must have at least one assigned centre
                if (
                    (roleName === "centre_head" ||
                        roleName === "teacher" ||
                        roleName === "accountant") &&
                    centreIds.length === 0
                ) {
                    return apiError(
                        "No active centre assignment found for your account.",
                        403,
                    );
                }
            }

            // Build Context
            const ctx: ApiContext = {
                user: {id: user.id},
                profile: {
                    isActive: profile.is_active,
                    role: roleName,
                    centreIds,
                },
            };

            // Call internal handler
            return await handler(req, ctx, props);
        } catch (error) {
            console.error("[API Error]", error);
            return apiError(
                error instanceof Error
                    ? error.message
                    : "Unexpected internal error",
                500,
            );
        }
    };
}
