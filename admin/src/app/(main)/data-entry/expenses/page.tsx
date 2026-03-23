/**
 * Expenses Data Entry Page
 * Renders the expenses entry UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { ExpensesPage } from '@/components/data-entry/expenses-page'

export default async function DataEntryExpensesPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head', 'accountant'].includes(context.role ?? '')) redirect('/dashboard')

    return <ExpensesPage role={context.role!} />
}
