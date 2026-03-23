'use client'

/**
 * Performance Report Component
 * UI for generating and downloading performance reports.
 * Allows users to select a batch and specific exam, then download the results as PDF or Excel.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { FileText, FileSpreadsheet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { AppRole, Exam } from '@/lib/types/entities'

type BatchOption = { id: string; batch_name: string; batch_code: string; centre_name: string }

export function PerformanceReport({ role }: { role: AppRole }) {
    const [batches, setBatches] = useState<BatchOption[]>([])
    const [selectedBatch, setSelectedBatch] = useState('')
    const [exams, setExams] = useState<Exam[]>([])
    const [selectedExam, setSelectedExam] = useState('')
    const [loading, setLoading] = useState(true)

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
        setSelectedExam('')
        const res = await fetch(`/api/data-entry/marks?batch_id=${batchId}`)
        const json = await res.json()
        if (res.ok) setExams(json.exams ?? [])
    }, [])

    useEffect(() => {
        if (selectedBatch) loadExams(selectedBatch)
    }, [selectedBatch, loadExams])

    function downloadReport(fmt: 'pdf' | 'excel') {
        if (!selectedBatch || !selectedExam) { toast.error('Select batch and exam'); return }
        const params = new URLSearchParams({ batch_id: selectedBatch, exam_id: selectedExam, format: fmt })
        window.open(`/api/reports/performance?${params}`, '_blank')
    }

    const selectedExamObj = exams.find(e => e.id === selectedExam)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Performance Report</h1>
                <p className="mt-1 text-sm text-muted-foreground">Download exam results and student performance analysis.</p>
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
                    <div className="space-y-2 min-w-[220px]">
                        <Label>Exam</Label>
                        <Select value={selectedExam} onValueChange={setSelectedExam}>
                            <SelectTrigger><SelectValue placeholder="Select exam…" /></SelectTrigger>
                            <SelectContent>
                                {exams.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.exam_name} ({e.exam_date})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {selectedExamObj && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3.5 flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base tracking-tight">Download Report</CardTitle>
                            <CardDescription className="mt-0.5">{selectedExamObj.exam_name} — Total: {selectedExamObj.total_marks} marks</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => downloadReport('pdf')}>
                                <FileText className="h-3.5 w-3.5 mr-1.5" />Download PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => downloadReport('excel')}>
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Download Excel
                            </Button>
                        </div>
                    </div>
                    <div className="p-6 text-sm text-muted-foreground">
                        <p>This report includes marks for all enrolled students.</p>
                        <ul className="mt-2 list-disc list-inside space-y-1">
                            <li>Individual marks and percentage</li>
                            <li>Pass / Fail status (based on passing marks if set)</li>
                            <li>Students ranked by marks (highest first)</li>
                            <li>Absent students listed at the end</li>
                        </ul>
                    </div>
                </Card>
            )}
        </div>
    )
}
