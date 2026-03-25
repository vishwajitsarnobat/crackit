'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type SelectFieldOption = {
  value: string
  label: string
}

type SelectFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectFieldOption[]
  placeholder?: string
}

export function SelectField({ id, label, value, onChange, options, placeholder = 'Select' }: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 w-full rounded-xl border-white/10 bg-slate-950/35 text-slate-200">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-slate-950/95 text-slate-100 backdrop-blur-xl">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
