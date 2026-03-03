import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canReviewRequest, getReviewerContext } from '@/lib/approvals/reviewer'

type Action = 'approve' | 'reject'

type ApprovalRecord = {
  id: string
  user_id: string
  centre_id: string | null
  requested_role: string
  status: 'pending' | 'approved' | 'rejected'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const reviewer = await getReviewerContext()
  if (!reviewer.ok) {
    return NextResponse.json({ error: reviewer.error }, { status: reviewer.status })
  }

  const { approvalId } = await params

  try {
    const body = await request.json().catch(() => null)
    const action = body?.action as Action | undefined

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
    }

    const rejectionReason =
      typeof body?.rejectionReason === 'string' ? body.rejectionReason.trim() : null

    const admin = createAdminClient()

    const { data: approval, error: approvalError } = await admin
      .from('user_approval_requests')
      .select('id, user_id, centre_id, requested_role, status')
      .eq('id', approvalId)
      .single<ApprovalRecord>()

    if (approvalError || !approval) {
      return NextResponse.json({ error: 'Approval request not found.' }, { status: 404 })
    }

    if (approval.status !== 'pending') {
      return NextResponse.json({ error: 'This request is already processed.' }, { status: 409 })
    }

    if (!canReviewRequest(reviewer.data, approval.requested_role, approval.centre_id)) {
      return NextResponse.json(
        { error: 'You are not allowed to review this request.' },
        { status: 403 }
      )
    }

    if (action === 'approve') {
      const { error: processError } = await admin.rpc('process_approval_decision', {
        p_approval_id: approvalId,
        p_action: 'approve',
        p_reviewer_id: reviewer.data.reviewerId,
        p_rejection_reason: null,
      })

      if (processError) {
        return NextResponse.json({ error: processError.message }, { status: 400 })
      }

      return NextResponse.json({ ok: true })
    }

    const { error: rejectError } = await admin.rpc('process_approval_decision', {
      p_approval_id: approvalId,
      p_action: 'reject',
      p_reviewer_id: reviewer.data.reviewerId,
      p_rejection_reason: rejectionReason || null,
    })

    if (rejectError) {
      return NextResponse.json({ error: rejectError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update approval.' },
      { status: 500 }
    )
  }
}
