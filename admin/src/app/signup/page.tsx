"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, UserPlus, ArrowLeft } from "lucide-react"

export default function SignUpPage() {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        role: "",
        center: "",
        subject: "",
        applicantNote: "",
    })

    const [roles, setRoles] = useState<{ id: string, name: string }[]>([
        { id: "teacher", name: "Teacher" },
        { id: "accountant", name: "Accountant" },
        { id: "centre_head", name: "Centre Head" },
        { id: "district_admin", name: "District Admin" },
        { id: "state_admin", name: "State Admin" },
    ])

    const [centers, setCenters] = useState<{ id: string, name: string }[]>([])
    const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([])

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            if (!supabase) return;

            const [{ data: centerData }, { data: subjectData }] = await Promise.all([
                supabase.from('centers').select('id, center_name'),
                supabase.from('subjects').select('id, subject_name')
            ])

            if (centerData) setCenters(centerData.map((c: { id: string, center_name: string }) => ({ id: c.id, name: c.center_name })))
            if (subjectData) setSubjects(subjectData.map((s: { id: string, subject_name: string }) => ({ id: s.id, name: s.subject_name })))
        }
        fetchData()
    }, [supabase])

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!supabase) {
                toast.error("Supabase not configured. Please check your .env.local file.")
                return
            }

            // 1. Sign up user via Supabase Auth
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                    }
                }
            })

            if (signUpError) {
                toast.error(signUpError.message)
                return
            }

            const userId = data.user?.id

            if (userId) {
                // 2. Create the approval request
                const { error: approvalError } = await supabase
                    .from('user_approval_requests')
                    .insert({
                        user_id: userId,
                        center_id: formData.center || null,
                        requested_role: formData.role,
                        applicant_note: formData.applicantNote,
                        status: 'pending'
                    })

                if (approvalError) {
                    console.error("Approval request failed:", approvalError)
                    toast.error("Account created but approval request failed. Please contact support.")
                } else {
                    toast.success("Enrollment request submitted! Waiting for admin approval.")
                    router.push("/approval-pending")
                }
            }
        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6 lg:px-8">
            <div className="w-full max-w-xl space-y-8">
                <Button
                    variant="ghost"
                    className="group h-auto p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
                    onClick={() => router.push("/login")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Login
                </Button>

                <Card className="border-none shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Enrollment Portal</CardTitle>
                        <CardDescription>
                            Submit your details to request access to the management dashboard
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSignUp}>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="John Doe"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="role">Requested Role</Label>
                                    <Select onValueChange={(val) => setFormData({ ...formData, role: val })} required>
                                        <SelectTrigger id="role">
                                            <SelectValue placeholder="Select Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map(role => (
                                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="center">Your Allotted Center</Label>
                                    <Select onValueChange={(val) => setFormData({ ...formData, center: val })} required={formData.role !== 'ceo' && formData.role !== 'state_admin'}>
                                        <SelectTrigger id="center">
                                            <SelectValue placeholder="Select Center" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {centers.map(center => (
                                                <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {formData.role === "teacher" && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label htmlFor="subject">Assigned Subject</Label>
                                    <Select onValueChange={(val) => setFormData({ ...formData, subject: val })} required>
                                        <SelectTrigger id="subject">
                                            <SelectValue placeholder="Select Subject" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map(subject => (
                                                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="note">Applicant Note (Optional)</Label>
                                <Input
                                    id="note"
                                    placeholder="Any additional info for the approver..."
                                    value={formData.applicantNote}
                                    onChange={(e) => setFormData({ ...formData, applicantNote: e.target.value })}
                                />
                            </div>

                            <div className="rounded-lg bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                                <p>
                                    <strong>Verification Required:</strong> Your account will be created but access will be restricted until your request is approved by the CEO or Center Head.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full h-11" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Requesting Enrollment...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Request Enrollment
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}
