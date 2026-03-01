'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type Role = 'ceo' | 'centre_head' | 'teacher' | 'accountant'
type Center = { id: string; center_name: string }

const CENTER_ROLES: Role[] = ['teacher', 'accountant']

const ROLE_LABELS: Record<Role, string> = {
  ceo: 'CEO',
  centre_head: 'Centre Head',
  teacher: 'Teacher',
  accountant: 'Accountant',
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ceo: 'Full institute access - approved by existing CEO',
  centre_head: 'Manage a centre - approved by CEO',
  teacher: 'Teach batches - approved by your centre head',
  accountant: 'Manage fees - approved by your centre head',
}

export default function SignupPage() {
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<Role>('centre_head')
  const [centers, setCenters] = useState<Center[]>([])
  const [centerId, setCenterId] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!CENTER_ROLES.includes(role)) {
      setCenterId('')
      return
    }

    supabase
      .from('centers')
      .select('id, center_name')
      .eq('is_active', true)
      .order('center_name')
      .then(({ data }) => setCenters(data ?? []))
  }, [role])

  async function getRoleId(roleName: Role): Promise<string> {
    const { data } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', roleName)
      .single()

    return data!.id
  }

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

    if (CENTER_ROLES.includes(role) && !centerId) {
      toast.error('Please select a centre.')
      return
    }

    setLoading(true)

    const { data: authData, error: authError } =
      await supabase.auth.signUp({ email, password })

    if (authError || !authData.user) {
      toast.error(authError?.message ?? 'Signup failed.')
      setLoading(false)
      return
    }

    const userId = authData.user.id

    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      full_name: fullName.trim(),
      email,
      role_id: await getRoleId(role),
    })

    if (userError) {
      toast.error(userError.message)
      setLoading(false)
      return
    }

    const { error: approvalError } =
      await supabase.from('user_approval_requests').insert({
        user_id: userId,
        requested_role: role,
        center_id: CENTER_ROLES.includes(role) ? centerId : null,
      })

    if (approvalError) {
      toast.error(approvalError.message)
      setLoading(false)
      return
    }

    toast.success('Request submitted for approval.')
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border bg-card p-10 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <CheckCircle2 className="h-7 w-7 text-accent" />
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
        <h1 className="font-serif text-3xl tracking-tight text-foreground">
          Request access
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account will be reviewed before activation
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />
                }
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={v => setRole(v as Role)}>
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

          {CENTER_ROLES.includes(role) && (
            <div className="space-y-2">
              <Label htmlFor="center">Centre</Label>
              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger id="center" className="h-11">
                  <SelectValue placeholder="Select your centre" />
                </SelectTrigger>
                <SelectContent>
                  {centers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No centres found
                    </SelectItem>
                  ) : (
                    centers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.center_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            className="w-full h-11 font-medium"
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
            className="font-medium text-foreground underline underline-offset-4 hover:text-accent transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}