import { redirect } from 'next/navigation'

import { ApprovalsPage } from '@/components/approvals/approvals-page'
import { getCurrentUserContext } from '@/lib/auth/current-user'

export default async function ApprovalsRoutePage() {
  const context = await getCurrentUserContext()
  if (!context?.isActive) redirect('/login')
  if (!['ceo', 'centre_head'].includes(context.role ?? '')) redirect('/dashboard')

  return <ApprovalsPage />
}
