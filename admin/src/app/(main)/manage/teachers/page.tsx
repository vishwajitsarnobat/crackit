/**
 * Manage Teachers Page
 * Renders the teacher assignment UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { TeachersPage } from '@/components/manage/teachers-page'

export default async function ManageTeachersPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head'].includes(context.role ?? '')) redirect('/dashboard')

    return <TeachersPage role={context.role!} />
}
