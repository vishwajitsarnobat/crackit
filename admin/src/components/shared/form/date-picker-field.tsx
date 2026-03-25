'use client'

import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type DatePickerFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  max?: string
  min?: string
}

export function DatePickerField({ id, label, value, onChange, placeholder = 'Pick a date', max, min }: DatePickerFieldProps) {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button id={id} variant="outline" className="h-10 w-full justify-start rounded-2xl text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4 text-secondary dark:text-primary" />
            {selectedDate ? format(selectedDate, 'dd MMM yyyy') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
            disabled={(date) => {
              const iso = format(date, 'yyyy-MM-dd')
              if (max && iso > max) return true
              if (min && iso < min) return true
              return false
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
