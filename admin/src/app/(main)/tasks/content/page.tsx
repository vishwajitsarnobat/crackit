import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { ContentPage } from '@/components/data-entry/content-page'

export default async function TasksContentPage() {
  const context = await getCurrentUserContext()
  if (!context?.isActive) redirect('/login')
  if (context.role !== 'teacher') redirect('/dashboard')

  return <ContentPage />
}
