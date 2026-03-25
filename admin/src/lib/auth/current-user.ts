/**
 * Current User Context (server-side)
 * Fetches the authenticated user's ID, role, and active status from Supabase auth + users table.
 * Returns null if unauthenticated. Used by layout.tsx to determine role for rendering.
 * Exports: getCurrentUserContext(), AppRole type
 */

import {createClient} from "../supabase/server";

// it is needed outside this file too, hence export
export type AppRole =
    | "ceo"
    | "centre_head"
    | "teacher"
    | "accountant"
    | "student";

export type CurrentUserContext = {
    userId: string;
    isActive: boolean;
    role: AppRole | null;
    centreIds: string[];
};

type ProfileRow = {
    is_active: boolean | null;
    roles: { role_name: AppRole | null } | { role_name: AppRole | null }[] | null;
};

type CentreAssignmentRow = {
    centre_id: string | null;
};

function resolveRoleName(roles: ProfileRow["roles"]): AppRole | null {
    if (Array.isArray(roles)) {
        return roles[0]?.role_name ?? null;
    }

    return roles?.role_name ?? null;
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
    const supabase = await createClient();
    // no db query, comes from supabase auth
    const {
        data: {user}
    } = await supabase.auth.getUser();

    // unauthenticated user
    if (!user) {
        return null;
    }

    // Single join query saving 1 roundtrip, or it had been 2 calls, 1 for user_id and then for its role
    // this is from db, not auth
    const {data: profile, error} = await supabase
        .from("users")
        .select("is_active, roles!inner(role_name)") // match the role too
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Failed to fetch profile.");
    }

    // user exists in auth but no db entry
    if (!profile) {
        return {
            userId: user.id,
            isActive: false,
            role: null,
            centreIds: [],
        };
    }

    const typedProfile = profile as ProfileRow;

    const {data: centreAssignments, error: centreAssignmentsError} = await supabase
        .from("user_centre_assignments")
        .select("centre_id")
        .eq("user_id", user.id)
        .eq("is_active", true);

    if (centreAssignmentsError) {
        console.error("Failed to fetch centre assignments.");
    }

    const centreIds = ((centreAssignments ?? []) as CentreAssignmentRow[])
        .map((assignment) => assignment.centre_id)
        .filter((centreId): centreId is string => Boolean(centreId));

    return {
        userId: user.id,
        // === to check both value and type (false === 0 will be false)
        isActive: typedProfile.is_active === true,
        role: resolveRoleName(typedProfile.roles),
        centreIds,
    };
}
