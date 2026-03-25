"use client";

/**
 * Logout Button Component
 * Handles clearing the Supabase user session and redirecting to the login page.
 */

import {useState} from "react";
import {useRouter} from "next/navigation";
import {LogOut, Loader2} from "lucide-react";
import {toast} from "sonner";
import {createClient} from "@/lib/supabase/client";
import {Button} from "@/components/ui/button";

export function LogoutButton() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleLogout() {
        setLoading(true)

        const supabase = createClient()
        const {error} = await supabase.auth.signOut()

        if (error) {
            toast.error(error.message || "Could not sign out.")
            setLoading(false)
            return
        }

        router.push("/login")
        router.refresh()
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loading}
            className="rounded-full px-4 text-secondary hover:border-red-300/40 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300"
        >
            {loading ? <Loader2 className="animate-spin" /> : <LogOut />}
            Logout
        </Button>
    )
}
