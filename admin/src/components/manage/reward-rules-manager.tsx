'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Play, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { SelectField } from '@/components/shared/form/select-field'
import { fetchJson } from '@/lib/http/fetch-json'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type Batch, type Centre, type RewardRule } from '@/lib/types/entities'
import { useScopedFilters } from '@/lib/hooks/use-scoped-filters'

type RewardRulesPayload = { rules: RewardRule[] }

const triggerOptions = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'perfect_attendance', label: 'Perfect Attendance' },
  { value: 'attendance_streak', label: 'Attendance Streak' },
  { value: 'performance', label: 'Performance' },
  { value: 'timely_fee_payment', label: 'Timely Fee Payment' },
] as const

const scopeOptions = [
  { value: 'global', label: 'Global' },
  { value: 'centre', label: 'Centre' },
  { value: 'batch', label: 'Batch' },
] as const

export function RewardRulesManager() {
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RewardRule | null>(null)
  const [runMonth, setRunMonth] = useState(format(new Date(), 'yyyy-MM'))

  const [ruleName, setRuleName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<'attendance' | 'perfect_attendance' | 'attendance_streak' | 'performance' | 'timely_fee_payment'>('attendance')
  const [scopeType, setScopeType] = useState<'global' | 'centre' | 'batch'>('global')
  const [centreId, setCentreId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [pointsAwarded, setPointsAwarded] = useState('')
  const [minimumPercentage, setMinimumPercentage] = useState('85')
  const [minimumDays, setMinimumDays] = useState('20')
  const [minimumStreakDays, setMinimumStreakDays] = useState('5')
  const [subject, setSubject] = useState('')
  const [dueDayOfMonth, setDueDayOfMonth] = useState('10')
  const [requireFullPaymentByDueDate, setRequireFullPaymentByDueDate] = useState<'true' | 'false'>('true')

  const rulesQuery = useQuery({
    queryKey: ['reward-rules'],
    queryFn: () => fetchJson<RewardRulesPayload>('/api/manage/reward-points/rules', { errorPrefix: 'Load reward rules' }),
    staleTime: 30_000,
  })
  const scopedFiltersQuery = useScopedFilters()

  useEffect(() => {
    if (rulesQuery.error) {
      toast.error(rulesQuery.error instanceof Error ? rulesQuery.error.message : 'Failed to load reward rules')
    }
  }, [rulesQuery.error])

  useEffect(() => {
    if (scopedFiltersQuery.error) {
      toast.error(scopedFiltersQuery.error instanceof Error ? scopedFiltersQuery.error.message : 'Failed to load reward filters')
    }
  }, [scopedFiltersQuery.error])

  const rules = useMemo(() => rulesQuery.data?.rules ?? [], [rulesQuery.data?.rules])
  const centres: Centre[] = useMemo(() => scopedFiltersQuery.data?.centres ?? [], [scopedFiltersQuery.data?.centres])
  const batches: Batch[] = useMemo(() => scopedFiltersQuery.data?.batches ?? [], [scopedFiltersQuery.data?.batches])
  const loading = rulesQuery.isPending || rulesQuery.isFetching || scopedFiltersQuery.isPending || scopedFiltersQuery.isFetching

  const scopedBatches = useMemo(() => {
    if (scopeType === 'centre' && centreId) return batches.filter((batch) => batch.centre_id === centreId)
    return batches
  }, [batches, centreId, scopeType])

  function resetForm(rule?: RewardRule) {
    const criteria = (rule?.criteria ?? {}) as Record<string, unknown>
    setEditing(rule ?? null)
    setRuleName(rule?.rule_name ?? '')
    setDescription(rule?.description ?? '')
    setTriggerType(rule?.trigger_type ?? 'attendance')
    setScopeType(rule?.scope_type ?? 'global')
    setCentreId(rule?.centre_id ?? '')
    setBatchId(rule?.batch_id ?? '')
    setPointsAwarded(rule ? String(rule.points_awarded) : '')
    setMinimumPercentage(String(criteria.minimum_percentage ?? (rule?.trigger_type === 'performance' ? 75 : 85)))
    setMinimumDays(String(criteria.minimum_days ?? 20))
    setMinimumStreakDays(String(criteria.minimum_streak_days ?? 5))
    setSubject(typeof criteria.subject === 'string' ? criteria.subject : '')
    setDueDayOfMonth(String(criteria.due_day_of_month ?? 10))
    setRequireFullPaymentByDueDate(String(criteria.require_full_payment_by_due_date ?? true) as 'true' | 'false')
    setDialogOpen(true)
  }

  function buildCriteria() {
    if (triggerType === 'attendance') {
      return { minimum_percentage: Number(minimumPercentage || 85) }
    }

    if (triggerType === 'perfect_attendance') {
      return { minimum_days: Number(minimumDays || 20) }
    }

    if (triggerType === 'attendance_streak') {
      return { minimum_streak_days: Number(minimumStreakDays || 5) }
    }

    if (triggerType === 'performance') {
      return {
        minimum_percentage: Number(minimumPercentage || 75),
        ...(subject.trim() ? { subject: subject.trim() } : {}),
      }
    }

    return {
      due_day_of_month: Number(dueDayOfMonth || 10),
      require_full_payment_by_due_date: requireFullPaymentByDueDate === 'true',
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        rule_name: ruleName,
        description: description || null,
        trigger_type: triggerType,
        award_frequency: 'monthly',
        scope_type: scopeType,
        centre_id: scopeType === 'centre' ? centreId : null,
        batch_id: scopeType === 'batch' ? batchId : null,
        points_awarded: Number(pointsAwarded),
        criteria: buildCriteria(),
        is_active: editing?.is_active ?? true,
      }

      await fetchJson('/api/manage/reward-points/rules', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      toast.success(editing ? 'Reward rule updated' : 'Reward rule created')
      setDialogOpen(false)
      await rulesQuery.refetch()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save reward rule')
    } finally {
      setSaving(false)
    }
  }

  async function toggleRule(rule: RewardRule) {
    try {
      await fetchJson('/api/manage/reward-points/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      })
      toast.success(`Rule ${rule.is_active ? 'deactivated' : 'activated'}`)
      await rulesQuery.refetch()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update rule status')
    }
  }

  async function runRule(rule: RewardRule) {
    try {
      const json = await fetchJson<{ eligible_count: number; awarded_count: number }>('/api/manage/reward-points/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_id: rule.id, month_year: `${runMonth}-01` }),
      })
      toast.success(`Rule executed. Eligible: ${json.eligible_count}, awarded: ${json.awarded_count}`)
      await rulesQuery.refetch()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to execute rule')
    }
  }

  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
          <div>
            <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">Reward Rules</CardTitle>
            <CardDescription className="mt-0.5">Define reusable monthly rules for attendance, performance, and timely fee payment rewards.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="reward-run-month" className="text-xs text-muted-foreground">Run month</Label>
              <Input id="reward-run-month" type="month" value={runMonth} onChange={(event) => setRunMonth(event.target.value)} className="w-[160px]" />
            </div>
            <Button onClick={() => resetForm()}><Plus className="mr-2 h-4 w-4" />New Rule</Button>
          </div>
        </div>

        {loading ? (
          <div className="h-52 animate-pulse bg-primary/10 dark:bg-white/[0.04]" />
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
            <Sparkles className="mb-3 h-8 w-8 opacity-20" />
            No reward rules defined yet.
          </div>
        ) : (
          <div className="divide-y divide-secondary/10">
            {rules.map((rule) => (
              <div key={rule.id} className="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-start xl:justify-between hover:bg-primary/6 dark:hover:bg-white/[0.03]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-secondary dark:text-foreground">{rule.rule_name}</div>
                    <Badge variant="outline" className={rule.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">{rule.trigger_type.replaceAll('_', ' ')}</Badge>
                    <Badge variant="outline">{rule.scope_type}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{rule.description || 'No description provided.'}</div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <div>Points: <span className="font-medium text-foreground">{rule.points_awarded}</span></div>
                    <div>Centre: <span className="font-medium text-foreground">{centres.find((centre) => centre.id === rule.centre_id)?.centre_name ?? 'Global / N/A'}</span></div>
                    <div>Batch: <span className="font-medium text-foreground">{batches.find((batch) => batch.id === rule.batch_id)?.batch_name ?? 'N/A'}</span></div>
                  </div>
                  <div className="rounded-2xl border border-secondary/10 bg-white/55 px-3 py-2 text-xs text-muted-foreground dark:bg-white/[0.04]">
                    Criteria: <span className="font-mono">{JSON.stringify(rule.criteria)}</span>
                  </div>
                  <div className="rounded-2xl border border-secondary/10 bg-white/55 px-3 py-2 text-xs text-muted-foreground dark:bg-white/[0.04]">
                    Recent runs:{' '}
                    {rule.executions && rule.executions.length > 0 ? (
                      <span className="space-y-1">
                        {rule.executions.slice(0, 3).map((execution) => (
                          <span key={execution.id} className="block">
                            {execution.run_month.slice(0, 7)} - {execution.status} - awarded {execution.awarded_count}/{execution.eligible_count}
                            {execution.failed_count > 0 ? ` - failed ${execution.failed_count}` : ''}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="font-medium"> No executions yet.</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => resetForm(rule)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => toggleRule(rule)}>{rule.is_active ? 'Deactivate' : 'Activate'}</Button>
                  <Button size="sm" onClick={() => runRule(rule)} disabled={!rule.is_active}><Play className="mr-1.5 h-3.5 w-3.5" />Run Now</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ManageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit Reward Rule' : 'Create Reward Rule'}
        description="Configure rule scope, monthly criteria, and reward points."
        onSubmit={handleSave}
        saving={saving}
        submitLabel={editing ? 'Update Rule' : 'Create Rule'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Rule Name *</Label>
            <Input id="rule-name" value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="e.g. 85%+ attendance reward" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-description">Description</Label>
            <Textarea id="rule-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="What this rule rewards and why" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField id="reward-trigger-type" label="Trigger Type *" value={triggerType} onChange={(value) => setTriggerType(value as typeof triggerType)} options={triggerOptions.map((option) => ({ value: option.value, label: option.label }))} />
            <SelectField id="reward-scope-type" label="Scope *" value={scopeType} onChange={(value) => setScopeType(value as typeof scopeType)} options={scopeOptions.map((option) => ({ value: option.value, label: option.label }))} />
          </div>

          {scopeType === 'centre' && (
            <SelectField id="reward-centre-select" label="Centre *" value={centreId} onChange={setCentreId} options={centres.map((centre) => ({ value: centre.id, label: centre.centre_name }))} placeholder="Choose centre" />
          )}

          {scopeType === 'batch' && (
            <SelectField id="reward-batch-select" label="Batch *" value={batchId} onChange={setBatchId} options={scopedBatches.map((batch) => ({ value: batch.id, label: batch.batch_name }))} placeholder="Choose batch" />
          )}

          <div className="space-y-2">
            <Label htmlFor="points-awarded">Points Awarded *</Label>
            <Input id="points-awarded" type="number" min="1" step="1" value={pointsAwarded} onChange={(event) => setPointsAwarded(event.target.value)} placeholder="e.g. 25" required />
          </div>

          {(triggerType === 'attendance' || triggerType === 'performance') && (
            <div className="space-y-2">
              <Label htmlFor="minimum-percentage">Minimum Percentage *</Label>
              <Input id="minimum-percentage" type="number" min="1" max="100" step="1" value={minimumPercentage} onChange={(event) => setMinimumPercentage(event.target.value)} />
            </div>
          )}

          {triggerType === 'perfect_attendance' && (
            <div className="space-y-2">
              <Label htmlFor="minimum-days">Minimum Tracked Days *</Label>
              <Input id="minimum-days" type="number" min="1" max="31" step="1" value={minimumDays} onChange={(event) => setMinimumDays(event.target.value)} />
            </div>
          )}

          {triggerType === 'attendance_streak' && (
            <div className="space-y-2">
              <Label htmlFor="minimum-streak-days">Minimum Present Streak Days *</Label>
              <Input id="minimum-streak-days" type="number" min="2" max="31" step="1" value={minimumStreakDays} onChange={(event) => setMinimumStreakDays(event.target.value)} />
            </div>
          )}

          {triggerType === 'performance' && (
            <div className="space-y-2">
              <Label htmlFor="reward-subject">Subject Filter</Label>
              <Input id="reward-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Optional subject, e.g. Mathematics" />
            </div>
          )}

          {triggerType === 'timely_fee_payment' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="due-day">Fee Payment Due Day *</Label>
                <Input id="due-day" type="number" min="1" max="31" step="1" value={dueDayOfMonth} onChange={(event) => setDueDayOfMonth(event.target.value)} />
              </div>
              <SelectField
                id="require-full-payment"
                label="Eligibility rule"
                value={requireFullPaymentByDueDate}
                onChange={(value) => setRequireFullPaymentByDueDate(value as 'true' | 'false')}
                options={[
                  { value: 'true', label: 'Full payment by due day' },
                  { value: 'false', label: 'Any payment by due day' },
                ]}
              />
            </div>
          )}
        </div>
      </ManageDialog>
    </div>
  )
}
