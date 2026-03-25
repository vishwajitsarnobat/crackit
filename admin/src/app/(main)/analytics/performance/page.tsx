/**
 * Performance Analytics Page
 * Renders the Performance Dashboard after fetching initial data and verifying permissions.
 */

import { redirect } from 'next/navigation'
import { PerformanceDashboard } from '@/components/analytics/performance/performance-dashboard'
import { getCurrentUserContext } from '@/lib/auth/current-user'

export default async function PerformancePage() {
  const context = await getCurrentUserContext()

  if (!context || !context.isActive) {
    redirect('/login')
  }

  const role = context.role
  const canView = role === 'ceo' || role === 'centre_head' || role === 'teacher'

  if (!canView) {
    redirect('/dashboard')
  }

  return <PerformanceDashboard />
}
