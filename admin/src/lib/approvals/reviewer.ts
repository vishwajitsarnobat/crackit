import { createClient } from '@/lib/supabase/server'

export type ReviewRole = 'ceo' | 'centre_head'

export type ReviewerContext = {
  reviewerId: string
  role: ReviewRole
  centreIds: string[]
}

export async function getReviewerContext(): Promise<
  { ok: true; data: ReviewerContext } | { ok: false; status: number; error: string }
> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, status: 401, error: 'Unauthorized.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role_id, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.is_active) {
    return { ok: false, status: 403, error: 'Your account is not active.' }
  }

  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('role_name')
    .eq('id', profile.role_id)
    .single()

  if (roleError || !roleData) {
    return { ok: false, status: 403, error: 'Your role is not configured.' }
  }

  const roleName = roleData.role_name

  if (roleName !== 'ceo' && roleName !== 'centre_head') {
    return { ok: false, status: 403, error: 'You are not allowed to manage approvals.' }
  }

  let centreIds: string[] = []
  if (roleName === 'centre_head') {
    const { data: assignments } = await supabase
      .from('user_centre_assignments')
      .select('centre_id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    centreIds = (assignments ?? []).map(item => item.centre_id)

    if (centreIds.length === 0) {
      return {
        ok: false,
        status: 403,
        error: 'No active centre assignment found for your account.',
      }
    }
  }

  return {
    ok: true,
    data: {
      reviewerId: user.id,
      role: roleName,
      centreIds,
    },
  }
}

export function canReviewRequest(
  reviewer: ReviewerContext,
  requestedRole: string,
  centreId: string | null
) {
  if (reviewer.role === 'ceo') {
    return requestedRole === 'centre_head' || requestedRole === 'accountant'
  }

  if (reviewer.role === 'centre_head') {
    return (
      (requestedRole === 'teacher' || requestedRole === 'student') &&
      !!centreId &&
      reviewer.centreIds.includes(centreId)
    )
  }

  return false
}
