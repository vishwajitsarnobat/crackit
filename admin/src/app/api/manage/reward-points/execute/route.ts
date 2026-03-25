import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiSuccess, withAuth } from '@/lib/api/api-helpers'
import { executeRewardRule, type RewardRuleRow } from '@/lib/server/rewards/execute-reward-rule'
import { executeRewardRuleSchema } from '@/lib/validations/manage'

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const parsed = executeRewardRuleSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
  }

  const adminClient = createAdminClient()
  const { data: ruleData, error: ruleError } = await adminClient
    .from('reward_rules')
    .select('*')
    .eq('id', parsed.data.rule_id)
    .single()

  if (ruleError || !ruleData) return apiError('Reward rule not found.', 404)

  const rule = ruleData as RewardRuleRow
  if (!rule.is_active) return apiError('Reward rule is inactive.', 400)

  const result = await executeRewardRule({
    rule,
    monthYear: parsed.data.month_year,
    triggeredBy: ctx.user.id,
  })

  return apiSuccess({
    ok: true,
    execution_id: result.executionId,
    status: result.status,
    eligible_count: result.eligibleCount,
    awarded_count: result.awardedCount,
    skipped_count: result.skippedCount,
    failed_count: result.failedCount,
  })
}, ['ceo'])
