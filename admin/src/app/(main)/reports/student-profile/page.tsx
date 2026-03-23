/**
 * Student Profile Report Page
 * Renders the UI for generating student profile reports.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { StudentProfileReport } from '@/components/reports/student-profile-report'

export default async function StudentProfileReportPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head', 'teacher'].includes(context.role ?? '')) redirect('/dashboard')

    return <StudentProfileReport role={context.role!} />
}
