/**
 * Staff Attendance Analytics Page
 * Renders the Staff Attendance Dashboard after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { StaffAttendanceDashboard } from '@/components/analytics/staff-attendance/staff-attendance-dashboard'

export default async function StaffAttendancePage() {
    const context = await getCurrentUserContext()

    if (!context || !context.isActive) {
        redirect('/login')
    }

    const allowedRoles = ['ceo', 'centre_head', 'teacher']
    if (!context.role || !allowedRoles.includes(context.role)) {
        redirect('/dashboard') // Fallback for unauthorized roles
    }

    return <StaffAttendanceDashboard role={context.role} />
}
