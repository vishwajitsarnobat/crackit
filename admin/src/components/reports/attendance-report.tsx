'use client'

/**
 * Attendance Report Component
 * UI for generating and downloading attendance reports.
 * Allows users to select a batch and date range and download the report as PDF or Excel.
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { format, subMonths } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppRole } from '@/lib/types/entities'

type BatchOption = { id: string; batch_name: string; batch_code: string; centre_name: string }

export function AttendanceReport({ role }: { role: AppRole }) {
    const [batches, setBatches] = useState<BatchOption[]>([])
    const [selectedBatch, setSelectedBatch] = useState('')
    const [fromDate, setFromDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
    const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/data-entry/attendance')
            const json = await res.json()
            if (res.ok) setBatches(json.batches ?? [])
            setLoading(false)
        }
        load()
    }, [])

    function downloadReport(fmt: 'pdf' | 'excel') {
        if (!selectedBatch) { toast.error('Select a batch'); return }
        const params = new URLSearchParams({ batch_id: selectedBatch, from: fromDate, to: toDate, format: fmt })
        window.open(`/api/reports/attendance?${params}`, '_blank')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Attendance Report</h1>
                <p className="mt-1 text-sm text-muted-foreground">Download a summary of student attendance by batch and date range.</p>
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
                    <Label>From</Label>
                    <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-[160px]" />
                </div>
                <div className="space-y-2">
                    <Label>To</Label>
                    <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-[160px]" />
                </div>
            </div>

            {selectedBatch && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3.5 flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base tracking-tight">Download Report</CardTitle>
                            <CardDescription className="mt-0.5">Select a format to download the attendance report.</CardDescription>
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
                        <p>This report includes an attendance summary for all enrolled students in the selected batch.</p>
                        <ul className="mt-2 list-disc list-inside space-y-1">
                            <li>Total school days in the date range</li>
                            <li>Present and absent counts per student</li>
                            <li>Attendance percentage</li>
                        </ul>
                    </div>
                </Card>
            )}
        </div>
    )
}
