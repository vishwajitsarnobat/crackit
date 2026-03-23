/**
 * Centre Expenses API
 * GET  — Returns centres (no params) or expenses for a centre + month (centre_id + month_year)
 * POST — Upserts expense records by centre/month/category
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { saveExpensesSchema } from '@/lib/validations/data-entry'

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const centreId = searchParams.get('centre_id')
    const monthYear = searchParams.get('month_year')

    if (!centreId) {
        const supabase = await createClient()
        let query = supabase
            .from('centres')
            .select('id, centre_name, centre_code')
            .eq('is_active', true)
            .order('centre_name')

        if (ctx.profile.role !== 'ceo') {
            query = query.in('id', ctx.profile.centreIds)
        }

        const { data, error } = await query
        if (error) return apiError(error.message, 500)
        return apiSuccess({ centres: data ?? [] })
    }

    if (!monthYear) return apiError('month_year is required', 400)

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('centre_expenses')
        .select('*')
        .eq('centre_id', centreId)
        .eq('month_year', monthYear)

    if (error) return apiError(error.message, 500)
    return apiSuccess({ expenses: data ?? [] })
}, ['ceo', 'centre_head', 'accountant'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = saveExpensesSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { centre_id, month_year, expenses } = parsed.data

    const adminClient = createAdminClient()

    const upsertData = expenses
        .filter((e) => e.amount > 0)
        .map((e) => ({
            centre_id,
            month_year,
            category: e.category,
            amount: e.amount,
            description: e.description || null,
            entered_by: ctx.user.id,
        }))

    if (upsertData.length === 0) return apiSuccess({ ok: true, count: 0 })

    const { error } = await adminClient
        .from('centre_expenses')
        .upsert(upsertData, { onConflict: 'centre_id,month_year,category' })

    if (error) return apiError(error.message, 400)
    return apiSuccess({ ok: true, count: upsertData.length })
}, ['ceo', 'centre_head', 'accountant'])
