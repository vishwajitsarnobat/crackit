/**
 * Fee Management API
 * GET   — Returns batches (no params), invoices for a batch (batch_id), or transactions (invoice_id)
 * POST  — Creates an invoice (body has student_id) or records a payment (body has student_invoice_id)
 * PATCH — Updates discount on an invoice
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createInvoiceSchema, recordPaymentSchema, updateDiscountSchema } from '@/lib/validations/data-entry'

export const GET = withAuth(async (request, ctx) => {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    const monthYear = searchParams.get('month_year')
    const status = searchParams.get('status')
    const invoiceId = searchParams.get('invoice_id')

    // Return transactions for a specific invoice
    if (invoiceId) {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('fee_transactions')
            .select('*')
            .eq('student_invoice_id', invoiceId)
            .order('payment_date', { ascending: false })

        if (error) return apiError(error.message, 500)
        return apiSuccess({ transactions: data ?? [] })
    }

    if (!batchId) {
        // Return batches for selection
        const supabase = await createClient()
        let query = supabase
            .from('batches')
            .select('id, batch_name, batch_code, centre_id, centres!inner(centre_name)')
            .eq('is_active', true)
            .order('batch_name')

        if (ctx.profile.role !== 'ceo') {
            query = query.in('centre_id', ctx.profile.centreIds)
        }

        const { data, error } = await query
        if (error) return apiError(error.message, 500)

        const batches = (data ?? []).map((b: any) => ({
            id: b.id,
            batch_name: b.batch_name,
            batch_code: b.batch_code,
            centre_name: b.centres?.centre_name,
        }))
        return apiSuccess({ batches })
    }

    // Return invoices for a batch with optional filters
    const supabase = await createClient()
    let query = supabase
        .from('student_invoices')
        .select('*, students!inner(student_code, users!inner(full_name)), batches!inner(batch_name)')
        .eq('batch_id', batchId)
        .order('month_year', { ascending: false })

    if (monthYear) query = query.eq('month_year', monthYear)
    if (status && status !== 'all') query = query.eq('payment_status', status)

    const { data, error } = await query
    if (error) return apiError(error.message, 500)

    const invoices = (data ?? []).map((inv: any) => ({
        id: inv.id,
        student_id: inv.student_id,
        student_name: inv.students?.users?.full_name ?? 'Unknown',
        student_code: inv.students?.student_code ?? null,
        batch_id: inv.batch_id,
        batch_name: inv.batches?.batch_name ?? '',
        month_year: inv.month_year,
        monthly_fee: inv.monthly_fee,
        amount_due: inv.amount_due,
        amount_paid: inv.amount_paid,
        amount_discount: inv.amount_discount,
        payment_status: inv.payment_status,
    }))

    return apiSuccess({ invoices })
}, ['ceo', 'centre_head', 'accountant'])

export const POST = withAuth(async (request, ctx) => {
    const body = await request.json()

    // Determine if creating an invoice or recording a payment
    if (body.student_invoice_id) {
        const parsed = recordPaymentSchema.safeParse(body)
        if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('fee_transactions')
            .insert({
                student_invoice_id: parsed.data.student_invoice_id,
                amount: parsed.data.amount,
                payment_mode: parsed.data.payment_mode,
                collected_by: ctx.user.id,
            })
            .select()
            .single()

        if (error) return apiError(error.message, 400)
        return apiSuccess({ transaction: data })
    }

    // Create invoice
    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('student_invoices')
        .insert(parsed.data)
        .select()
        .single()

    if (error) return apiError(error.message, 400)
    return apiSuccess({ invoice: data })
}, ['ceo', 'centre_head', 'accountant'])

export const PATCH = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = updateDiscountSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('student_invoices')
        .update({ amount_discount: parsed.data.amount_discount })
        .eq('id', parsed.data.id)
        .select()
        .single()

    if (error) return apiError(error.message, 400)
    return apiSuccess({ invoice: data })
}, ['ceo', 'centre_head', 'accountant'])
