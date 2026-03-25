import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { FeesPage } from '@/components/data-entry/fees-page'

export default async function TasksFeesPage() {
  const context = await getCurrentUserContext()
  if (!context?.isActive) redirect('/login')
  if (!['centre_head', 'accountant'].includes(context.role ?? '')) redirect('/dashboard')

  return <FeesPage />
}
