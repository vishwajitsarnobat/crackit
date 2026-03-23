'use client'

/**
 * Attendance Page Component
 * Allows teachers and admins to view and log daily student attendance for a specific batch.
 * Features: Batch and date selection, marking present/absent, and saving records to the database.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { CalendarCheck, Save, Users } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppRole } from '@/lib/types/entities'

type BatchOption = { id: string; batch_name: string; batch_code: string; centre_name: string }
type StudentRow = { student_id: string; student_name: string; student_code: string | null; status: 'present' | 'absent' | null }

export function AttendancePage({ role }: { role: AppRole }) {
    const [batches, setBatches] = useState<BatchOption[]>([])
    const [selectedBatch, setSelectedBatch] = useState('')
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [students, setStudents] = useState<StudentRow[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/data-entry/attendance')
            const json = await res.json()
            if (res.ok) setBatches(json.batches ?? [])
            setLoading(false)
        }
        load()
    }, [])

    const loadStudents = useCallback(async (batchId: string, date: string) => {
        if (!batchId || !date) return
        setLoading(true)
        try {
            const res = await fetch(`/api/data-entry/attendance?batch_id=${batchId}&date=${date}`)
            const json = await res.json()
            if (res.ok) setStudents(json.students ?? [])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedBatch && selectedDate) loadStudents(selectedBatch, selectedDate)
    }, [selectedBatch, selectedDate, loadStudents])

    function toggleStatus(studentId: string) {
        setStudents(prev => prev.map(s =>
            s.student_id === studentId
                ? { ...s, status: s.status === 'present' ? 'absent' : 'present' }
                : s
        ))
    }

    function markAll(status: 'present' | 'absent') {
        setStudents(prev => prev.map(s => ({ ...s, status })))
    }

    async function handleSave() {
        const unmarked = students.filter(s => !s.status)
        if (unmarked.length > 0) {
            toast.error(`${unmarked.length} student(s) not marked yet.`)
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/data-entry/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batch_id: selectedBatch,
                    attendance_date: selectedDate,
                    records: students.map(s => ({ student_id: s.student_id, status: s.status })),
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            toast.success(`Attendance saved for ${json.count} students`)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Student Attendance</h1>
                <p className="mt-1 text-sm text-muted-foreground">Mark daily attendance for students in a batch.</p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2 min-w-[220px]">
                    <Label>Batch</Label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                        <SelectTrigger><SelectValue placeholder="Select batch…" /></SelectTrigger>
                        <SelectContent>
                            {batches.map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.batch_name} — {b.centre_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} className="w-[180px]" />
                </div>
            </div>

            {selectedBatch && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3.5 flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base tracking-tight flex items-center gap-2"><Users className="h-4 w-4" />Student Roster</CardTitle>
                            <CardDescription className="mt-0.5">{students.length} student(s) enrolled</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => markAll('present')}>All Present</Button>
                            <Button variant="outline" size="sm" onClick={() => markAll('absent')}>All Absent</Button>
                            <Button size="sm" onClick={handleSave} disabled={saving || students.length === 0}>
                                <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save'}
                            </Button>
                        </div>
                    </div>
                    {loading ? (
                        <div className="animate-pulse h-40 bg-muted/20" />
                    ) : students.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No students enrolled in this batch.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((s, i) => (
                                    <TableRow key={s.student_id} className="transition-colors hover:bg-muted/30 cursor-pointer" onClick={() => toggleStatus(s.student_id)}>
                                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                        <TableCell className="font-mono text-xs">{s.student_code || '—'}</TableCell>
                                        <TableCell className="font-medium">{s.student_name}</TableCell>
                                        <TableCell className="text-center">
                                            {s.status === 'present' ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200" variant="outline">Present</Badge>
                                            ) : s.status === 'absent' ? (
                                                <Badge className="bg-red-500/10 text-red-600 border-red-200" variant="outline">Absent</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">Not Marked</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}
        </div>
    )
}
