import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="space-y-2">
      <h1 className="font-serif text-3xl tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Logged in as {user.email}</p>
    </div>
  )
}
