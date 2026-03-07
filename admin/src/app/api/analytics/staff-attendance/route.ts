import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserContext } from '@/lib/auth/current-user'
import { format, eachDayOfInterval } from 'date-fns'

export async function GET(request: NextRequest) {
    try {
        const context = await getCurrentUserContext()

        if (!context || !context.isActive) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        const allowedRoles = ['ceo', 'centre_head', 'teacher']
        if (!context.role || !allowedRoles.includes(context.role)) {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const filterCentreId = searchParams.get('centreId') || null
        const filterTeacherId = searchParams.get('teacherId') || null
        const fromDate = searchParams.get('from') || null
        const toDate = searchParams.get('to') || null

        const supabase = await createClient()

        // 1. Determine which centres this user can view
        let accessibleCentreIds: string[] = []
        if (context.role === 'ceo') {
            const { data } = await supabase.from('centres').select('id, centre_name').eq('is_active', true).order('centre_name')
            accessibleCentreIds = (data ?? []).map(c => c.id)
        } else {
            const { data } = await supabase.from('user_centre_assignments').select('centre_id').eq('user_id', context.userId).eq('is_active', true)
            accessibleCentreIds = (data ?? []).map(c => c.centre_id)
        }

        // Apply centre filter
        let centresToQuery = accessibleCentreIds
        if (filterCentreId && accessibleCentreIds.includes(filterCentreId)) {
            centresToQuery = [filterCentreId]
        }

        // Fetch centres for dropdown
        const { data: centresData } = await supabase
            .from('centres')
            .select('id, centre_name')
            .in('id', accessibleCentreIds)
            .order('centre_name')

        const centres = centresData ?? []

        const emptyRes = () => ({
            filters: { centres, teachers: [], selectedTeacherId: filterTeacherId },
            summary: { totalDays: 0, presentCount: 0, absentCount: 0, partialCount: 0, attendancePercent: null as number | null },
            dailyTrend: [] as { date: string; present: number; absent: number; partial: number }[],
            teacherBreakdown: [] as { user_id: string; teacher_name: string; present: number; absent: number; partial: number; total: number; percent: number | null }[],
        })

        if (centresToQuery.length === 0) {
            return NextResponse.json(emptyRes())
        }

        // 2. Fetch teachers assigned to these centres
        const { data: teacherAssignments } = await supabase
            .from('user_centre_assignments')
            .select('user_id')
            .in('centre_id', centresToQuery)
            .eq('is_active', true)

        const allTeacherIds = [...new Set((teacherAssignments ?? []).map(a => a.user_id))]

        // Filter to only users with teacher role
        let teacherQuery = supabase
            .from('users')
            .select('id, full_name, role_id, roles!inner(role_name)')
            .in('id', allTeacherIds)
            .eq('is_active', true)

        const { data: teacherUsers } = await teacherQuery
        const teachers = (teacherUsers ?? [])
            .filter(u => (u.roles as any)?.role_name === 'teacher')
            .map(u => ({ id: u.id, full_name: u.full_name }))
            .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))

        const teacherIds = teachers.map(t => t.id)

        // If user is a teacher, restrict to their own data
        const queryTeacherIds = context.role === 'teacher' ? [context.userId] : (filterTeacherId && teacherIds.includes(filterTeacherId) ? [filterTeacherId] : teacherIds)

        if (queryTeacherIds.length === 0) {
            return NextResponse.json(emptyRes())
        }

        // 3. Query staff attendance records
        let query = supabase
            .from('staff_attendance')
            .select(`
                id, attendance_date, status, in_time, out_time, user_id, centre_id,
                users!user_id ( full_name ),
                centres!centre_id ( centre_name )
            `)
            .in('centre_id', centresToQuery)
            .in('user_id', queryTeacherIds)
            .order('attendance_date', { ascending: false })

        if (fromDate) query = query.gte('attendance_date', fromDate)
        if (toDate) query = query.lte('attendance_date', toDate)

        const { data: attendanceData, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const records = attendanceData ?? []

        // 4. Summary
        let presentCount = 0
        let absentCount = 0
        let partialCount = 0

        records.forEach(r => {
            if (r.status === 'present') presentCount++
            else if (r.status === 'absent') absentCount++
            else if (r.status === 'partial') partialCount++
        })

        const totalDays = presentCount + absentCount + partialCount
        const attendancePercent = totalDays > 0 ? Math.round((presentCount / totalDays) * 1000) / 10 : null

        // 5. Daily trend
        if (records.length > 0) {
            const dates = records.map(r => r.attendance_date).sort()
            const startStr = fromDate || dates[dates.length - 1] // Oldest record
            const endStr = toDate || dates[0] // Newest record

            const startObj = new Date(startStr + 'T00:00:00')
            const endObj = new Date(endStr + 'T00:00:00')

            const days = startObj <= endObj ? eachDayOfInterval({ start: startObj, end: endObj }) : []

            var dailyTrend = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayRecords = records.filter(r => r.attendance_date === dateStr)
                return {
                    date: dateStr,
                    present: dayRecords.filter(r => r.status === 'present').length,
                    absent: dayRecords.filter(r => r.status === 'absent').length,
                    partial: dayRecords.filter(r => r.status === 'partial').length,
                }
            })
        } else {
            var dailyTrend: { date: string; present: number; absent: number; partial: number }[] = []
        }

        // 6. Teacher breakdown
        const teacherMap = new Map<string, { present: number; absent: number; partial: number; name: string }>()
        for (const t of teachers) {
            teacherMap.set(t.id, { present: 0, absent: 0, partial: 0, name: t.full_name ?? 'Unknown' })
        }
        // For teacher role, populate their own name
        if (context.role === 'teacher' && !teacherMap.has(context.userId)) {
            const { data: self } = await supabase.from('users').select('full_name').eq('id', context.userId).single()
            teacherMap.set(context.userId, { present: 0, absent: 0, partial: 0, name: self?.full_name ?? 'Unknown' })
        }

        records.forEach(r => {
            const t = teacherMap.get(r.user_id)
            if (!t) return
            if (r.status === 'present') t.present++
            else if (r.status === 'absent') t.absent++
            else if (r.status === 'partial') t.partial++
        })

        const teacherBreakdown = Array.from(teacherMap.entries()).map(([uid, stats]) => {
            const total = stats.present + stats.absent + stats.partial
            return {
                user_id: uid,
                teacher_name: stats.name,
                present: stats.present,
                absent: stats.absent,
                partial: stats.partial,
                total,
                percent: total > 0 ? Math.round((stats.present / total) * 1000) / 10 : null
            }
        }).sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))

        return NextResponse.json({
            filters: { centres, teachers, selectedTeacherId: filterTeacherId },
            summary: { totalDays, presentCount, absentCount, partialCount, attendancePercent },
            dailyTrend,
            teacherBreakdown,
        })

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unexpected error' },
            { status: 500 }
        )
    }
}
