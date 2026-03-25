import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createRewardRuleSchema, updateRewardRuleSchema } from '@/lib/validations/manage'

type RewardRuleRow = {
  id: string
  rule_name: string
  description: string | null
  trigger_type: 'attendance' | 'performance' | 'timely_fee_payment'
  award_frequency: 'monthly'
  scope_type: 'global' | 'centre' | 'batch'
  centre_id: string | null
  batch_id: string | null
  points_awarded: number
  criteria: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

type RewardRuleExecutionRow = {
  id: string
  reward_rule_id: string
  run_month: string
  status: 'running' | 'success' | 'partial' | 'failed'
  eligible_count: number
  awarded_count: number
  skipped_count: number
  failed_count: number
  started_at: string
  completed_at: string | null
  triggered_by: string | null
  error_message: string | null
  metadata: Record<string, unknown>
}

export const GET = withAuth(async () => {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('reward_rules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 500)

  const rules = (data ?? []) as RewardRuleRow[]
  const ruleIds = rules.map((rule) => rule.id)

  if (ruleIds.length === 0) {
    return apiSuccess({ rules: [] })
  }

  const { data: executionData, error: executionError } = await adminClient
    .from('reward_rule_executions')
    .select('id, reward_rule_id, run_month, status, eligible_count, awarded_count, skipped_count, failed_count, started_at, completed_at, triggered_by, error_message, metadata')
    .in('reward_rule_id', ruleIds)
    .order('started_at', { ascending: false })

  if (executionError) return apiError(executionError.message, 500)

  const executionsByRule = new Map<string, RewardRuleExecutionRow[]>()
  for (const execution of (executionData ?? []) as RewardRuleExecutionRow[]) {
    const existing = executionsByRule.get(execution.reward_rule_id) ?? []
    if (existing.length < 5) {
      existing.push(execution)
      executionsByRule.set(execution.reward_rule_id, existing)
    }
  }

  return apiSuccess({
    rules: rules.map((rule) => ({
      ...rule,
      executions: executionsByRule.get(rule.id) ?? [],
    })),
  })
}, ['ceo'])

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const parsed = createRewardRuleSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
  }

  const adminClient = createAdminClient()
  const payload = parsed.data
  const { data, error } = await adminClient
    .from('reward_rules')
    .insert({
      rule_name: payload.rule_name.trim(),
      description: payload.description?.trim() || null,
      trigger_type: payload.trigger_type,
      award_frequency: payload.award_frequency,
      scope_type: payload.scope_type,
      centre_id: payload.centre_id ?? null,
      batch_id: payload.batch_id ?? null,
      points_awarded: payload.points_awarded,
      criteria: payload.criteria,
      is_active: payload.is_active ?? true,
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    })
    .select()
    .single()

  if (error) return apiError(error.message, 400)
  return apiSuccess({ rule: data })
}, ['ceo'])

export const PATCH = withAuth(async (request, ctx) => {
  const body = await request.json()
  const parsed = updateRewardRuleSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
  }

  const { id, ...rest } = parsed.data
  const updates: Record<string, unknown> = {
    updated_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  }

  if (rest.rule_name !== undefined) updates.rule_name = rest.rule_name.trim()
  if (rest.description !== undefined) updates.description = rest.description?.trim() || null
  if (rest.trigger_type !== undefined) updates.trigger_type = rest.trigger_type
  if (rest.award_frequency !== undefined) updates.award_frequency = rest.award_frequency
  if (rest.scope_type !== undefined) updates.scope_type = rest.scope_type
  if (rest.centre_id !== undefined) updates.centre_id = rest.centre_id
  if (rest.batch_id !== undefined) updates.batch_id = rest.batch_id
  if (rest.points_awarded !== undefined) updates.points_awarded = rest.points_awarded
  if (rest.criteria !== undefined) updates.criteria = rest.criteria
  if (rest.is_active !== undefined) updates.is_active = rest.is_active

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('reward_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return apiError(error.message, 400)
  return apiSuccess({ rule: data })
}, ['ceo'])
