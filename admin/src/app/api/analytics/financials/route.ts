import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AllowedRole = 'ceo' | 'centre_head' | 'accountant'

function isAllowed(role: string | null): role is AllowedRole {
    return role === 'ceo' || role === 'centre_head' || role === 'accountant'
}

/**
 * Build a YYYY-MM-DD string for the 1st of the given month.
 * Avoids Date→toISOString timezone pitfalls.
 */
function monthStart(year: number, month: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role_id, is_active').eq('id', user.id).single()
    if (!profile?.is_active) return NextResponse.json({ error: 'Your account is not active.' }, { status: 403 })

    const { data: roleData } = await supabase.from('roles').select('role_name').eq('id', profile.role_id).single()
    if (!isAllowed(roleData?.role_name ?? null)) {
        return NextResponse.json({ error: 'You are not allowed to view financial analytics.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const centreId = searchParams.get('centreId')
    const monthStr = searchParams.get('month')   // YYYY-MM  (monthly mode)
    const yearStr = searchParams.get('year')      // YYYY     (yearly mode)

    // ── Determine date range ──────────────────────────────────────
    // Yearly mode: Jan–Dec of given year
    // Monthly mode (default): single month
    let rangeStart: string   // inclusive
    let rangeEnd: string     // inclusive
    let viewMode: 'month' | 'year'

    if (yearStr) {
        const y = parseInt(yearStr)
        rangeStart = `${y}-01-01`
        rangeEnd = `${y}-12-01`
        viewMode = 'year'
    } else {
        // Parse month string; default to current month
        const now = new Date()
        let year = now.getFullYear()
        let month = now.getMonth() // 0-indexed
        if (monthStr) {
            const [yy, mm] = monthStr.split('-').map(Number)
            if (yy && mm) { year = yy; month = mm - 1 }
        }
        rangeStart = monthStart(year, month)
        rangeEnd = rangeStart
        viewMode = 'month'
    }

    // 1. Centres
    const { data: centresData, error: cErr } = await supabase
        .from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 })
    const centres = centresData ?? []

    const filterCentreId = centreId && centreId !== 'all' ? centreId : null

    // 2. Expenses
    let expQ = supabase.from('centre_expenses').select('*')
        .gte('month_year', rangeStart).lte('month_year', rangeEnd)
    if (filterCentreId) expQ = expQ.eq('centre_id', filterCentreId)
    const { data: expensesData } = await expQ
    const expenses = expensesData ?? []

    // 3. Salaries
    let salQ = supabase.from('staff_salaries').select('*, users(full_name), centres(centre_name)')
        .gte('month_year', rangeStart).lte('month_year', rangeEnd)
    if (filterCentreId) salQ = salQ.eq('centre_id', filterCentreId)
    const { data: salariesData } = await salQ
    const salaries = salariesData ?? []

    // 4. Invoices
    let invQ = supabase.from('student_invoices').select(`
        id, amount_due, amount_paid, payment_status, month_year,
        students(id, student_code, parent_name, admission_form_data, users(full_name)),
        batches(id, batch_name, centre_id)
    `).gte('month_year', rangeStart).lte('month_year', rangeEnd)

    const { data: invRaw } = await invQ
    const allInvoices = invRaw ?? []

    // Filter invoices by centre (nested via batch)
    const invoices = filterCentreId
        ? allInvoices.filter(i => (i.batches as any)?.centre_id === filterCentreId)
        : allInvoices

    // ── Summary metrics ──────────────────────────────────────────
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const totalSalariesPaid = salaries.reduce((sum, s) => sum + Number(s.amount_paid), 0)
    const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.amount_paid), 0)
    const expectedRevenue = invoices.reduce((sum, i) => sum + Number(i.amount_due), 0)

    const pendingReceivables = invoices
        .filter(i => i.payment_status === 'pending' || i.payment_status === 'partial' || i.payment_status === 'overdue')
        .reduce((sum, i) => sum + (Number(i.amount_due) - Number(i.amount_paid)), 0)

    const netProfit = totalRevenue - (totalExpenses + totalSalariesPaid)

    // ── Monthly trend (for yearly view) ──────────────────────────
    const monthlyTrend: { month: string; revenue: number; expenses: number; salaries: number; profit: number }[] = []
    if (viewMode === 'year') {
        const months = new Set<string>()
        for (const e of expenses) months.add(e.month_year)
        for (const s of salaries) months.add(s.month_year)
        for (const i of invoices) months.add(i.month_year)

        const sorted = [...months].sort()
        for (const m of sorted) {
            const mExp = expenses.filter(e => e.month_year === m).reduce((s, e) => s + Number(e.amount), 0)
            const mSal = salaries.filter(s => s.month_year === m).reduce((s, sal) => s + Number(sal.amount_paid), 0)
            const mRev = invoices.filter(i => i.month_year === m).reduce((s, i) => s + Number(i.amount_paid), 0)
            monthlyTrend.push({ month: m, revenue: mRev, expenses: mExp, salaries: mSal, profit: mRev - (mExp + mSal) })
        }
    }

    // ── Expense breakdown chart ──────────────────────────────────
    const expenseBreakdown = Object.entries(
        expenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount)
            return acc
        }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }))

    // ── Fee collection status chart ──────────────────────────────
    const collectionStatus = invoices.reduce((acc, inv) => {
        acc[inv.payment_status] = (acc[inv.payment_status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
        viewMode,
        filters: { centres },
        summary: {
            totalRevenue,
            totalExpenses,
            totalSalariesPaid,
            netProfit,
            pendingReceivables,
            expectedRevenue
        },
        visualizations: {
            expenseBreakdown,
            collectionStatus
        },
        monthlyTrend,
        tables: {
            expenses,
            salaries: salaries.map(s => ({
                ...s,
                staff_name: (s.users as any)?.full_name ?? 'Unknown',
                centre_name: (s.centres as any)?.centre_name ?? 'Unknown'
            })),
            invoices: invoices.map(i => {
                const stu = i.students as any
                const userInfo = Array.isArray(stu?.users) ? stu.users[0] : stu?.users
                const fullName = userInfo?.full_name ?? null
                const formName = stu?.admission_form_data && typeof stu.admission_form_data === 'object'
                    ? (stu.admission_form_data as Record<string, unknown>).student_name : null
                const studentName = fullName
                    ?? (typeof formName === 'string' ? formName : null)
                    ?? (stu?.parent_name ? `Ward of ${stu.parent_name}` : null)
                    ?? (stu?.student_code ? `Student ${stu.student_code}` : 'Unknown')
                return {
                    ...i,
                    student_name: studentName,
                    student_code: stu?.student_code ?? null,
                    batch_name: (i.batches as any)?.batch_name ?? 'Unknown'
                }
            })
        }
    })
}
