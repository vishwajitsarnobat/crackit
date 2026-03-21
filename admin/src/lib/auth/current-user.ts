// runs on server, returns the userId, role and is_active

import {SupabaseClient} from "@supabase/supabase-js";

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
};

export async function getCurrentUserContext(
    supabase: SupabaseClient,
): Promise<CurrentUserContext | null> {
    // no db query, comes from supabase auth
    const {
        data: {user},
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
        };
    }

    // as any ignores typechecks
    // role is always defined by design
    const roleName = (profile.roles as any)?.role_name as AppRole | undefined;

    return {
        userId: user.id,
        // === to check both value and type (false === 0 will be false)
        isActive: profile.is_active === true,
        role: roleName ?? null,
    };
}
