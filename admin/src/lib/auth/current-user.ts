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

  // Single join query saving 1 roundtrip
  const { data: profile } = await supabase
    .from('users')
    .select('is_active, roles!inner(role_name)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      userId: user.id,
      isActive: false,
      role: null,
    }
  }

  // extract role_name
  const roleName = (profile.roles as any)?.role_name as AppRole | undefined

  return {
    userId: user.id,
    isActive: profile.is_active === true,
    role: roleName ?? null,
  }
}
