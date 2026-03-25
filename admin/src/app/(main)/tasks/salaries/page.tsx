import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { SalariesPage } from '@/components/data-entry/salaries-page'

export default async function TasksSalariesPage() {
  const context = await getCurrentUserContext()
  if (!context?.isActive) redirect('/login')
  if (!['centre_head', 'accountant'].includes(context.role ?? '')) redirect('/dashboard')

  return <SalariesPage />
}
