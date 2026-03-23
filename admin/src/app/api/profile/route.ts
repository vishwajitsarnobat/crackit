/**
 * User Profile API
 * GET   — Returns authenticated user's profile (name, role, centres, etc.)
 * PATCH — Updates fullName and phone for the authenticated user (requires self_update RLS)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

        // Fetch centre assignments
        const { data: centresData } = await supabase
            .from('user_centre_assignments')
            .select('is_primary, centres(id, centre_name, centre_code)')
            .eq('user_id', user.id)
            .eq('is_active', true)

        const centres = (centresData ?? []).map(c => ({
            id: (c.centres as any).id,
            name: (c.centres as any).centre_name,
            code: (c.centres as any).centre_code,
            isPrimary: c.is_primary
        }))

        return NextResponse.json({
            id: profile.id,
            fullName: profile.full_name,
            email: profile.email,
            phone: profile.phone ?? '',
            photoUrl: profile.profile_photo_url,
            isActive: profile.is_active,
            createdAt: profile.created_at,
            roleName: (profile.roles as any)?.role_name,
            roleDisplayName: (profile.roles as any)?.display_name,
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
