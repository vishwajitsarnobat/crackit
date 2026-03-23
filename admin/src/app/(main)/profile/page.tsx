/**
 * Profile Page
 * Renders the user profile management UI after verifying user authentication context.
 */

import { getCurrentUserContext } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { ProfilePageClient } from '@/components/profile/profile-page'

export default async function ProfilePage() {
    const context = await getCurrentUserContext()

    if (!context || !context.isActive) {
        redirect('/login')
    }

    return <ProfilePageClient />
}
