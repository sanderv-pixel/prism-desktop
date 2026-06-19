'use client'

import { cn } from '@/lib/cn'

type RangeValue = 7 | 30 | 90 | 'all'

interface DateRangePickerProps {
  value: RangeValue
  onChange: (value: RangeValue) => void
  className?: string
}

const options: { label: string; value: RangeValue }[] = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: 'all' },
]

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  return (
    <div className={cn('inline-flex rounded-lg border border-border bg-white p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'text-xs font-medium px-3 py-1.5 rounded-md transition',
            value === option.value
              ? 'bg-violet-50 text-primary border border-violet-200'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
