/**
 * Excel Report Generators (server-side, uses ExcelJS)
 * - addSheetHeader / styleHeaderRow / autoWidth — shared formatting helpers
 * - generateStudentProfileExcel      — student info + enrollments on separate sheets
 * - generateAttendanceReportExcel    — batch attendance with conditional red for <75%
 * - generatePerformanceReportExcel   — exam marks with pass/fail colored rows
 * All return Buffer for streaming via NextResponse.
 */
import ExcelJS from 'exceljs'

function addSheetHeader(sheet: ExcelJS.Worksheet, title: string, subtitle?: string) {
    const titleRow = sheet.addRow([title])
    titleRow.font = { name: 'Calibri', size: 16, bold: true }
    titleRow.height = 28

    if (subtitle) {
        const subRow = sheet.addRow([subtitle])
        subRow.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '666666' } }
    }

    const dateRow = sheet.addRow([`Generated: ${new Date().toLocaleDateString('en-IN')}`])
    dateRow.font = { name: 'Calibri', size: 9, color: { argb: '999999' } }

    sheet.addRow([]) // empty spacer
}

function styleHeaderRow(row: ExcelJS.Row, fillColor: string) {
    row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
            bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
        }
    })
    row.height = 24
}

function autoWidth(sheet: ExcelJS.Worksheet) {
    sheet.columns.forEach(col => {
        let maxLen = 10
        col.eachCell?.({ includeEmpty: false }, cell => {
            const len = String(cell.value ?? '').length
            if (len > maxLen) maxLen = len
        })
        col.width = Math.min(maxLen + 4, 40)
    })
}

// ── Student Profile ──

export async function generateStudentProfileExcel(data: {
    student_name: string
    student_code: string
    email: string | null
    phone: string | null
    date_of_birth: string | null
    class_level: number
    parent_name: string | null
    parent_phone: string | null
    current_points: number
    enrollments: Array<{
        batch_name: string
        centre_name: string
        course_name: string
        enrollment_date: string
        status: string
    }>
}): Promise<Buffer> {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'CrackIt'

    const ws = wb.addWorksheet('Student Profile')
    addSheetHeader(ws, 'Student Profile', data.student_name)

    const fields = [
        ['Field', 'Value'],
        ['Name', data.student_name],
        ['Code', data.student_code || '—'],
        ['Email', data.email || '—'],
        ['Phone', data.phone || '—'],
        ['Date of Birth', data.date_of_birth || '—'],
        ['Class Level', String(data.class_level)],
        ['Parent Name', data.parent_name || '—'],
        ['Parent Phone', data.parent_phone || '—'],
        ['Current Points', String(data.current_points)],
    ]

    const headerRow = ws.addRow(fields[0])
    styleHeaderRow(headerRow, '3B82F6')
    fields.slice(1).forEach(f => ws.addRow(f))

    if (data.enrollments.length > 0) {
        ws.addRow([])
        ws.addRow([])
        const enrWs = wb.addWorksheet('Enrollments')
        addSheetHeader(enrWs, 'Enrollments', data.student_name)

        const enrHeader = enrWs.addRow(['Batch', 'Centre', 'Course', 'Enrolled', 'Status'])
        styleHeaderRow(enrHeader, '3B82F6')

        data.enrollments.forEach(e => {
            enrWs.addRow([e.batch_name, e.centre_name, e.course_name, e.enrollment_date, e.status])
        })

        autoWidth(enrWs)
    }

    autoWidth(ws)
    return Buffer.from(await wb.xlsx.writeBuffer())
}

// ── Attendance Report ──

export async function generateAttendanceReportExcel(data: {
    batch_name: string
    date_range: string
    students: Array<{
        student_name: string
        student_code: string
        total_days: number
        present: number
        absent: number
        percentage: number
    }>
}): Promise<Buffer> {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'CrackIt'

    const ws = wb.addWorksheet('Attendance')
    addSheetHeader(ws, 'Attendance Report', `${data.batch_name} — ${data.date_range}`)

    const headerRow = ws.addRow(['#', 'Code', 'Student Name', 'Total Days', 'Present', 'Absent', 'Attendance %'])
    styleHeaderRow(headerRow, '10B981')

    data.students.forEach((s, i) => {
        const row = ws.addRow([i + 1, s.student_code || '—', s.student_name, s.total_days, s.present, s.absent, s.percentage / 100])
        // Percentage format
        row.getCell(7).numFmt = '0.0%'

        // Conditional coloring for low attendance
        if (s.percentage < 75) {
            row.getCell(7).font = { color: { argb: 'DC2626' }, bold: true }
        }
    })

    autoWidth(ws)
    return Buffer.from(await wb.xlsx.writeBuffer())
}

// ── Performance Report ──

export async function generatePerformanceReportExcel(data: {
    batch_name: string
    exam_name: string
    total_marks: number
    students: Array<{
        student_name: string
        student_code: string
        marks_obtained: number
        is_absent: boolean
        percentage: number
        status: string
    }>
}): Promise<Buffer> {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'CrackIt'

    const ws = wb.addWorksheet('Performance')
    addSheetHeader(ws, 'Performance Report', `${data.batch_name} — ${data.exam_name} (Total: ${data.total_marks})`)

    const headerRow = ws.addRow(['#', 'Code', 'Student Name', 'Marks', 'Percentage', 'Status'])
    styleHeaderRow(headerRow, '8B5CF6')

    data.students.forEach((s, i) => {
        const row = ws.addRow([
            i + 1,
            s.student_code || '—',
            s.student_name,
            s.is_absent ? 'Absent' : `${s.marks_obtained} / ${data.total_marks}`,
            s.is_absent ? '—' : s.percentage / 100,
            s.status,
        ])

        if (!s.is_absent) {
            row.getCell(5).numFmt = '0.0%'
        }

        // Red for fail
        if (s.status === 'Fail') {
            row.getCell(6).font = { color: { argb: 'DC2626' }, bold: true }
        } else if (s.status === 'Pass') {
            row.getCell(6).font = { color: { argb: '16A34A' }, bold: true }
        }
    })

    autoWidth(ws)
    return Buffer.from(await wb.xlsx.writeBuffer())
}
