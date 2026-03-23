/**
 * Performance Report Page
 * Renders the UI for generating performance reports.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { PerformanceReport } from '@/components/reports/performance-report'

export default async function PerformanceReportPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')
    if (!['ceo', 'centre_head', 'teacher'].includes(context.role ?? '')) redirect('/dashboard')

    return <PerformanceReport role={context.role!} />
}
