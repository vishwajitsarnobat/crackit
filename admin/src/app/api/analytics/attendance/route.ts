import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AllowedRole = 'ceo' | 'centre_head' | 'teacher'

function isAllowed(role: string | null): role is AllowedRole {
    return role === 'ceo' || role === 'centre_head' || role === 'teacher'
}

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role_id, is_active').eq('id', user.id).single()
    if (!profile?.is_active) return NextResponse.json({ error: 'Your account is not active.' }, { status: 403 })

    const { data: roleData } = await supabase.from('roles').select('role_name').eq('id', profile.role_id).single()
    if (!isAllowed(roleData?.role_name ?? null)) {
        return NextResponse.json({ error: 'You are not allowed to view attendance analytics.' }, { status: 403 })
    }

    const role = roleData!.role_name as AllowedRole

    const { searchParams } = new URL(request.url)
    const centreId = searchParams.get('centreId')
    const batchId = searchParams.get('batchId')
    const studentId = searchParams.get('studentId')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    // ── Centres & Batches (scoped by role) ──
    let accessibleCentreIds: string[] = []
    if (role === 'ceo') {
        const { data } = await supabase.from('centres').select('id').eq('is_active', true)
        accessibleCentreIds = (data ?? []).map(c => c.id)
    } else {
        const { data } = await supabase.from('user_centre_assignments').select('centre_id').eq('user_id', user.id).eq('is_active', true)
        accessibleCentreIds = (data ?? []).map(a => a.centre_id)
    }

    const { data: centresData, error: cErr } = await supabase.from('centres').select('id, centre_name').in('id', accessibleCentreIds).eq('is_active', true).order('centre_name')
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 })

    const centresToQuery = centreId && accessibleCentreIds.includes(centreId) ? [centreId] : accessibleCentreIds

    let batchQ = supabase.from('batches').select('id, batch_name, centre_id').in('centre_id', centresToQuery).eq('is_active', true).order('batch_name')
    const { data: batchesData, error: bErr } = await batchQ
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 })

    const centres = centresData ?? []
    const batches = batchesData ?? []
    const selectedBatchId = batchId && batches.some(b => b.id === batchId) ? batchId : batches[0]?.id ?? null

    const emptyRes = (extras?: Record<string, unknown>) => ({
        filters: { centres, batches, students: [], selectedStudentId: null },
        summary: { totalDays: 0, presentCount: 0, absentCount: 0, attendancePercent: null },
        dailyTrend: [],
        studentBreakdown: [],
        ...extras,
    })

    if (!selectedBatchId) return NextResponse.json(emptyRes())

    // ── Students in batch ──
    const { data: enrollRows, error: eErr } = await supabase
        .from('student_batch_enrollments').select('student_id').eq('batch_id', selectedBatchId).eq('is_active', true)
    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 400 })

    const studentIds = [...new Set((enrollRows ?? []).map(r => r.student_id))]
    const studentMap = new Map<string, { id: string; display_name: string; student_code: string | null }>()

    if (studentIds.length > 0) {
        const { data: sRows, error: sErr } = await supabase
            .from('students').select('id, student_code, parent_name, admission_form_data, users(full_name)').in('id', studentIds)
        if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 })

        for (const r of sRows ?? []) {
            const userInfo = Array.isArray(r.users) ? r.users[0] : r.users
            const fullName = userInfo?.full_name ?? null
            const formName = r.admission_form_data && typeof r.admission_form_data === 'object'
                ? (r.admission_form_data as Record<string, unknown>).student_name : null
            const display = fullName
                ?? (typeof formName === 'string' ? formName : null)
                ?? (r.parent_name ? `Ward of ${r.parent_name}` : null)
                ?? (r.student_code ? `Student ${r.student_code}` : `Student ${r.id.slice(0, 8)}`)
            studentMap.set(r.id, { id: r.id, display_name: display, student_code: r.student_code })
        }
    }

    const students = Array.from(studentMap.values()).sort((a, b) => a.display_name.localeCompare(b.display_name))

    if (studentId && !studentMap.has(studentId)) {
        return NextResponse.json({ error: 'Selected student is not accessible.' }, { status: 403 })
    }

    // ── Attendance records ──
    let attQ = supabase.from('attendance').select('student_id, attendance_date, status').eq('batch_id', selectedBatchId)
    if (fromDate) attQ = attQ.gte('attendance_date', fromDate)
    if (toDate) attQ = attQ.lte('attendance_date', toDate)

    const { data: attData, error: attErr } = await attQ
    if (attErr) return NextResponse.json({ error: attErr.message }, { status: 400 })

    const rows = attData ?? []
    const scopedRows = studentId ? rows.filter(r => r.student_id === studentId) : rows

    // ── Summary ──
    const dateSet = new Set(scopedRows.map(r => r.attendance_date))
    const presentCount = scopedRows.filter(r => r.status === 'present').length
    const absentCount = scopedRows.filter(r => r.status === 'absent').length
    const total = presentCount + absentCount
    const attendancePercent = total > 0 ? Number(((presentCount / total) * 100).toFixed(1)) : null

    // ── Daily trend ──
    const dayMap = new Map<string, { date: string; present: number; absent: number }>()
    for (const r of scopedRows) {
        const d = dayMap.get(r.attendance_date) ?? { date: r.attendance_date, present: 0, absent: 0 }
        if (r.status === 'present') d.present++; else d.absent++
        dayMap.set(r.attendance_date, d)
    }
    const dailyTrend = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // ── Per-student breakdown ──
    const sMap = new Map<string, { present: number; absent: number }>()
    for (const r of scopedRows) {
        const s = sMap.get(r.student_id) ?? { present: 0, absent: 0 }
        if (r.status === 'present') s.present++; else s.absent++
        sMap.set(r.student_id, s)
    }
    const studentBreakdown = Array.from(sMap.entries())
        .map(([sid, s]) => {
            const stud = studentMap.get(sid)
            const t = s.present + s.absent
            return {
                student_id: sid,
                student_name: stud?.display_name ?? 'Unknown',
                student_code: stud?.student_code ?? null,
                present: s.present, absent: s.absent, total: t,
                percent: t > 0 ? Number(((s.present / t) * 100).toFixed(1)) : null,
            }
        })
        .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))

    return NextResponse.json({
        filters: { centres, batches, students, selectedStudentId: studentId || null },
        summary: { totalDays: dateSet.size, presentCount, absentCount, attendancePercent },
        dailyTrend,
        studentBreakdown,
    })
}
