/**
 * Root Application Page
 * Redirects the user to the appropriate dashboard based on authentication state.
 */

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
