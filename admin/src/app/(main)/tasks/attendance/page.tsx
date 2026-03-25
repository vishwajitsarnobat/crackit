import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { AttendancePage } from '@/components/data-entry/attendance-page'

export default async function TasksAttendancePage() {
  const context = await getCurrentUserContext()
  if (!context?.isActive) redirect('/login')
  if (context.role !== 'teacher') redirect('/dashboard')

  return <AttendancePage />
}
