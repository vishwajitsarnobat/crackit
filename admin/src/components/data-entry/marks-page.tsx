'use client'

/**
 * Marks Entry Page Component
 * Allows teachers and admins to create exams and enter student marks for a specific batch.
 * Features: Exam creation, marks recording, and publish toggling for student visibility.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Eye, EyeOff, FileCheck } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ManageDialog } from '@/components/manage/manage-dialog'
import type { AppRole, Exam } from '@/lib/types/entities'

type BatchOption = { id: string; batch_name: string; batch_code: string; centre_name: string }
type MarkRow = { student_id: string; student_name: string; student_code: string | null; marks_obtained: number; is_absent: boolean }

export function MarksPage({ role }: { role: AppRole }) {
    const [batches, setBatches] = useState<BatchOption[]>([])
    const [selectedBatch, setSelectedBatch] = useState('')
    const [exams, setExams] = useState<Exam[]>([])
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
    const [marks, setMarks] = useState<MarkRow[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Create exam dialog
    const [examDialogOpen, setExamDialogOpen] = useState(false)
    const [examName, setExamName] = useState('')
    const [examSubject, setExamSubject] = useState('')
    const [examDate, setExamDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [totalMarks, setTotalMarks] = useState('')
    const [passingMarks, setPassingMarks] = useState('')

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/data-entry/marks')
            const json = await res.json()
            if (res.ok) setBatches(json.batches ?? [])
            setLoading(false)
        }
        load()
    }, [])

    const loadExams = useCallback(async (batchId: string) => {
        setLoading(true)
        setSelectedExam(null)
        setMarks([])
        try {
            const res = await fetch(`/api/data-entry/marks?batch_id=${batchId}`)
            const json = await res.json()
            if (res.ok) setExams(json.exams ?? [])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedBatch) loadExams(selectedBatch)
    }, [selectedBatch, loadExams])

    async function loadMarks(exam: Exam) {
        setSelectedExam(exam)
        setLoading(true)
        try {
            const res = await fetch(`/api/data-entry/marks?batch_id=${exam.batch_id}&exam_id=${exam.id}`)
            const json = await res.json()
            if (res.ok) setMarks(json.students ?? [])
        } finally {
            setLoading(false)
        }
    }

    function updateMark(studentId: string, field: 'marks_obtained' | 'is_absent', value: number | boolean) {
        setMarks(prev => prev.map(m => {
            if (m.student_id !== studentId) return m
            if (field === 'is_absent') {
                return { ...m, is_absent: value as boolean, marks_obtained: value ? 0 : m.marks_obtained }
            }
            return { ...m, marks_obtained: value as number }
        }))
    }

    async function handleCreateExam() {
        setSaving(true)
        try {
            const res = await fetch('/api/data-entry/marks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batch_id: selectedBatch,
                    exam_name: examName,
                    subject: examSubject || null,
                    exam_date: examDate,
                    total_marks: parseFloat(totalMarks),
                    passing_marks: passingMarks ? parseFloat(passingMarks) : null,
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            toast.success('Exam created')
            setExamDialogOpen(false)
            setExamName(''); setExamSubject(''); setTotalMarks(''); setPassingMarks('')
            loadExams(selectedBatch)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to create exam')
        } finally {
            setSaving(false)
        }
    }

    async function handleSaveMarks() {
        if (!selectedExam) return
        setSaving(true)
        try {
            const res = await fetch('/api/data-entry/marks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_id: selectedExam.id,
                    marks: marks.map(m => ({
                        student_id: m.student_id,
                        marks_obtained: m.is_absent ? 0 : m.marks_obtained,
                        is_absent: m.is_absent,
                    })),
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            toast.success(`Marks saved for ${json.count} students`)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to save marks')
        } finally {
            setSaving(false)
        }
    }

    async function togglePublish(exam: Exam) {
        try {
            const res = await fetch('/api/data-entry/marks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exam_id: exam.id, results_published: !exam.results_published }),
            })
            if (!res.ok) { const json = await res.json(); throw new Error(json.error) }
            toast.success(exam.results_published ? 'Results unpublished' : 'Results published')
            loadExams(selectedBatch)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to toggle')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-tight">Marks Entry</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Create exams and enter student marks.</p>
                </div>
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
                {selectedBatch && (
                    <Button onClick={() => setExamDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Exam</Button>
                )}
            </div>

            {/* Exams List */}
            {selectedBatch && !selectedExam && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3.5">
                        <CardTitle className="text-base tracking-tight flex items-center gap-2"><FileCheck className="h-4 w-4" />Exams</CardTitle>
                        <CardDescription className="mt-0.5">{exams.length} exam(s) found</CardDescription>
                    </div>
                    {loading ? (
                        <div className="animate-pulse h-40 bg-muted/20" />
                    ) : exams.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No exams created for this batch yet.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Exam Name</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-center">Total</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right pr-4">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {exams.map((exam, i) => (
                                    <TableRow key={exam.id} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                        <TableCell className="font-medium">{exam.exam_name}</TableCell>
                                        <TableCell className="text-muted-foreground">{exam.subject || '—'}</TableCell>
                                        <TableCell className="tabular-nums">{exam.exam_date}</TableCell>
                                        <TableCell className="text-center tabular-nums">{exam.total_marks}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={exam.results_published ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-amber-500/10 text-amber-600 border-amber-200'}>
                                                {exam.results_published ? 'Published' : 'Draft'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => loadMarks(exam)}>Enter Marks</Button>
                                                <Button variant="ghost" size="sm" onClick={() => togglePublish(exam)}>
                                                    {exam.results_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}

            {/* Marks Entry Table */}
            {selectedExam && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3.5 flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base tracking-tight">{selectedExam.exam_name} — Marks Entry</CardTitle>
                            <CardDescription className="mt-0.5">Total: {selectedExam.total_marks} | {marks.length} student(s)</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedExam(null)}>← Back to Exams</Button>
                            <Button size="sm" onClick={handleSaveMarks} disabled={saving}>
                                <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save Marks'}
                            </Button>
                        </div>
                    </div>
                    {loading ? (
                        <div className="animate-pulse h-40 bg-muted/20" />
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead className="w-[120px] text-center">Marks</TableHead>
                                    <TableHead className="w-[80px] text-center">Absent</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {marks.map((m, i) => (
                                    <TableRow key={m.student_id}>
                                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                        <TableCell className="font-mono text-xs">{m.student_code || '—'}</TableCell>
                                        <TableCell className="font-medium">{m.student_name}</TableCell>
                                        <TableCell className="text-center">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={selectedExam.total_marks}
                                                value={m.is_absent ? 0 : m.marks_obtained}
                                                onChange={e => updateMark(m.student_id, 'marks_obtained', parseFloat(e.target.value) || 0)}
                                                disabled={m.is_absent}
                                                className="w-20 mx-auto text-center tabular-nums"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <input
                                                type="checkbox"
                                                checked={m.is_absent}
                                                onChange={e => updateMark(m.student_id, 'is_absent', e.target.checked)}
                                                className="w-4 h-4 rounded border-border accent-primary"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}

            {/* Create Exam Dialog */}
            <ManageDialog
                open={examDialogOpen}
                onOpenChange={setExamDialogOpen}
                title="Create New Exam"
                description="Define exam details. Marks can be entered after creation."
                onSubmit={handleCreateExam}
                saving={saving}
                submitLabel="Create"
            >
                <div className="space-y-2">
                    <Label>Exam Name *</Label>
                    <Input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Unit Test 1" required />
                </div>
                <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input value={examSubject} onChange={e => setExamSubject(e.target.value)} placeholder="e.g. Mathematics" />
                </div>
                <div className="space-y-2">
                    <Label>Exam Date *</Label>
                    <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label>Total Marks *</Label>
                        <Input type="number" min={1} value={totalMarks} onChange={e => setTotalMarks(e.target.value)} placeholder="e.g. 100" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Passing Marks</Label>
                        <Input type="number" min={0} value={passingMarks} onChange={e => setPassingMarks(e.target.value)} placeholder="e.g. 33" />
                    </div>
                </div>
            </ManageDialog>
        </div>
    )
}
