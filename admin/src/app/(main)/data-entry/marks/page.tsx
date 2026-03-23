/**
 * Marks Data Entry Page
 * Renders the marks entry UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { MarksPage } from '@/components/data-entry/marks-page'

export default async function DataEntryMarksPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head', 'teacher'].includes(context.role ?? '')) redirect('/dashboard')

    return <MarksPage role={context.role!} />
}
