'use client'

/**
 * Staff Attendance Page Component
 * Allows centre heads and admins to log daily attendance for their staff members.
 * Features: Marking staff as Present, Absent, or Partial with In/Out timestamps.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Save, Clock } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppRole } from '@/lib/types/entities'

type CentreOption = { id: string; centre_name: string; centre_code: string }
type StaffRow = {
    user_id: string
    staff_name: string
    role: string
    status: 'present' | 'absent' | 'partial' | null
    in_time: string
    out_time: string
}

const STATUS_OPTIONS = [
    { value: 'present', label: 'Present', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    { value: 'absent', label: 'Absent', color: 'bg-red-500/10 text-red-600 border-red-200' },
    { value: 'partial', label: 'Partial', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
]

export function StaffAttendancePage({ role }: { role: AppRole }) {
    const [centres, setCentres] = useState<CentreOption[]>([])
    const [selectedCentre, setSelectedCentre] = useState('')
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [staff, setStaff] = useState<StaffRow[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/data-entry/staff-attendance')
            const json = await res.json()
            if (res.ok) setCentres(json.centres ?? [])
            setLoading(false)
        }
        load()
    }, [])

    const loadStaff = useCallback(async (centreId: string, date: string) => {
        if (!centreId || !date) return
        setLoading(true)
        try {
            const res = await fetch(`/api/data-entry/staff-attendance?centre_id=${centreId}&date=${date}`)
            const json = await res.json()
            if (res.ok) {
                setStaff((json.staff ?? []).map((s: any) => ({
                    user_id: s.user_id,
                    staff_name: s.staff_name,
                    role: s.role ?? '',
                    status: s.status,
                    in_time: s.in_time ?? '',
                    out_time: s.out_time ?? '',
                })))
            }
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedCentre && selectedDate) loadStaff(selectedCentre, selectedDate)
    }, [selectedCentre, selectedDate, loadStaff])

    function updateStaff(userId: string, field: keyof StaffRow, value: string | null) {
        setStaff(prev => prev.map(s => {
            if (s.user_id !== userId) return s
            if (field === 'status') {
                return { ...s, status: value as StaffRow['status'] }
            }
            return { ...s, [field]: value ?? '' }
        }))
    }

    async function handleSave() {
        const unmarked = staff.filter(s => !s.status)
        if (unmarked.length > 0) {
            toast.error(`${unmarked.length} staff member(s) not marked yet.`)
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/data-entry/staff-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    centre_id: selectedCentre,
                    attendance_date: selectedDate,
                    records: staff.map(s => ({
                        user_id: s.user_id,
                        status: s.status,
                        in_time: s.in_time || null,
                        out_time: s.out_time || null,
                    })),
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            toast.success(`Attendance saved for ${json.count} staff members`)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Staff Attendance</h1>
                <p className="mt-1 text-sm text-muted-foreground">Daily attendance logging for teachers — supports present, absent, and partial (late arrival / early departure).</p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2 min-w-[220px]">
                    <Label>Centre</Label>
                    <Select value={selectedCentre} onValueChange={setSelectedCentre}>
                        <SelectTrigger><SelectValue placeholder="Select centre…" /></SelectTrigger>
                        <SelectContent>
                            {centres.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.centre_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} className="w-[180px]" />
                </div>
            </div>

            {selectedCentre && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3.5 flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base tracking-tight flex items-center gap-2"><Clock className="h-4 w-4" />Staff Roster</CardTitle>
                            <CardDescription className="mt-0.5">{staff.length} staff member(s)</CardDescription>
                        </div>
                        <Button size="sm" onClick={handleSave} disabled={saving || staff.length === 0}>
                            <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save'}
                        </Button>
                    </div>
                    {loading ? (
                        <div className="animate-pulse h-40 bg-muted/20" />
                    ) : staff.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No staff assigned to this centre.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="w-[140px] text-center">Status</TableHead>
                                    <TableHead className="w-[120px]">In Time</TableHead>
                                    <TableHead className="w-[120px]">Out Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff.map((s, i) => {
                                    const statusConfig = STATUS_OPTIONS.find(o => o.value === s.status)
                                    return (
                                        <TableRow key={s.user_id}>
                                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="font-medium">{s.staff_name}</TableCell>
                                            <TableCell className="text-muted-foreground capitalize text-sm">{s.role}</TableCell>
                                            <TableCell className="text-center">
                                                <Select value={s.status ?? ''} onValueChange={v => updateStaff(s.user_id, 'status', v)}>
                                                    <SelectTrigger className="w-[120px] mx-auto">
                                                        <SelectValue placeholder="Select…" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {STATUS_OPTIONS.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input type="time" value={s.in_time} onChange={e => updateStaff(s.user_id, 'in_time', e.target.value)} disabled={s.status === 'absent'} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="time" value={s.out_time} onChange={e => updateStaff(s.user_id, 'out_time', e.target.value)} disabled={s.status === 'absent'} />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}
        </div>
    )
}
