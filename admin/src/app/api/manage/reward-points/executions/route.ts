import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiSuccess, withAuth } from '@/lib/api/api-helpers'
import { rewardExecutionQuerySchema } from '@/lib/validations/manage'

type RewardExecutionRow = {
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
  reward_rules: { rule_name: string | null } | null
  users: { full_name: string | null } | null
}

export const GET = withAuth(async (request) => {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries())
  const parsed = rewardExecutionQuerySchema.safeParse(searchParams)

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid query', 400)
  }

  const adminClient = createAdminClient()
  let query = adminClient
    .from('reward_rule_executions')
    .select('id, reward_rule_id, run_month, status, eligible_count, awarded_count, skipped_count, failed_count, started_at, completed_at, triggered_by, error_message, metadata, reward_rules(rule_name), users!triggered_by(full_name)')
    .order('started_at', { ascending: false })
    .limit(parsed.data.limit ?? 25)

  if (parsed.data.rule_id) query = query.eq('reward_rule_id', parsed.data.rule_id)
  if (parsed.data.status) query = query.eq('status', parsed.data.status)
  if (parsed.data.month_year) query = query.eq('run_month', parsed.data.month_year)

  const { data, error } = await query
  if (error) return apiError(error.message, 500)

  return apiSuccess({
    executions: ((data ?? []) as unknown as RewardExecutionRow[]).map((execution) => ({
      id: execution.id,
      reward_rule_id: execution.reward_rule_id,
      rule_name: execution.reward_rules?.rule_name ?? 'Unknown rule',
      run_month: execution.run_month,
      status: execution.status,
      eligible_count: execution.eligible_count,
      awarded_count: execution.awarded_count,
      skipped_count: execution.skipped_count,
      failed_count: execution.failed_count,
      started_at: execution.started_at,
      completed_at: execution.completed_at,
      triggered_by: execution.triggered_by,
      triggered_by_name: execution.users?.full_name ?? null,
      error_message: execution.error_message,
      metadata: execution.metadata ?? {},
    })),
  })
}, ['ceo'])
