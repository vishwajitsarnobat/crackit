/**
 * Fees Data Entry Page
 * Renders the fee management UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { FeesPage } from '@/components/data-entry/fees-page'

export default async function DataEntryFeesPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head', 'accountant'].includes(context.role ?? '')) redirect('/dashboard')

    return <FeesPage role={context.role!} />
}
