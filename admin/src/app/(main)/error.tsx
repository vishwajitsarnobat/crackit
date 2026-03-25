'use client'

/**
 * Error Page
 * Catches unhandled errors in the main application layout and displays a fallback UI.
 */

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-500" />
        </div>
        
        <h2 className="mt-6 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h2>
        
        <p className="mt-3 text-sm text-muted-foreground">
          We experienced an internal error while trying to process your request. 
          The issue has been logged and we&apos;re looking into it.
        </p>
        
        <div className="mt-8 flex gap-4">
          <Button onClick={() => window.location.reload()} variant="outline">
            Go back
          </Button>
          <Button onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
