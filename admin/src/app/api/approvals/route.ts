/**
 * Approvals List API
 * GET — Returns pending or processed approval requests with applicant/centre info.
 *       CEO reviews centre_head/accountant requests; centre_head reviews teacher/student.
 *       Supports ?status=pending|processed filter.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getReviewerContext } from '@/lib/approvals/reviewer'

type ApprovalStatus = 'pending' | 'approved' | 'rejected'

type ApprovalRow = {
  id: string
  user_id: string
  centre_id: string | null
  requested_role: string
  status: ApprovalStatus
  applicant_note: string | null
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
}

export async function GET(request: NextRequest) {
  const reviewer = await getReviewerContext()
  if (!reviewer.ok) {
    return NextResponse.json({ error: reviewer.error }, { status: reviewer.status })
  }

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')
  const status: 'pending' | 'processed' = statusFilter === 'processed' ? 'processed' : 'pending'

  try {
    const admin = createAdminClient()

    let query = admin
      .from('user_approval_requests')
      .select(
        'id, user_id, centre_id, requested_role, status, applicant_note, rejection_reason, created_at, reviewed_at'
      )
      .order(status === 'pending' ? 'created_at' : 'reviewed_at', { ascending: false })
      .limit(100)

    if (status === 'pending') {
      query = query.eq('status', 'pending')
    } else {
      query = query.in('status', ['approved', 'rejected'])
    }

    if (reviewer.data.role === 'ceo') {
      query = query.in('requested_role', ['centre_head', 'accountant'])
    } else {
      query = query
        .in('requested_role', ['teacher', 'student'])
        .in('centre_id', reviewer.data.centreIds)
    }

    const { data: approvals, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (approvals ?? []) as ApprovalRow[]

    const userIds = [...new Set(rows.map(row => row.user_id))]
    const centreIds = [...new Set(rows.map(row => row.centre_id).filter(Boolean))] as string[]

    const [{ data: users }, { data: centres }] = await Promise.all([
      userIds.length === 0
        ? Promise.resolve({ data: [] as Array<{ id: string; full_name: string; email: string | null }> })
        : admin.from('users').select('id, full_name, email').in('id', userIds),
      centreIds.length === 0
        ? Promise.resolve({ data: [] as Array<{ id: string; centre_name: string }> })
        : admin.from('centres').select('id, centre_name').in('id', centreIds),
    ])

    const userMap = new Map((users ?? []).map(item => [item.id, item]))
    const centreMap = new Map((centres ?? []).map(item => [item.id, item]))

    const payload = rows.map(row => ({
      id: row.id,
      requested_role: row.requested_role,
      status: row.status,
      applicant_note: row.applicant_note,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      applicant: userMap.get(row.user_id) ?? null,
      centre: row.centre_id ? (centreMap.get(row.centre_id) ?? null) : null,
    }))

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch approvals.' },
      { status: 500 }
    )
  }
}
