import { cn } from '@/lib/cn'

interface CodeWindowProps {
  children: React.ReactNode
  className?: string
  title?: string
}

export function CodeWindow({
  children,
  className,
  title = 'Terminal',
}: CodeWindowProps) {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-border bg-muted shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="p-5 font-mono text-[13px] leading-relaxed">{children}</div>
    </div>
  )
}
