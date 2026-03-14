import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { EnrollmentsPage } from '@/components/manage/enrollments-page'

export default async function ManageEnrollmentsPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head'].includes(context.role ?? '')) redirect('/dashboard')

    return <EnrollmentsPage role={context.role!} />
}
