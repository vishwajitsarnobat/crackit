/**
 * User Profile API
 * GET   — Returns authenticated user's profile (name, role, centres, etc.)
 * PATCH — Updates fullName and phone for the authenticated user (requires self_update RLS)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RoleRow = {
    role_name: string | null;
    display_name: string | null;
};

type ProfileRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    profile_photo_url: string | null;
    is_active: boolean | null;
    created_at: string;
    roles: RoleRow | RoleRow[] | null;
};

type CentreRow = {
    id: string;
    centre_name: string;
    centre_code: string;
};

type CentreAssignmentRow = {
    is_primary: boolean | null;
    centres: CentreRow | CentreRow[] | null;
};

function resolveRole(roles: ProfileRow['roles']) {
    if (Array.isArray(roles)) return roles[0] ?? null;
    return roles;
}

function resolveCentre(centre: CentreAssignmentRow['centres']) {
    if (Array.isArray(centre)) return centre[0] ?? null;
    return centre;
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        const { data: profile, error: profileErr } = await supabase
            .from('users')
            .select(`
                id, full_name, email, phone, profile_photo_url, is_active, created_at,
                roles ( role_name, display_name )
            `)
            .eq('id', user.id)
            .single()

        if (profileErr || !profile) {
            return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
        }

        const typedProfile = profile as ProfileRow

        // Fetch centre assignments
        const { data: centresData } = await supabase
            .from('user_centre_assignments')
            .select('is_primary, centres(id, centre_name, centre_code)')
            .eq('user_id', user.id)
            .eq('is_active', true)

        const centres = ((centresData ?? []) as CentreAssignmentRow[])
            .map((assignment) => {
                const centre = resolveCentre(assignment.centres)
                if (!centre) return null

                return {
                    id: centre.id,
                    name: centre.centre_name,
                    code: centre.centre_code,
                    isPrimary: assignment.is_primary === true,
                }
            })
            .filter((centre): centre is { id: string; name: string; code: string; isPrimary: boolean } => Boolean(centre))

        const role = resolveRole(typedProfile.roles)

        return NextResponse.json({
            id: typedProfile.id,
            fullName: typedProfile.full_name,
            email: typedProfile.email,
            phone: typedProfile.phone ?? '',
            photoUrl: typedProfile.profile_photo_url,
            isActive: typedProfile.is_active === true,
            createdAt: typedProfile.created_at,
            roleName: role?.role_name,
            roleDisplayName: role?.display_name,
            centres
        })

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch profile.' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const fullName = String(body.fullName || '').trim()
        const phone = String(body.phone || '').trim()

        if (!fullName) {
            return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        // Update the users table.
        // NOTE: This requires the "self_update" RLS policy to be active on the DB!
        const { error: updateErr } = await supabase
            .from('users')
            .update({
                full_name: fullName,
                phone: phone || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (updateErr) {
            return NextResponse.json({ error: updateErr.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update profile.' },
            { status: 500 }
        )
    }
}
