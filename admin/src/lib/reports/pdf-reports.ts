/**
 * PDF Report Generators (server-side, uses jsPDF + jspdf-autotable)
 * - addHeader / addFooter            — shared branding & pagination helpers
 * - generateStudentProfilePDF        — student info + enrollments table
 * - generateAttendanceReportPDF      — batch attendance summary with %
 * - generatePerformanceReportPDF     — exam marks with pass/fail status
 * All return ArrayBuffer for streaming via NextResponse.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('CrackIt', 14, 18)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, doc.internal.pageSize.width - 14, 18, { align: 'right' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text(title, 14, 30)

    if (subtitle) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80)
        doc.text(subtitle, 14, 37)
    }
}

function addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' })
    }
}

// ── Student Profile ──

export function generateStudentProfilePDF(data: {
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
}): ArrayBuffer {
    const doc = new jsPDF()
    addHeader(doc, 'Student Profile', data.student_name)

    // Info table
    autoTable(doc, {
        startY: 42,
        theme: 'grid',
        head: [['Field', 'Value']],
        body: [
            ['Name', data.student_name],
            ['Code', data.student_code || '—'],
            ['Email', data.email || '—'],
            ['Phone', data.phone || '—'],
            ['Date of Birth', data.date_of_birth || '—'],
            ['Class Level', String(data.class_level)],
            ['Parent Name', data.parent_name || '—'],
            ['Parent Phone', data.parent_phone || '—'],
            ['Current Points', String(data.current_points)],
        ],
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 },
    })

    // Enrollments
    if (data.enrollments.length > 0) {
        const finalY = (doc as any).lastAutoTable?.finalY ?? 100

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Enrollments', 14, finalY + 12)

        autoTable(doc, {
            startY: finalY + 16,
            theme: 'striped',
            head: [['Batch', 'Centre', 'Course', 'Enrolled', 'Status']],
            body: data.enrollments.map(e => [
                e.batch_name, e.centre_name, e.course_name, e.enrollment_date, e.status,
            ]),
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 9 },
        })
    }

    addFooter(doc)
    return doc.output('arraybuffer')
}

// ── Attendance Report ──

export function generateAttendanceReportPDF(data: {
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
}): ArrayBuffer {
    const doc = new jsPDF()
    addHeader(doc, 'Attendance Report', `${data.batch_name} — ${data.date_range}`)

    autoTable(doc, {
        startY: 42,
        theme: 'striped',
        head: [['#', 'Code', 'Student Name', 'Total Days', 'Present', 'Absent', 'Attendance %']],
        body: data.students.map((s, i) => [
            i + 1,
            s.student_code || '—',
            s.student_name,
            s.total_days,
            s.present,
            s.absent,
            `${s.percentage.toFixed(1)}%`,
        ]),
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
        columnStyles: { 6: { halign: 'right' } },
    })

    addFooter(doc)
    return doc.output('arraybuffer')
}

// ── Performance Report ──

export function generatePerformanceReportPDF(data: {
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
}): ArrayBuffer {
    const doc = new jsPDF()
    addHeader(doc, 'Performance Report', `${data.batch_name} — ${data.exam_name} (Total: ${data.total_marks})`)

    autoTable(doc, {
        startY: 42,
        theme: 'striped',
        head: [['#', 'Code', 'Student Name', 'Marks', 'Percentage', 'Status']],
        body: data.students.map((s, i) => [
            i + 1,
            s.student_code || '—',
            s.student_name,
            s.is_absent ? 'Absent' : `${s.marks_obtained} / ${data.total_marks}`,
            s.is_absent ? '—' : `${s.percentage.toFixed(1)}%`,
            s.status,
        ]),
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 9 },
    })

    addFooter(doc)
    return doc.output('arraybuffer')
}
