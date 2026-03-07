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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Staff Attendance</h1>
                <p className="mt-1 text-sm text-muted-foreground">Monitor teacher attendance, in/out timings, and monthly statistics.</p>
            </div>
            
            <StaffAttendanceDashboard role={context.role} />
        </div>
    )
}
