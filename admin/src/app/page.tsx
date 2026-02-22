import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, User, ShieldCheck, Mail } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch role and details from public.users
  const { data: profile } = await supabase
    .from("users")
    .select("*, roles(display_name)")
    .eq("id", user?.id)
    .single()

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md dark:bg-zinc-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold">
              L
            </div>
            <span className="text-lg font-bold">Crack It Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Welcome, {profile?.full_name || user?.email}
            </span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Monitor and manage your coaching institute operations.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-none shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                <ShieldCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">Verified</div>
                <p className="text-xs text-zinc-500">Your account is active</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Role</CardTitle>
                <User className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(profile?.roles as any)?.display_name || "Staff"}
                </div>
                <p className="text-xs text-zinc-500">Institute Permissions Level</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">User Profile</CardTitle>
                <Mail className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold truncate">
                  {user?.email}
                </div>
                <p className="text-xs text-zinc-500">Associated Email Address</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
            <h2 className="text-xl font-semibold">Coming Soon</h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              The full management modules for Teachers and Accountants are currently being developed.
            </p>
            <Button className="mt-6" variant="outline">Learn More</Button>
          </div>
        </div>
      </main>
    </div>
  )
}
