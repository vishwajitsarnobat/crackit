import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { StaffAttendancePage } from '@/components/data-entry/staff-attendance-page'

export default async function TasksStaffAttendancePage() {
  const context = await getCurrentUserContext()
  if (!context?.isActive) redirect('/login')
  if (context.role !== 'centre_head') redirect('/dashboard')

  return <StaffAttendancePage />
}
