'use client'

/**
 * Profile Page Component
 * Allows users to view their account details (role, email, centres) and update their name/phone.
 * Features: Client-side fetching of profile data and update form.
 */

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { User, Mail, Phone, Shield, Building, Calendar, Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Centre = { id: string; name: string; code: string; isPrimary: boolean }

type ProfileData = {
    id: string
    fullName: string
    email: string
    phone: string
    photoUrl: string | null
    isActive: boolean
    createdAt: string
    roleName: string
    roleDisplayName: string
    centres: Centre[]
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

export function ProfilePageClient() {
    const queryClient = useQueryClient()

    // Form state
    const [fullNameDraft, setFullNameDraft] = useState<string | null>(null)
    const [phoneDraft, setPhoneDraft] = useState<string | null>(null)

    const profileQuery = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const res = await fetch('/api/profile')
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to load profile')
            return data as ProfileData
        },
        staleTime: 60_000,
    })

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, phone })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update profile')
            return data
        },
        onSuccess: async () => {
            toast.success('Profile updated successfully')
            await queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
        onError: (error: unknown) => {
            toast.error(getErrorMessage(error, 'Failed to update profile'))
        }
    })

    useEffect(() => {
        if (profileQuery.error) {
            toast.error(getErrorMessage(profileQuery.error, 'Failed to load profile'))
        }
    }, [profileQuery.error])

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        await saveMutation.mutateAsync()
    }

    const profile = profileQuery.data ?? null
    const loading = profileQuery.isPending || profileQuery.isFetching
    const saving = saveMutation.isPending
    const fullName = fullNameDraft ?? profile?.fullName ?? ''
    const phone = phoneDraft ?? profile?.phone ?? ''

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!profile) return null

    const initial = profile.fullName.charAt(0).toUpperCase()

    // Determine badge colors based on role
    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'ceo': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200'
            case 'centre_head': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200'
            case 'teacher': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200'
            case 'accountant': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200'
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200'
        }
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="font-serif text-3xl tracking-tight">Your Profile</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage your personal information and view account details.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 items-start">
                
                {/* Left Column - Avatar & Role summary */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-serif text-primary mb-4 ring-4 ring-background border">
                                {initial}
                            </div>
                            <h2 className="text-xl font-semibold">{profile.fullName}</h2>
                            <p className="text-sm text-muted-foreground mb-4">{profile.email}</p>
                            
                            <Badge variant="outline" className={`mb-2 px-3 py-1 ${getRoleBadgeStyle(profile.roleName)}`}>
                                <Shield className="w-3 h-3 mr-1.5 inline-block" />
                                {profile.roleDisplayName}
                            </Badge>
                            
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 mt-2">
                                <Calendar className="w-3 h-3" />
                                Member since {format(new Date(profile.createdAt), 'MMM yyyy')}
                            </div>
                        </CardContent>
                    </Card>

                    {profile.roleName !== 'ceo' && profile.centres.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Building className="w-4 h-4" />
                                    Assigned Centres
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {profile.centres.map(c => (
                                    <div key={c.id} className="flex justify-between items-center p-2 rounded-md bg-muted/30 border text-sm">
                                        <div className="font-medium">{c.name}</div>
                                        {c.isPrimary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Editable Form */}
                <div className="md:col-span-2">
                    <Card>
                        <form onSubmit={handleSave}>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Update your contact details.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex flex-col gap-1">
                                        <span className="flex items-center gap-2 relative">
                                            <Mail className="w-4 h-4 text-muted-foreground" /> Email
                                        </span>
                                    </Label>
                                    <Input id="email" value={profile.email} disabled className="bg-muted/50" />
                                    <p className="text-xs text-muted-foreground">Email cannot be changed directly.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" /> Full Name
                                    </Label>
                                    <Input 
                                        id="fullName" 
                                        value={fullName} 
                                        onChange={e => setFullNameDraft(e.target.value)} 
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-muted-foreground" /> Phone Number
                                    </Label>
                                    <Input 
                                        id="phone" 
                                        type="tel"
                                        value={phone} 
                                        onChange={e => setPhoneDraft(e.target.value)} 
                                        placeholder="+91..."
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 border-t px-6 py-4">
                                <Button type="submit" disabled={saving || (!fullName.trim() || (fullName === profile.fullName && phone === profile.phone))}>
                                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Changes
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
                
            </div>
        </div>
    )
}
