'use client'

/**
 * Login Page
 * Handles user authentication via Supabase.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, ArrowRight, Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      toast.error('Please fill in all fields.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message || 'Incorrect email or password.')
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Could not verify your account. Please try again.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_active) {
      await supabase.auth.signOut()
      toast.error('Your account is pending approval.')
      setLoading(false)
      return
    }

    toast.success('Welcome back.')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-[460px] px-1">
      <div className="mb-8">
        <Badge variant="outline" className="border-primary/30 bg-primary/15 text-secondary dark:text-primary">Sign In</Badge>
        <div className="mb-4 mt-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-secondary/10 bg-white/60 text-secondary dark:bg-white/[0.05] dark:text-primary">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="max-w-[12ch] font-serif text-4xl leading-[1.04] tracking-[-0.03em] text-secondary dark:text-primary">
          Welcome back
        </h1>
        <p className="mt-2 max-w-[44ch] text-sm leading-6 text-muted-foreground">
          Sign in to continue into the CrackIt institute workspace for attendance, analytics, batches, and finance.
        </p>
      </div>

      <div className="glass-panel soft-ring rounded-[32px] p-6 transition-colors sm:p-8">
        <div className="space-y-5">

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-secondary dark:text-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="you@crackit.com"
              className="h-11"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-secondary dark:text-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Enter your password"
                className="h-11 pr-10"
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary dark:hover:text-foreground"
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />
                }
              </Button>
            </div>
          </div>

          <Button
            className="h-11 w-full font-medium"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

        </div>

        <Separator className="my-6 bg-secondary/10" />

        <p className="text-center text-sm text-muted-foreground">
          Need access?{' '}
          <Link
            href="/signup"
            className="font-medium text-secondary underline underline-offset-4 transition-colors hover:text-secondary/80 dark:text-primary dark:hover:text-primary/80"
          >
            Request an account
          </Link>
        </p>
      </div>
    </div>
  )
}
