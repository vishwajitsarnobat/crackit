/**
 * Salaries Data Entry Page
 * Renders the salary management UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { SalariesPage } from '@/components/data-entry/salaries-page'

export default async function DataEntrySalariesPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head', 'accountant'].includes(context.role ?? '')) redirect('/dashboard')

    return <SalariesPage role={context.role!} />
}
