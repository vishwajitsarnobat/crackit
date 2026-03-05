import { redirect } from 'next/navigation'
import { AttendanceDashboard } from '@/components/analytics/attendance/attendance-dashboard'
import { getCurrentUserContext } from '@/lib/auth/current-user'

export default async function AttendancePage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')

    const canView = context.role === 'ceo' || context.role === 'centre_head' || context.role === 'teacher'
    if (!canView) redirect('/dashboard')

    return <AttendanceDashboard />
}
