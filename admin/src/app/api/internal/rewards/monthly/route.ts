import { apiError, apiSuccess } from '@/lib/api/api-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeRewardRule, getPreviousMonthDateString, type RewardRuleRow } from '@/lib/server/rewards/execute-reward-rule'
import { requireAuthorizedCronRequest } from '@/lib/server/cron-auth'

export async function GET(request: Request) {
  const unauthorizedResponse = requireAuthorizedCronRequest(request)
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  const monthYear = new URL(request.url).searchParams.get('month_year') ?? getPreviousMonthDateString()
  const adminClient = createAdminClient()
  const { data: rules, error } = await adminClient
    .from('reward_rules')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) {
    return apiError(error.message, 500)
  }

  const results = [] as Array<{
    rule_id: string
    rule_name: string
    execution_id?: string
    status?: string
    eligible_count?: number
    awarded_count?: number
    skipped_count?: number
    failed_count?: number
    error?: string
  }>

  for (const rule of (rules ?? []) as RewardRuleRow[]) {
    try {
      const result = await executeRewardRule({
        rule,
        monthYear,
        triggeredBy: null,
      })

      results.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        execution_id: result.executionId,
        status: result.status,
        eligible_count: result.eligibleCount,
        awarded_count: result.awardedCount,
        skipped_count: result.skippedCount,
        failed_count: result.failedCount,
      })
    } catch (executionError) {
      results.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        error: executionError instanceof Error ? executionError.message : 'Unexpected reward cron failure',
      })
    }
  }

  return apiSuccess({
    ok: true,
    month_year: monthYear,
    rule_count: results.length,
    results,
  })
}
