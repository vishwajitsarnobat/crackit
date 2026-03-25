import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { ExpensesPage } from '@/components/data-entry/expenses-page'

export default async function TasksExpensesPage() {
  const context = await getCurrentUserContext()
  if (!context?.isActive) redirect('/login')
  if (!['centre_head', 'accountant'].includes(context.role ?? '')) redirect('/dashboard')

  return <ExpensesPage />
}
