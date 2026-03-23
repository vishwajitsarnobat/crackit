/**
 * Attendance Data Entry Page
 * Renders the student attendance entry UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { AttendancePage } from '@/components/data-entry/attendance-page'

export default async function DataEntryAttendancePage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head', 'teacher'].includes(context.role ?? '')) redirect('/dashboard')

    return <AttendancePage role={context.role!} />
}
