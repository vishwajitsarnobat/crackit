'use client'

/**
 * Set Password Page
 * Allows users logging in for the first time or resetting their password to set a new password.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, ArrowRight, Loader2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSetPassword() {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }

    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Account activated.')
    router.push('/dashboard')
    router.refresh()
  }

  const strengthLevel = password.length >= 12 ? 4 : password.length >= 8 ? 3 : Math.min(Math.floor(password.length / 3), 2)
  const strengthColor = password.length >= 12 ? 'bg-success' : password.length >= 8 ? 'bg-warning' : 'bg-destructive'
  const strengthLabel = password.length < 8 ? 'Too short' : password.length < 12 ? 'Acceptable' : 'Strong'

  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-8">
        <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Account Setup</Badge>
        <div className="mb-4 mt-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-secondary/10 bg-white/60 text-secondary dark:bg-white/[0.05] dark:text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-4xl tracking-tight text-secondary dark:text-primary">
          Set your password
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Create a secure password to activate your account and enter the institute workspace.
        </p>
      </div>

      <div className="glass-panel soft-ring rounded-[32px] p-8">
        <div className="space-y-5">

          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="h-11 pr-10"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />
                }
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
              placeholder="Re-enter your password"
              className="h-11"
              autoComplete="new-password"
            />
          </div>

          {password.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${i < strengthLevel ? strengthColor : 'bg-border'
                      }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {strengthLabel}
              </p>
            </div>
          )}

          <Button
            className="w-full h-11 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSetPassword}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Activate account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

        </div>
      </div>
    </div>
  )
}
