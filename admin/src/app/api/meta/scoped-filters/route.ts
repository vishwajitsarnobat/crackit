import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, withAuth } from '@/lib/api/api-helpers'

type CentreRow = {
  id: string
  centre_name: string
  centre_code: string
}

type BatchRow = {
  id: string
  centre_id: string
  batch_code: string
  batch_name: string
  academic_year: string
  is_active: boolean
  centres: { centre_name: string | null } | null
}

export const GET = withAuth(async (_request, ctx) => {
  const supabase = await createClient()

  let centresQuery = supabase
    .from('centres')
    .select('id, centre_name, centre_code')
    .eq('is_active', true)
    .order('centre_name')

  if (ctx.profile.role !== 'ceo') {
    centresQuery = centresQuery.in('id', ctx.profile.centreIds)
  }

  const { data: centres, error: centresError } = await centresQuery
  if (centresError) return apiError(centresError.message, 500)

  let batchesQuery = supabase
    .from('batches')
    .select('id, centre_id, batch_code, batch_name, academic_year, is_active, centres(centre_name)')
    .eq('is_active', true)
    .order('batch_name')

  if (ctx.profile.role === 'teacher') {
    const { data: assignments, error: assignmentsError } = await supabase
      .from('teacher_batch_assignments')
      .select('batch_id')
      .eq('user_id', ctx.user.id)
      .eq('is_active', true)

    if (assignmentsError) return apiError(assignmentsError.message, 500)

    const batchIds = [...new Set((assignments ?? []).map((assignment) => assignment.batch_id))]
    if (batchIds.length === 0) {
      return apiSuccess({ centres: (centres ?? []) as CentreRow[], batches: [] })
    }

    batchesQuery = batchesQuery.in('id', batchIds)
  } else if (ctx.profile.role !== 'ceo') {
    if (ctx.profile.centreIds.length === 0) {
      return apiSuccess({ centres: (centres ?? []) as CentreRow[], batches: [] })
    }

    batchesQuery = batchesQuery.in('centre_id', ctx.profile.centreIds)
  }

  const { data: batches, error: batchesError } = await batchesQuery
  if (batchesError) return apiError(batchesError.message, 500)

  return apiSuccess({
    centres: (centres ?? []) as CentreRow[],
    batches: ((batches ?? []) as unknown as BatchRow[]).map((batch) => ({
      id: batch.id,
      centre_id: batch.centre_id,
      batch_code: batch.batch_code,
      batch_name: batch.batch_name,
      academic_year: batch.academic_year,
      is_active: batch.is_active,
      centre_name: batch.centres?.centre_name ?? '-',
    })),
  })
}, ['ceo', 'centre_head', 'accountant', 'teacher'])
