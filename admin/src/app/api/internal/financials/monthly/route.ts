import { apiError, apiSuccess } from '@/lib/api/api-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuthorizedCronRequest } from '@/lib/server/cron-auth'

function normalizeMonthYear(input: string | null) {
  if (!input) {
    return new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10)
  }

  return `${input.slice(0, 7)}-01`
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAuthorizedCronRequest(request)
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  const monthYear = normalizeMonthYear(new URL(request.url).searchParams.get('month_year'))
  const adminClient = createAdminClient()

  const { error: invoiceError } = await adminClient.rpc('generate_student_invoices_for_month', {
    p_month_year: monthYear,
    p_batch_id: null,
  })

  if (invoiceError) {
    return apiError(invoiceError.message, 500)
  }

  const { error: salaryError } = await adminClient.rpc('generate_staff_salaries_for_month', {
    p_month_year: monthYear,
    p_centre_id: null,
  })

  if (salaryError) {
    return apiError(salaryError.message, 500)
  }

  const [invoiceCountResult, salaryCountResult] = await Promise.all([
    adminClient.from('student_invoices').select('id', { count: 'exact', head: true }).eq('month_year', monthYear),
    adminClient.from('staff_salaries').select('id', { count: 'exact', head: true }).eq('month_year', monthYear),
  ])

  if (invoiceCountResult.error) {
    return apiError(invoiceCountResult.error.message, 500)
  }

  if (salaryCountResult.error) {
    return apiError(salaryCountResult.error.message, 500)
  }

  return apiSuccess({
    ok: true,
    month_year: monthYear,
    student_invoice_count: invoiceCountResult.count ?? 0,
    staff_salary_count: salaryCountResult.count ?? 0,
  })
}
