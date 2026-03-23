'use client'

/**
 * Approvals Page
 * Client component to display and manage pending approvals for the current user.
 */

import { useEffect, useState } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

type ApprovalItem = {
  id: string
  requested_role: string
  status: 'pending' | 'approved' | 'rejected'
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

export default function ApprovalsPage() {
  const [tab, setTab] = useState<'pending' | 'processed'>('pending')
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  function switchTab(nextTab: 'pending' | 'processed') {
    if (nextTab === tab) return
    setLoading(true)
    setTab(nextTab)
  }

  async function fetchApprovals(nextTab: 'pending' | 'processed') {
    const response = await fetch(`/api/approvals?status=${nextTab}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(payload?.error ?? 'Failed to load approvals.')
    }

    return Array.isArray(payload) ? payload : []
  }

  useEffect(() => {
    let cancelled = false

      ; (async () => {
        try {
          const data = await fetchApprovals(tab)
          if (!cancelled) {
            setItems(data)
          }
        } catch (error) {
          if (!cancelled) {
            const message = error instanceof Error ? error.message : 'Failed to load approvals.'
            toast.error(message)
            setItems([])
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      })()

    return () => {
      cancelled = true
    }
  }, [tab])

  async function handleAction(id: string, action: 'approve' | 'reject', reason?: string | null) {
    setActingId(id)

    const response = await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejectionReason: reason ?? null }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      toast.error(payload?.error ?? 'Could not update approval request.')
      setActingId(null)
      return
    }

    toast.success(action === 'approve' ? 'Request approved.' : 'Request rejected.')
    setActingId(null)
    setLoading(true)

    try {
      const data = await fetchApprovals(tab)
      setItems(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load approvals.'
      toast.error(message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Approvals</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review role access requests and activate approved users.
        </p>
      </div>

      <Tabs value={tab} onValueChange={value => switchTab(value as 'pending' | 'processed')}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processed">Processed</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="gap-0 py-0 overflow-hidden animate-fade-in shadow-sm hover:shadow-md transition-shadow">
        <div className="border-b bg-muted/30 px-5 py-3.5">
          <h2 className="text-base font-semibold tracking-tight">
            {tab === 'pending' ? 'Pending Requests' : 'Approval History'}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tab === 'pending' ? 'Review requests waiting for your approval.' : 'Past decisions made on access requests.'}
          </p>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No requests found.</div>
          ) : (
            <div className="divide-y">
              {items.map(item => (
                <div key={item.id} className="p-5 transition-colors hover:bg-muted/30">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{item.applicant?.full_name ?? 'Unknown user'}</p>
                        {tab !== 'pending' && (
                          <Badge variant={item.status === 'approved' ? 'success' : 'destructive'} className="uppercase text-[10px] h-5 px-1.5">
                            {item.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{item.applicant?.email ?? '-'}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant="outline" className="uppercase tracking-wide text-[10px] bg-background">
                          {item.requested_role.replace('_', ' ')}
                        </Badge>
                        {item.centre?.centre_name && (
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            • {item.centre.centre_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {tab === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAction(item.id, 'approve')}
                          disabled={actingId === item.id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-destructive/10 hover:text-destructive"
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
                    <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm border">
                      <span className="font-medium text-foreground/80">Note: </span>
                      <span className="text-muted-foreground">{item.applicant_note}</span>
                    </div>
                  )}

                  {item.rejection_reason && (
                    <div className="mt-4 rounded-md bg-rose-500/10 p-3 text-sm border border-rose-500/20 text-rose-600 dark:text-rose-400">
                      <span className="font-medium">Reason: </span>
                      {item.rejection_reason}
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
            <DialogDescription>
              Add an optional reason. This will be visible in approval history.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={rejectionReason}
            onChange={event => setRejectionReason(event.target.value)}
            placeholder="Reason for rejection (optional)"
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
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
