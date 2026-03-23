/**
 * Approval Reviewer Utilities (server-side)
 * - ReviewerContext type      — shape for reviewer identity
 * - getReviewerContext()      — authenticates user, validates CEO/centre_head role, returns centreIds
 * - canReviewRequest()        — checks if a reviewer can approve/reject a given role+centre request
 */

import {createClient} from "@/lib/supabase/server";
import {getCurrentUserContext} from "../auth/current-user";

export type ReviewRole = "ceo" | "centre_head";

export type ReviewerContext = {
    reviewerId: string;
    role: ReviewRole;
    centreIds: string[];
};

export async function getReviewerContext(): Promise<
    | {ok: true; data: ReviewerContext}
    | {ok: false; status: number; error: string}
> {
    const profile = await getCurrentUserContext();

    if (!profile) {
        return {
            ok: false,
            status: 401,
            error: "Your account is not authenticated.",
        };
    }

    if (!profile.isActive) {
        return {ok: false, status: 403, error: "Your account is not active."};
    }

    if (!profile.role) {
        return {ok: false, status: 403, error: "Your role is not configured."};
    }

    const roleName = profile.role;

    if (roleName !== "ceo" && roleName !== "centre_head") {
        return {
            ok: false,
            status: 403,
            error: "You are not allowed to manage approvals.",
        };
    }

    const supabase = await createClient();
    let centreIds: string[] = [];
    if (roleName === "centre_head") {
        const {data: assignments} = await supabase
            .from("user_centre_assignments")
            .select("centre_id")
            .eq("user_id", profile.userId)
            .eq("is_active", true);

        centreIds = (assignments ?? []).map((item) => item.centre_id);

        if (centreIds.length === 0) {
            return {
                ok: false,
                status: 403,
                error: "No active centre assignment found for your account.",
            };
        }
    }

    return {
        ok: true,
        data: {
            reviewerId: profile.userId,
            role: roleName,
            centreIds,
        },
    };
}

export function canReviewRequest(
    reviewer: ReviewerContext,
    requestedRole: string,
    centreId: string | null,
) {
    if (reviewer.role === "ceo") {
        return (
            requestedRole === "centre_head" || requestedRole === "accountant"
        );
    }

    if (reviewer.role === "centre_head") {
        return (
            (requestedRole === "teacher" ||
                requestedRole === "student" ||
                requestedRole === "accountant") &&
            !!centreId &&
            reviewer.centreIds.includes(centreId)
        );
    }

    return false;
}
