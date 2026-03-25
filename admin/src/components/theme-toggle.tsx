'use client'

/**
 * Theme Toggle Component
 * A button that toggles the application theme between dark and light mode.
 */

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="h-10 rounded-full px-3 text-secondary hover:border-secondary/30 hover:text-secondary"
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </span>
      <span className="text-sm">{isDark ? 'Dark' : 'Light'}</span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
