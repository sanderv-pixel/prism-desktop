import { cn } from '@/lib/cn'

type Status =
  | 'active'
  | 'pending'
  | 'paused'
  | 'rejected'
  | 'completed'
  | 'paid'
  | 'failed'
  | string

interface StatusBadgeProps {
  status: Status
  className?: string
}

const styles: Record<string, string> = {
  active:
    'bg-emerald-50 text-emerald-600 border-emerald-200',
  pending:
    'bg-amber-50 text-amber-500 border-amber-200',
  pending_review:
    'bg-amber-50 text-amber-500 border-amber-200',
  paused:
    'bg-slate-100 text-slate-500 border-slate-200',
  rejected:
    'bg-red-50 text-red-500 border-red-200',
  completed:
    'bg-cyan-50 text-cyan-600 border-cyan-200',
  paid:
    'bg-emerald-50 text-emerald-600 border-emerald-200',
  failed:
    'bg-red-50 text-red-500 border-red-200',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase()
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize',
        styles[normalized] ?? styles.pending,
        className
      )}
    >
      {status}
    </span>
  )
}
