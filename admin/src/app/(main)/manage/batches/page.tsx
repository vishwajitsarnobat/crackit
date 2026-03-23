/**
 * Manage Batches Page
 * Renders the batch management UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { BatchesPage } from '@/components/manage/batches-page'

export default async function ManageBatchesPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head'].includes(context.role ?? '')) redirect('/dashboard')

    return <BatchesPage role={context.role!} />
}
