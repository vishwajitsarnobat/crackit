/**
 * Root Layout
 * The highest-level Next.js layout, wrapping the entire app with fonts, theming, and toast providers.
 */

import type { Metadata } from 'next'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import { AppProviders } from '@/components/app-providers'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'Crack It - Admin',
  description: 'Crack It Coaching Institute Management',
  icons: {
    icon: '/crackit-icon.svg',
    shortcut: '/crackit-icon.svg',
    apple: '/crackit-icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${instrumentSerif.variable} font-sans antialiased app-shell-bg`}
      >
        <AppProviders>
          {children}

          <Toaster />
        </AppProviders>
      </body>
    </html>
  )
}
