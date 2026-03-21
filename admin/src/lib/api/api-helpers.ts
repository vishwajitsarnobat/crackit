// runs on server, checks authentication, defines format for returnin data
// and error. returns context with centreIds

// we define a template for functions to run with auth here?
// when we run some function as withAuth(func_name, allowedRoles), auth is
// ran first, which is nothing but the code in the withAuth return and then
// handler runs the actual funtion func_name is all the conditions are satisfied.

import {NextResponse, type NextRequest} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getCurrentUserContext, type AppRole} from "@/lib/auth/current-user";

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
            const profile = await getCurrentUserContext(supabase);

            if (!profile) {
                return apiError("Your account is not authenticated.", 401);
            }

            if (!profile.isActive) {
                return apiError("Your account is not active.", 403);
            }

            if (!profile.role) {
                return apiError("Your role is not configured.", 403);
            }

            if (allowedRoles && !allowedRoles.includes(profile.role)) {
                // we are not using allowedRoles.length > 0
                // by default if allowedRoles are passes, even if empty, it will block the requests.
                return apiError(
                    "Your role is forbidden to access this content.",
                    403,
                );
            }

            // pre-fetch centre assignments for non-CEOs
            let centreIds: string[] = [];
            if (profile.role !== "ceo") {
                const {data: assignments, error} = await supabase
                    .from("user_centre_assignments")
                    .select("centre_id")
                    .eq("user_id", profile.userId)
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
                    (profile.role === "centre_head" ||
                        profile.role === "teacher" ||
                        profile.role === "accountant") &&
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
                user: {id: profile.userId},
                profile: {
                    isActive: profile.isActive,
                    role: profile.role,
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
