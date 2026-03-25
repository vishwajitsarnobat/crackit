'use client'

/**
 * Reusable Stat Card Component (KPI metrics)
 * Displays a single key performance indicator with an icon and value.
 * Supports different styling accents (success, warning, danger).
 */

import { type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type StatCardProps = {
    label: string
    value: string | number
    icon?: ReactNode
    accent?: 'default' | 'success' | 'warning' | 'danger'
}

const iconBgStyles = {
    default: 'bg-primary/18 text-secondary dark:text-primary',
    success: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    danger: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
} as const

const borderAccent = {
    default: 'border-l-primary',
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-rose-500',
} as const

const valueStyles = {
    default: 'text-secondary dark:text-foreground',
    success: 'text-emerald-700 dark:text-emerald-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger: 'text-rose-700 dark:text-rose-300',
} as const

export function StatCard({ label, value, icon, accent = 'default' }: StatCardProps) {
    return (
        <Card className={`relative overflow-hidden border border-l-[3px] ${borderAccent[accent]} bg-card/95 transition-all hover:-translate-y-0.5`}>
            <CardContent className="flex items-center gap-4 px-4 py-4">
                {icon && (
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBgStyles[accent]}`}>
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
