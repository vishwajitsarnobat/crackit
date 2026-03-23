'use client'

/**
 * Student Profile Report Component
 * UI for searching students by name or code and downloading their complete academic profile.
 * Supports exporting individual student data to PDF or Excel.
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Download, FileText, FileSpreadsheet, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { AppRole } from '@/lib/types/entities'

type StudentResult = {
    id: string
    student_code: string | null
    student_name: string
    class_level: number
    is_active: boolean
}

export function StudentProfileReport({ role }: { role: AppRole }) {
    const [query, setQuery] = useState('')
    const [students, setStudents] = useState<StudentResult[]>([])
    const [loading, setLoading] = useState(false)
    const [downloading, setDownloading] = useState<string | null>(null)

    async function handleSearch() {
        if (query.length < 2) { toast.error('Enter at least 2 characters'); return }
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/student-profile?search=${encodeURIComponent(query)}`)
            const json = await res.json()
            if (res.ok) setStudents(json.students ?? [])
            else toast.error(json.error || 'Search failed')
        } finally {
            setLoading(false)
        }
    }

    function downloadReport(studentId: string, format: 'pdf' | 'excel') {
        setDownloading(`${studentId}-${format}`)
        const url = `/api/reports/student-profile?student_id=${studentId}&format=${format}`
        window.open(url, '_blank')
        setTimeout(() => setDownloading(null), 2000)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Student Profile Report</h1>
                <p className="mt-1 text-sm text-muted-foreground">Search for a student and download their profile as PDF or Excel.</p>
            </div>

            <div className="flex items-end gap-3">
                <div className="space-y-2 flex-1 max-w-md">
                    <Label>Search Student</Label>
                    <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Student name or code…"
                    />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />{loading ? 'Searching…' : 'Search'}
                </Button>
            </div>

            {students.length > 0 && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3.5">
                        <CardTitle className="text-base tracking-tight">Search Results</CardTitle>
                        <CardDescription className="mt-0.5">{students.length} student(s) found</CardDescription>
                    </div>
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Student Name</TableHead>
                                <TableHead className="text-center">Class</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right pr-4">Download</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((s, i) => (
                                <TableRow key={s.id} className="transition-colors hover:bg-muted/30">
                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="font-mono text-xs">{s.student_code || '—'}</TableCell>
                                    <TableCell className="font-medium">{s.student_name}</TableCell>
                                    <TableCell className="text-center">{s.class_level}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={s.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}>
                                            {s.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => downloadReport(s.id, 'pdf')} disabled={downloading === `${s.id}-pdf`}>
                                                <FileText className="h-3.5 w-3.5 mr-1" />PDF
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => downloadReport(s.id, 'excel')} disabled={downloading === `${s.id}-excel`}>
                                                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    )
}
