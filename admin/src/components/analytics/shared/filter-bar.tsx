'use client'

import { type ReactNode } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/* ── Generic select options ───────────────────────── */

export type FilterOption = { value: string; label: string }

type SelectFilterProps = {
    id: string
    label: string
    value: string
    options: FilterOption[]
    placeholder?: string
    onChange: (value: string) => void
}

export function SelectFilter({ id, label, value, options, placeholder, onChange }: SelectFilterProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id={id} className="h-10 w-full">
                    <SelectValue placeholder={placeholder ?? 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                    {options.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

/* ── Date picker ──────────────────────────────────── */

type DateFilterProps = {
    id: string
    label: string
    value: Date | undefined
    onChange: (date: Date | undefined) => void
}

export function DateFilter({ id, label, value, onChange }: DateFilterProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button id={id} variant="outline" className="h-10 w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {value ? format(value, 'dd MMM yyyy') : 'Pick a date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={value} onSelect={onChange} initialFocus />
                </PopoverContent>
            </Popover>
        </div>
    )
}

/* ── Filter bar wrapper ───────────────────────────── */

type FilterBarProps = {
    title?: string
    description?: string
    children: ReactNode
    actions?: ReactNode
    gridClass?: string
}

export function FilterBar({ title = 'Filters', description, children, actions, gridClass = "md:grid-cols-5" }: FilterBarProps) {
    return (
        <Card className="gap-4 border-border/60 py-0 overflow-hidden">
            <div className="border-b bg-muted/30 px-5 py-3.5">
                <CardTitle className="text-base tracking-tight">{title}</CardTitle>
                {description && <CardDescription className="mt-1">{description}</CardDescription>}
            </div>
            <CardContent className="space-y-4 px-5 py-5">
                <div className={`grid gap-3 ${gridClass}`}>
                    {children}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </CardContent>
        </Card>
    )
}
