'use client'

/**
 * Signup Page
 * Allows new users to register and select their role (with admin approval required).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

type Role = 'ceo' | 'centre_head' | 'teacher' | 'accountant'
type Centre = { id: string; centre_name: string }

const CENTRE_ROLES: Role[] = ['centre_head', 'teacher']

const ROLE_LABELS: Record<Role, string> = {
  ceo: 'CEO',
  centre_head: 'Centre Head',
  teacher: 'Teacher',
  accountant: 'Accountant',
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ceo: 'Full institute access - approved by existing CEO',
  centre_head: 'Manage your centre - approved by CEO',
  teacher: 'Teach batches - approved by your centre head',
  accountant: 'Manage fees - approved by CEO',
}

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<Role>('centre_head')
  const [centres, setCentres] = useState<Centre[]>([])
  const [centreId, setCentreId] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function handleRoleChange(value: string) {
    const nextRole = value as Role
    setRole(nextRole)

    if (!CENTRE_ROLES.includes(nextRole)) {
      setCentreId('')
    }
  }

  useEffect(() => {
    if (!CENTRE_ROLES.includes(role)) {
      return
    }

    fetch('/api/auth/signup')
      .then(async response => {
        if (!response.ok) return []
        return await response.json()
      })
      .then(data => setCentres(Array.isArray(data) ? data : []))
      .catch(() => setCentres([]))
  }, [role])

  async function handleSignup() {
    if (!fullName.trim()) {
      toast.error('Full name is required.')
      return
    }

    if (!email) {
      toast.error('Email is required.')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }

    if (CENTRE_ROLES.includes(role) && !centreId) {
      toast.error('Please select a centre.')
      return
    }

    setLoading(true)

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        centreId: CENTRE_ROLES.includes(role) ? centreId : null,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      toast.error(result?.error ?? 'Signup failed.')
      setLoading(false)
      return
    }

    toast.success('Request submitted for approval. Sign in after approval.')
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border bg-card p-10 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h2 className="font-serif text-2xl tracking-tight">
            Request submitted
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Your account is pending approval. You will be able to sign in once an administrator approves your request.
          </p>
          <Button variant="outline" className="mt-6 w-full h-11" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-3xl tracking-tight text-foreground">
          Request access
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account will be reviewed before activation
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
        <div className="space-y-5">

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ravi Sharma"
              className="h-11"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ravi@crackit.com"
              className="h-11"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger id="role" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                  <SelectItem key={r} value={r}>
                    <div>
                      <p className="font-medium">{ROLE_LABELS[r]}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>

          {CENTRE_ROLES.includes(role) && (
            <div className="space-y-2">
              <Label htmlFor="centre">Centre</Label>
              <Select value={centreId} onValueChange={setCentreId}>
                <SelectTrigger id="centre" className="h-11">
                  <SelectValue placeholder="Select your centre" />
                </SelectTrigger>
                <SelectContent>
                  {centres.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No centres found
                    </SelectItem>
                  ) : (
                    centres.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.centre_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            className="w-full h-11 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Submit request
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

        </div>

        <Separator className="my-6" />

        <p className="text-center text-sm text-muted-foreground">
          Already approved?{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
