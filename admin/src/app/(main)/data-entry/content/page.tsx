/**
 * Content Library Entry Page
 * Renders the content management UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { ContentPage } from '@/components/data-entry/content-page'

export default async function DataEntryContentPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head', 'teacher'].includes(context.role ?? '')) redirect('/dashboard')

    return <ContentPage role={context.role!} />
}
