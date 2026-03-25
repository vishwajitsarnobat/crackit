import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiSuccess, withAuth } from '@/lib/api/api-helpers'
import { previewRewardRule, type RewardRuleRow } from '@/lib/server/rewards/execute-reward-rule'
import { previewRewardRuleSchema } from '@/lib/validations/manage'

export const POST = withAuth(async (request) => {
  const body = await request.json()
  const parsed = previewRewardRuleSchema.safeParse(body)

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

  const preview = await previewRewardRule({
    rule: ruleData as RewardRuleRow,
    monthYear: parsed.data.month_year,
    limit: parsed.data.limit,
  })

  return apiSuccess({
    ok: true,
    eligible_count: preview.eligibleCount,
    sample: preview.sample,
  })
}, ['ceo'])
