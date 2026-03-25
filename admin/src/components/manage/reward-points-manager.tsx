'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gift, History, Minus, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { SelectField } from '@/components/shared/form/select-field'
import { fetchJson } from '@/lib/http/fetch-json'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { RewardRulesManager } from '@/components/manage/reward-rules-manager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { AppRole, Batch, Centre, RewardLedgerEntry, RewardStudentSummary } from '@/lib/types/entities'
import { useScopedFilters } from '@/lib/hooks/use-scoped-filters'
import { useRewardPointsFilterStore } from '@/lib/stores/reward-points-filters'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

type RewardStudentsResponse = {
  students?: RewardStudentSummary[]
  student?: RewardStudentSummary | null
  transactions?: RewardLedgerEntry[]
}

function reasonLabel(reason: RewardLedgerEntry['reason']) {
  return reason.replaceAll('_', ' ')
}

export function RewardPointsManager({ role }: { role: AppRole }) {
  const queryClient = useQueryClient()
  const {
    selectedStudentId,
    centreId,
    batchId,
    search,
    setFilter,
    patchFilters,
  } = useRewardPointsFilterStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pointsDelta, setPointsDelta] = useState('')
  const [description, setDescription] = useState('')
  const scopedFiltersQuery = useScopedFilters()
  const centres: Centre[] = useMemo(() => scopedFiltersQuery.data?.centres ?? [], [scopedFiltersQuery.data?.centres])
  const batches: Batch[] = useMemo(() => scopedFiltersQuery.data?.batches ?? [], [scopedFiltersQuery.data?.batches])

  const studentsQuery = useQuery({
    queryKey: ['reward-students', centreId, batchId, search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (centreId) params.set('centre_id', centreId)
      if (batchId && batchId !== 'all') params.set('batch_id', batchId)
      if (search.trim()) params.set('search', search.trim())
      return fetchJson<RewardStudentsResponse>(`/api/manage/reward-points/students?${params.toString()}`, { errorPrefix: 'Load reward students' })
    },
    staleTime: 15_000,
  })

  useQueryErrorToast(scopedFiltersQuery.error, 'Failed to load reward filters')
  useQueryErrorToast(studentsQuery.error, 'Failed to load students')

  const students = useMemo(() => studentsQuery.data?.students ?? [], [studentsQuery.data?.students])
  const effectiveSelectedStudentId = selectedStudentId && students.some((student) => student.student_id === selectedStudentId)
    ? selectedStudentId
    : (students[0]?.student_id ?? '')

  const detailsQuery = useQuery({
    queryKey: ['reward-student-details', effectiveSelectedStudentId, centreId, batchId],
    queryFn: () => {
      const params = new URLSearchParams({ student_id: effectiveSelectedStudentId })
      if (centreId) params.set('centre_id', centreId)
      if (batchId && batchId !== 'all') params.set('batch_id', batchId)
      return fetchJson<RewardStudentsResponse>(`/api/manage/reward-points/students?${params.toString()}`, { errorPrefix: 'Load reward history' })
    },
    enabled: Boolean(effectiveSelectedStudentId),
    staleTime: 15_000,
  })

  useQueryErrorToast(detailsQuery.error, 'Failed to load reward history')

  const selectedStudent = detailsQuery.data?.student ?? null
  const transactions: RewardLedgerEntry[] = detailsQuery.data?.transactions ?? []
  const loading = studentsQuery.isPending || studentsQuery.isFetching || scopedFiltersQuery.isPending || scopedFiltersQuery.isFetching
  const detailsLoading = detailsQuery.isPending || detailsQuery.isFetching

  const adjustmentMutation = useMutation({
    mutationFn: () => fetchJson('/api/manage/reward-points/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: effectiveSelectedStudentId,
        points_delta: Number(pointsDelta),
        description,
      }),
    }),
    onSuccess: async () => {
      toast.success('Reward points updated')
      setDialogOpen(false)
      setPointsDelta('')
      setDescription('')
      await queryClient.invalidateQueries({ queryKey: ['reward-students'] })
      await queryClient.invalidateQueries({ queryKey: ['reward-student-details', effectiveSelectedStudentId] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update reward points')
    },
  })

  const visibleBatches = useMemo(
    () => batches.filter((batch) => !centreId || batch.centre_id === centreId),
    [batches, centreId],
  )

  async function applyAdjustment() {
    if (!selectedStudent) return
    await adjustmentMutation.mutateAsync()
  }

  return (
    <Tabs defaultValue={role === 'ceo' ? 'rules' : 'students'} className="space-y-4">
      <TabsList>
        {role === 'ceo' && <TabsTrigger value="rules">Rules</TabsTrigger>}
        <TabsTrigger value="students">Student Points</TabsTrigger>
      </TabsList>

      {role === 'ceo' && (
        <TabsContent value="rules">
          <RewardRulesManager />
        </TabsContent>
      )}

      <TabsContent value="students" className="space-y-4">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b bg-muted/30 px-5 py-3.5">
            <CardTitle className="text-base tracking-tight">Student Reward Filters</CardTitle>
            <CardDescription className="mt-0.5">Search and filter students before reviewing ledgers or making manual adjustments.</CardDescription>
          </div>
          <div className={`grid gap-4 px-5 py-4 ${role === 'ceo' ? 'md:grid-cols-[1fr_220px_240px]' : 'md:grid-cols-[1fr_240px]'}`}>
            <div className="space-y-2">
              <Label htmlFor="reward-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reward-search"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setFilter('search', event.target.value)}
                  placeholder="Search by student name or code"
                />
              </div>
            </div>
            {role === 'ceo' && <SelectField id="reward-centre" label="Centre" value={centreId || 'all'} onChange={(value) => { const nextCentre = value === 'all' ? '' : value; patchFilters({ centreId: nextCentre, batchId: '', selectedStudentId: '' }) }} options={[{ value: 'all', label: 'All centres' }, ...centres.map((centre) => ({ value: centre.id, label: centre.centre_name }))]} placeholder="All centres" />}
            <SelectField id="reward-batch" label="Batch" value={batchId || 'all'} onChange={(value) => { const nextBatch = value === 'all' ? '' : value; patchFilters({ batchId: nextBatch, selectedStudentId: '' }) }} options={[{ value: 'all', label: 'All batches' }, ...visibleBatches.map((batch) => ({ value: batch.id, label: batch.batch_name }))]} placeholder="All batches" />
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-b bg-muted/30 px-5 py-3.5">
              <CardTitle className="text-base tracking-tight">Students</CardTitle>
              <CardDescription className="mt-0.5">{students.length} student card(s)</CardDescription>
            </div>
            <div className="max-h-[700px] overflow-y-auto">
              {loading ? (
                <div className="h-56 animate-pulse bg-muted/20" />
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
                  <Gift className="mb-3 h-8 w-8 opacity-20" />
                  No students match the current filters.
                </div>
              ) : (
                <div className="divide-y">
                  {students.map((student) => (
                    <button
                      key={student.student_id}
                      type="button"
                       onClick={() => setFilter('selectedStudentId', student.student_id)}
                       className={`w-full px-5 py-4 text-left transition-colors hover:bg-muted/30 ${effectiveSelectedStudentId === student.student_id ? 'bg-muted/40' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{student.student_name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{student.student_code || '-'}</div>
                        </div>
                        <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-200">
                          {student.current_points} pts
                        </Badge>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        {student.batch_names.length > 0 ? student.batch_names.join(', ') : 'No active batches'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-b bg-muted/30 px-5 py-3.5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base tracking-tight">Reward Ledger</CardTitle>
                  <CardDescription className="mt-0.5">View automatic awards and manual point changes for the selected student.</CardDescription>
                </div>
                {selectedStudent && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />Change Points
                  </Button>
                )}
              </div>
            </div>

            {!selectedStudentId ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
                <History className="mb-3 h-8 w-8 opacity-20" />
                Select a student to inspect reward history.
              </div>
            ) : detailsLoading ? (
              <div className="h-56 animate-pulse bg-muted/20" />
            ) : !selectedStudent ? (
              <div className="flex min-h-[320px] items-center justify-center p-10 text-sm text-muted-foreground">Student details are unavailable for the current scope.</div>
            ) : (
              <div className="space-y-5 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                  <div>
                    <div className="text-xl font-semibold">{selectedStudent.student_name}</div>
                    <div className="mt-1 font-mono text-sm text-muted-foreground">{selectedStudent.student_code || '-'}</div>
                  </div>
                  <div className="rounded-lg border bg-background px-4 py-3 text-right">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Current Points</div>
                    <div className="text-2xl font-semibold text-sky-600">{selectedStudent.current_points}</div>
                  </div>
                </div>

                {transactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    No reward transactions recorded yet for this student.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="rounded-xl border bg-background p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-medium capitalize">{reasonLabel(transaction.reason)}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{transaction.description || 'No additional description provided.'}</div>
                          </div>
                          <Badge variant="outline" className={transaction.points >= 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}>
                            {transaction.points >= 0 ? <Plus className="mr-1 h-3 w-3" /> : <Minus className="mr-1 h-3 w-3" />}
                            {transaction.points}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                          <div>Date: <span className="font-medium text-foreground">{transaction.created_at.slice(0, 10)}</span></div>
                          <div>Month: <span className="font-medium text-foreground">{transaction.month_year ? transaction.month_year.slice(0, 7) : 'N/A'}</span></div>
                          <div>Rule: <span className="font-medium text-foreground">{transaction.reward_rule_id || 'Manual / N/A'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </TabsContent>

      <ManageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Change Reward Points"
        description="Enter a positive or negative point change and a mandatory description for the audit log."
        onSubmit={applyAdjustment}
        saving={adjustmentMutation.isPending}
        submitLabel="Save Change"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="font-medium">{selectedStudent?.student_name}</div>
              <div className="font-mono text-sm text-muted-foreground">{selectedStudent?.student_code || '-'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points-delta">Updated Points Delta *</Label>
            <Input
              id="points-delta"
              type="number"
              step="1"
              value={pointsDelta}
              onChange={(event) => setPointsDelta(event.target.value)}
              placeholder="Use positive to add, negative to deduct"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reward-description">Description *</Label>
            <Textarea
              id="reward-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Why are you changing these points?"
              required
            />
          </div>
        </div>
      </ManageDialog>
    </Tabs>
  )
}
