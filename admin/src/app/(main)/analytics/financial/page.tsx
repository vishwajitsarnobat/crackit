/**
 * Financial Analytics Page
 * Renders the Financial Dashboard after verifying user authentication and permissions.
 */

import { redirect } from 'next/navigation'
import { FinancialDashboard } from '@/components/analytics/financial/financial-dashboard'
import { getCurrentUserContext } from '@/lib/auth/current-user'

export default async function FinancialAnalyticsPage() {
    const context = await getCurrentUserContext()
    if (!context?.isActive) redirect('/login')

    const canView = context.role === 'ceo' || context.role === 'centre_head' || context.role === 'accountant'
    if (!canView) redirect('/dashboard')

    return <FinancialDashboard />
}
