"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle, UserCheck, Search } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export default function ApprovalsPage() {
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [selectedRequest, setSelectedRequest] = useState<any>(null)
    const [rejectionReason, setRejectionReason] = useState("")
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

    const supabase = createClient()

    const fetchRequests = async () => {
        if (!supabase) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("user_approval_requests")
                .select(`
          *,
          users:user_id (full_name, email),
          centers:center_id (center_name)
        `)
                .eq("status", "pending")
                .order("created_at", { ascending: false })

            if (error) throw error
            setRequests(data || [])
        } catch (err: any) {
            toast.error("Failed to fetch requests: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleApprove = async (request: any) => {
        setActionLoading(request.id)
        try {
            // 1. Update the approval request status
            const { error: approvalError } = await supabase
                .from("user_approval_requests")
                .update({
                    status: "approved",
                    reviewed_at: new Date().toISOString()
                })
                .eq("id", request.id)

            if (approvalError) throw approvalError

            // 2. Activate the user in the public.users table
            const { error: userError } = await supabase
                .from("users")
                .update({ is_active: true })
                .eq("id", request.user_id)

            if (userError) throw userError

            toast.success(`Approved ${request.users?.full_name}`)
            fetchRequests()
        } catch (err: any) {
            toast.error("Approval failed: " + err.message)
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async () => {
        if (!selectedRequest) return
        setActionLoading(selectedRequest.id)
        try {
            const { error } = await supabase
                .from("user_approval_requests")
                .update({
                    status: "rejected",
                    reviewed_at: new Date().toISOString(),
                    rejection_reason: rejectionReason
                })
                .eq("id", selectedRequest.id)

            if (error) throw error

            toast.success(`Rejected ${selectedRequest.users?.full_name}`)
            setIsRejectDialogOpen(false)
            setRejectionReason("")
            fetchRequests()
        } catch (err: any) {
            toast.error("Rejection failed: " + err.message)
        } finally {
            setActionLoading(null)
            setSelectedRequest(null)
        }
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Enrollment Approvals</h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Manage pending registration requests from Teachers, Accountants, and Staff.
                    </p>
                </div>
                <Button onClick={fetchRequests} variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                </Button>
            </div>

            <Card className="border-none shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800">
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                    <CardDescription>
                        Review and approve new staff access requests.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            No pending approval requests found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Applicant</TableHead>
                                    <TableHead>Requested Role</TableHead>
                                    <TableHead>Requested Center</TableHead>
                                    <TableHead>Date Requested</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{request.users?.full_name}</span>
                                                <span className="text-xs text-zinc-500">{request.users?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {request.requested_role.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {request.centers?.center_name || (
                                                <span className="text-zinc-400 italic">Global Access</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(request.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => {
                                                        setSelectedRequest(request)
                                                        setIsRejectDialogOpen(true)
                                                    }}
                                                    disabled={actionLoading === request.id}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Reject
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleApprove(request)}
                                                    disabled={actionLoading === request.id}
                                                >
                                                    {actionLoading === request.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                    )}
                                                    Approve
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Request</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting the request from {selectedRequest?.users?.full_name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="e.g., Invalid center selected, incorrect role requested..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="h-24"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectionReason || actionLoading === selectedRequest?.id}
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
