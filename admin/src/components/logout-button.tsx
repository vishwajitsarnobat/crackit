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
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleLogout() {
        setLoading(true);

        const supabase = createClient();
        const {error} = await supabase.auth.signOut();

        if (error) {
            toast.error(error.message || "Could not sign out.");
            setLoading(false);
            return;
        }

        router.push("/login");
        router.refresh();
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loading}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
            {loading ? <Loader2 className="animate-spin" /> : <LogOut />}
            Logout
        </Button>
    );
}
