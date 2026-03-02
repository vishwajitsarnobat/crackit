'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

    ;(async () => {
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

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActingId(id)

    const rejectionReason =
      action === 'reject'
        ? window.prompt('Rejection reason (optional):')?.trim() || null
        : null

    const response = await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejectionReason }),
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

      <div className="flex items-center gap-2">
        <Button
          variant={tab === 'pending' ? 'default' : 'outline'}
          onClick={() => switchTab('pending')}
        >
          Pending
        </Button>
        <Button
          variant={tab === 'processed' ? 'default' : 'outline'}
          onClick={() => switchTab('processed')}
        >
          Processed
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">
          {tab === 'pending' ? 'Pending approval requests' : 'Approval history'}
        </h2>
        <Separator className="my-4" />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests found.</p>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{item.applicant?.full_name ?? 'Unknown user'}</p>
                    <p className="text-sm text-muted-foreground">{item.applicant?.email ?? '-'}</p>
                    <p className="text-xs text-muted-foreground">
                      Role: <span className="uppercase">{item.requested_role}</span>
                      {item.centre?.centre_name ? ` • Centre: ${item.centre.centre_name}` : ''}
                    </p>
                  </div>

                  {tab === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(item.id, 'approve')}
                        disabled={actingId === item.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(item.id, 'reject')}
                        disabled={actingId === item.id}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {item.status}
                    </span>
                  )}
                </div>

                {item.applicant_note && (
                  <p className="mt-3 text-sm text-muted-foreground">Note: {item.applicant_note}</p>
                )}

                {item.rejection_reason && (
                  <p className="mt-2 text-sm text-destructive">Reason: {item.rejection_reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
