import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Mail, LogOut } from "lucide-react"
import Link from "next/link"

export default function ApprovalPendingPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950 sm:px-6 lg:px-8">
            <div className="w-full max-w-md">
                <Card className="border-none shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
                            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Registration Pending</CardTitle>
                        <CardDescription className="text-balance">
                            Your account has been created successfully, but it requires manual approval by the Institute Administration.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            We have received your enrollment request. You will be notified via email once your account has been activated and your role (Teacher/Accountant) has been verified.
                        </p>
                        <div className="rounded-lg bg-zinc-100 p-4 text-left dark:bg-zinc-900">
                            <h4 className="mb-2 text-sm font-semibold flex items-center">
                                <Mail className="mr-2 h-4 w-4" /> Need Help?
                            </h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                If you believe this is taking too long, please contact your Center Head or the Institute CEO directly.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <form action="/auth/signout" method="post" className="w-full">
                            <Button variant="outline" className="w-full" type="submit">
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
