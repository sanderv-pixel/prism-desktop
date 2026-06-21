import { cn } from '@/lib/cn'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  change?: number
  changeLabel?: string
  positiveIsGood?: boolean
  className?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  positiveIsGood = true,
  className,
}: StatCardProps) {
  const hasChange = change !== undefined && change !== null
  const isPositive = (change ?? 0) >= 0
  const isGood = positiveIsGood ? isPositive : !isPositive

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white px-4 py-3.5 transition',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-muted-foreground" strokeWidth={1.5} />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </div>
        {hasChange && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              isGood
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-red-50 text-red-500 border border-red-200'
            )}
          >
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isPositive ? '+' : ''}
            {change}%
          </div>
        )}
      </div>
      <p className="text-2xl font-semibold text-foreground tracking-tight leading-none">{value}</p>
    </div>
  )
}
