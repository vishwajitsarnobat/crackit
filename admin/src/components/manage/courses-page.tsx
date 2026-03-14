'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Power } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ManageDialog } from '@/components/manage/manage-dialog'
import { useManageData } from '@/lib/hooks/use-manage-data'
import { type Course, type AppRole } from '@/lib/types/entities'

export function CoursesPage({ role }: { role: AppRole }) {
    const { data, loading, reload } = useManageData<{ courses: Course[] }>({ endpoint: 'courses' })
    const courses = data?.courses || []

    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState<Course | null>(null)

    const [name, setName] = useState('')
    const [targetExam, setTargetExam] = useState('')



    function openAdd() {
        setEditing(null); setName(''); setTargetExam('')
        setDialogOpen(true)
    }

    function openEdit(c: Course) {
        setEditing(c); setName(c.course_name); setTargetExam(c.target_exam ?? '')
        setDialogOpen(true)
    }

    async function handleSave() {
        setSaving(true)
        try {
            if (editing) {
                const res = await fetch('/api/manage/courses', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editing.id, course_name: name, target_exam: targetExam })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                toast.success('Course updated')
            } else {
                const res = await fetch('/api/manage/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ course_name: name, target_exam: targetExam })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                toast.success('Course created')
            }
            setDialogOpen(false)
            await reload()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Unknown error') }
        finally { setSaving(false) }
    }

    async function toggleActive(c: Course) {
        try {
            const res = await fetch('/api/manage/courses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: c.id, is_active: !c.is_active })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(`Course ${c.is_active ? 'deactivated' : 'activated'}`)
            await reload()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Unknown error') }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-tight">Course Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Add, edit, or deactivate courses and their target exams.</p>
                </div>
                <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Course</Button>
            </div>

            <Card className="gap-0 py-0 overflow-hidden">
                <div className="border-b bg-muted/30 px-5 py-3.5">
                    <CardTitle className="text-base tracking-tight">All Courses</CardTitle>
                    <CardDescription className="mt-0.5">{courses.length} course(s) found</CardDescription>
                </div>
                {loading ? (
                    <div className="animate-pulse h-40 bg-muted/20" />
                ) : courses.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No courses found. Create your first course.</div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Course Name</TableHead>
                                <TableHead>Target Exam</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right pr-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.map((c, i) => (
                                <TableRow key={c.id} className="transition-colors hover:bg-muted/30">
                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="font-medium">{c.course_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{c.target_exam || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={c.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => toggleActive(c)}>
                                                <Power className={`h-3.5 w-3.5 ${c.is_active ? 'text-red-500' : 'text-emerald-500'}`} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <ManageDialog
                open={dialogOpen} onOpenChange={setDialogOpen}
                title={editing ? 'Edit Course' : 'Add New Course'}
                description={editing ? 'Update the course details.' : 'Create a new course.'}
                onSubmit={handleSave} saving={saving} submitLabel={editing ? 'Update' : 'Create'}
            >
                <div className="space-y-2">
                    <Label htmlFor="cname">Course Name *</Label>
                    <Input id="cname" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. IIT-JEE Foundation" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="texam">Target Exam</Label>
                    <Input id="texam" value={targetExam} onChange={e => setTargetExam(e.target.value)} placeholder="e.g. JEE Mains / NEET / UPSC" />
                </div>
            </ManageDialog>
        </div>
    )
}
