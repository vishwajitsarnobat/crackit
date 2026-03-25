import { redirect } from 'next/navigation'
import { getCurrentUserContext } from '@/lib/auth/current-user'
import { RewardPointsManager } from '@/components/manage/reward-points-manager'

export default async function ManageRewardPointsPage() {
  const context = await getCurrentUserContext()

  if (!context?.isActive) redirect('/login')
  if (!['ceo', 'centre_head'].includes(context.role ?? '')) redirect('/dashboard')

  return <RewardPointsManager role={context.role!} />
}
