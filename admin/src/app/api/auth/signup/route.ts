/**
 * Auth Signup API
 * GET  — Returns active centres for the signup form dropdown
 * POST — Creates a new user: auth user → users table row → approval request.
 *        Rolls back auth user + DB row on failure. Supports CEO/centre_head/teacher/accountant roles.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Role = 'ceo' | 'centre_head' | 'teacher' | 'accountant'

const CENTRE_ROLES: Role[] = ['centre_head', 'teacher', 'accountant']

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('centres')
      .select('id, centre_name')
      .eq('is_active', true)
      .order('centre_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch centres.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const fullName = String(body?.fullName ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const role = body?.role as Role
    const centreId = body?.centreId ? String(body.centreId) : null

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }

    if (!['ceo', 'centre_head', 'teacher', 'accountant'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }

    if (CENTRE_ROLES.includes(role) && !centreId) {
      return NextResponse.json({ error: 'Please select a centre.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', role)
      .single()

    if (roleError || !roleData) {
      return NextResponse.json(
        { error: 'Role not found. Please seed roles from database/dummy-data.sql.' },
        { status: 400 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Failed to create auth user.' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      role_id: roleData.id,
      full_name: fullName,
      email,
      is_active: false,
    })

    if (userError) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    const { error: approvalError } = await supabase.from('user_approval_requests').insert({
      user_id: userId,
      requested_role: role,
      centre_id: CENTRE_ROLES.includes(role) ? centreId : null,
    })

    if (approvalError) {
      await supabase.from('users').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: approvalError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected signup error.' },
      { status: 500 }
    )
  }
}
