/**
 * Staff Salaries API
 * GET  — Returns centres (no params) or staff + salary records for a centre/month (centre_id + month_year)
 * POST — Upserts salary records with auto-calculated paid/unpaid/partial status
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { saveSalariesSchema } from '@/lib/validations/data-entry'

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

    // Get staff assigned to this centre
    const supabase = await createClient()
    const { data: assignments, error: assError } = await supabase
        .from('user_centre_assignments')
        .select('user_id, users!inner(full_name, roles!inner(role_name))')
        .eq('centre_id', centreId)
        .eq('is_active', true)

    if (assError) return apiError(assError.message, 500)

    // Filter to only staff roles (teacher, accountant)
    const staff = (assignments ?? [])
        .filter((a: any) => ['teacher', 'accountant'].includes(a.users?.roles?.role_name))
        .map((a: any) => ({
            user_id: a.user_id,
            staff_name: a.users?.full_name ?? 'Unknown',
            role: a.users?.roles?.role_name,
        }))

    if (!monthYear) return apiSuccess({ staff, salaries: [] })

    const { data: salaries, error: salError } = await supabase
        .from('staff_salaries')
        .select('*')
        .eq('centre_id', centreId)
        .eq('month_year', monthYear)

    if (salError) return apiError(salError.message, 500)

    const salaryMap = new Map((salaries ?? []).map((s: any) => [s.user_id, s]))

    const enriched = staff.map((s: any) => {
        const existing = salaryMap.get(s.user_id)
        return {
            ...s,
            id: existing?.id ?? null,
            amount_due: existing?.amount_due ?? 0,
            amount_paid: existing?.amount_paid ?? 0,
            status: existing?.status ?? 'unpaid',
            payment_date: existing?.payment_date ?? null,
        }
    })

    return apiSuccess({ staff: enriched, salaries: salaries ?? [] })
}, ['ceo', 'centre_head', 'accountant'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = saveSalariesSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { centre_id, month_year, salaries } = parsed.data

    const adminClient = createAdminClient()

    const upsertData = salaries.map((s) => {
        const status = s.amount_paid >= s.amount_due ? 'paid'
            : s.amount_paid > 0 ? 'partial'
            : 'unpaid'

        return {
            user_id: s.user_id,
            centre_id,
            month_year,
            amount_due: s.amount_due,
            amount_paid: s.amount_paid,
            status,
            payment_date: s.payment_date || null,
            entered_by: ctx.user.id,
        }
    })

    const { error } = await adminClient
        .from('staff_salaries')
        .upsert(upsertData, { onConflict: 'user_id,centre_id,month_year' })

    if (error) return apiError(error.message, 400)
    return apiSuccess({ ok: true, count: salaries.length })
}, ['ceo', 'centre_head', 'accountant'])
