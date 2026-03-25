'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { fetchJson } from '@/lib/http/fetch-json'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useQueryErrorToast } from '@/lib/hooks/use-query-error-toast'

type ApprovalTab = 'pending' | 'approved' | 'rejected'

type ApprovalItem = {
  id: string
  requested_role: string
  status: ApprovalTab
  applicant_note: string | null
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  applicant: {
    id: string
    full_name: string
    email: string | null
  } | null
  centre: {
    id: string
    centre_name: string
  } | null
}

const TAB_META: Record<ApprovalTab, { label: string; icon: typeof Clock3; color: string; description: string }> = {
  pending: {
    label: 'Pending',
    icon: Clock3,
    color: 'bg-amber-500/10 text-amber-600 border-amber-200',
    description: 'Requests currently waiting for your decision.',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    description: 'Requests that were approved and activated.',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-red-500/10 text-red-600 border-red-200',
    description: 'Requests that were rejected with recorded reasons.',
  },
}

export function ApprovalsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<ApprovalTab>('pending')
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  async function fetchApprovals(nextTab: ApprovalTab) {
    const payload = await fetchJson<ApprovalItem[]>(`/api/approvals?status=${nextTab}`, {
      cache: 'no-store',
      errorPrefix: 'Load approvals',
    })
    return Array.isArray(payload) ? payload : []
  }

  const { data: items = [], isPending, isFetching, error } = useQuery({
    queryKey: ['approvals', tab],
    queryFn: () => fetchApprovals(tab),
    staleTime: 15_000,
    retry: false,
  })

  useQueryErrorToast(error, 'Failed to load approvals.')

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string | null }) => {
      await fetchJson(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: reason ?? null }),
        errorPrefix: 'Update approval request',
      })
    },
    onSuccess: async (_, variables) => {
      toast.success(variables.action === 'approve' ? 'Request approved.' : 'Request rejected.')
      setActingId(null)
      await queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
    onError: (mutationError: unknown) => {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Could not update approval request.')
      setActingId(null)
    },
  })

  const loading = isPending || isFetching

  async function handleAction(id: string, action: 'approve' | 'reject', reason?: string | null) {
    setActingId(id)
    await actionMutation.mutateAsync({ id, action, reason })
  }

  const summary = useMemo(() => ({
    pending: items.filter((item) => item.status === 'pending').length,
    approved: items.filter((item) => item.status === 'approved').length,
    rejected: items.filter((item) => item.status === 'rejected').length,
  }), [items])

  const activeMeta = TAB_META[tab]

  return (
    <div className="space-y-6">
      <section className="glass-panel soft-ring rounded-[32px] p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Approvals</Badge>
            <div>
              <h1 className="font-serif text-4xl tracking-tight text-secondary dark:text-primary sm:text-5xl">Access Request Review</h1>
              <p className="mt-3 text-base text-muted-foreground">Review pending, approved, and rejected role requests with clear centre context and auditable decisions.</p>
            </div>
          </div>

          <div className="grid min-w-[300px] gap-3 sm:grid-cols-3">
            {(['pending', 'approved', 'rejected'] as ApprovalTab[]).map((key) => {
              const meta = TAB_META[key]
              const Icon = meta.icon
              return (
                <div key={key} className="rounded-[24px] border border-secondary/10 bg-white/55 px-4 py-4 dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{meta.label}</div>
                    <Icon className="h-4 w-4 text-secondary dark:text-primary" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-secondary dark:text-foreground">{summary[key]}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={(value) => setTab(value as ApprovalTab)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="gap-0 overflow-hidden">
        <CardHeader className="border-b border-secondary/10 bg-primary/8 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-secondary dark:text-primary">
                <activeMeta.icon className="h-4 w-4 text-secondary dark:text-primary" />{activeMeta.label} Requests
              </CardTitle>
              <CardDescription>{activeMeta.description}</CardDescription>
            </div>
            <Badge variant="outline" className={activeMeta.color}>{items.length} request{items.length === 1 ? '' : 's'}</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading approvals...</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-sm text-muted-foreground">
              <ShieldAlert className="h-8 w-8 opacity-20" />
              No {tab} requests found.
            </div>
          ) : (
            <div className="divide-y divide-secondary/10">
              {items.map((item) => (
                <div key={item.id} className="space-y-4 p-5 transition-colors hover:bg-primary/6 dark:hover:bg-white/[0.03]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-secondary dark:text-foreground">{item.applicant?.full_name ?? 'Unknown user'}</p>
                        <Badge variant="outline" className="border-secondary/10 bg-white/70 uppercase tracking-wide text-[10px] text-muted-foreground dark:bg-white/[0.05]">
                          {item.requested_role.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={TAB_META[item.status].color}>{item.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.applicant?.email ?? '-'}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Requested: {item.created_at.slice(0, 10)}</span>
                        {item.reviewed_at && <span>Reviewed: {item.reviewed_at.slice(0, 10)}</span>}
                        {item.centre?.centre_name && <span>Centre: {item.centre.centre_name}</span>}
                      </div>
                    </div>

                    {tab === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleAction(item.id, 'approve')} disabled={actingId === item.id}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:text-red-600 dark:hover:text-red-300"
                          onClick={() => {
                            setRejectingId(item.id)
                            setRejectionReason('')
                            setRejectDialogOpen(true)
                          }}
                          disabled={actingId === item.id}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  {item.applicant_note && (
                    <div className="rounded-[24px] border border-secondary/10 bg-white/60 p-4 text-sm text-foreground/85 dark:bg-white/[0.04]">
                      <span className="font-medium text-secondary dark:text-foreground">Applicant note:</span> {item.applicant_note}
                    </div>
                  )}

                  {item.rejection_reason && (
                    <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                      <span className="font-medium text-red-200">Rejection reason:</span> {item.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>Add a reason so the rejection is clearly auditable to the requester and reviewer.</DialogDescription>
          </DialogHeader>

          <Textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Reason for rejection"
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!rejectingId) return
                setRejectDialogOpen(false)
                await handleAction(rejectingId, 'reject', rejectionReason.trim() || null)
              }}
            >
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
