/**
 * Attendance Reports Page
 * Renders the student-card attendance report workflow.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { AttendanceReport } from '@/components/reports/attendance-report'

export default async function AttendanceReportPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head'].includes(context.role ?? '')) redirect('/dashboard')

    return <AttendanceReport role={context.role!} />
}
