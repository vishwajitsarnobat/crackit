/**
 * Manage Centres Page
 * Renders the centres management UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { CentresPage } from '@/components/manage/centres-page'

export default async function ManageCentresPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (context.role !== 'ceo') redirect('/dashboard')

    return <CentresPage />
}
