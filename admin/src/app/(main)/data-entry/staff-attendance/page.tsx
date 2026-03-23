/**
 * Staff Attendance Entry Page
 * Renders the staff attendance UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { StaffAttendancePage } from '@/components/data-entry/staff-attendance-page'

export default async function DataEntryStaffAttendancePage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head'].includes(context.role ?? '')) redirect('/dashboard')

    return <StaffAttendancePage role={context.role!} />
}
