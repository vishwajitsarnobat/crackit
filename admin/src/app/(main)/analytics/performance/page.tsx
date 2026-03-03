import { redirect } from 'next/navigation'
import { PerformanceDashboard } from '@/components/analytics/performance/performance-dashboard'
import { getCurrentUserContext } from '@/lib/auth/current-user'

const EMPTY_DATA = {
  filters: {
    centres: [],
    batches: [],
    students: [],
    selectedStudentId: null,
  },
  summary: {
    examsCount: 0,
    marksEntries: 0,
    absentCount: 0,
    averagePercentage: null,
    topPercentage: null,
  },
  trendMode: 'batch' as const,
  trend: [],
  batchComparison: [],
  marks: [],
}

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

  return <PerformanceDashboard initialData={EMPTY_DATA} />
}
