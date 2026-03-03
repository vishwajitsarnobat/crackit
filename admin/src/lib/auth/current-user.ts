import { createClient } from '@/lib/supabase/server'

export type AppRole = 'ceo' | 'centre_head' | 'teacher' | 'accountant' | 'student'

export type CurrentUserContext = {
  userId: string
  isActive: boolean
  role: AppRole | null
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role_id, is_active')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      userId: user.id,
      isActive: false,
      role: null,
    }
  }

  const { data: roleRow } = await supabase
    .from('roles')
    .select('role_name')
    .eq('id', profile.role_id)
    .single()

  return {
    userId: user.id,
    isActive: profile.is_active === true,
    role: (roleRow?.role_name as AppRole | undefined) ?? null,
  }
}
