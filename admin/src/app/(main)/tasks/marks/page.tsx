import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { MarksPage } from '@/components/data-entry/marks-page'

export default async function TasksMarksPage() {
  const context = await getCurrentUserContext()
  if (!context?.isActive) redirect('/login')
  if (context.role !== 'teacher') redirect('/dashboard')

  return <MarksPage />
}
