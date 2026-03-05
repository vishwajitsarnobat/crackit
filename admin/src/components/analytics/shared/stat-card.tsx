'use client'

import { type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type StatCardProps = {
    label: string
    value: string | number
    icon?: ReactNode
    accent?: 'default' | 'success' | 'warning' | 'danger'
}

const iconBgStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
} as const

const borderAccent = {
    default: 'border-l-primary',
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-rose-500',
} as const

const valueStyles = {
    default: '',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-rose-600 dark:text-rose-400',
} as const

export function StatCard({ label, value, icon, accent = 'default' }: StatCardProps) {
    return (
        <Card className={`relative overflow-hidden border border-l-[3px] ${borderAccent[accent]} bg-card transition-all hover:shadow-md hover:-translate-y-0.5`}>
            <CardContent className="flex items-center gap-4 px-4 py-4">
                {icon && (
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBgStyles[accent]}`}>
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${valueStyles[accent]}`}>{value}</p>
                </div>
            </CardContent>
        </Card>
    )
}
