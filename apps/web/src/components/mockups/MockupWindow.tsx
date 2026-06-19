import { cn } from '@/lib/cn'
import { ReactNode } from 'react'

interface MockupWindowProps {
  title?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  variant?: 'dark' | 'darker'
}

export function MockupWindow({
  title,
  icon,
  children,
  className,
  variant = 'dark',
}: MockupWindowProps) {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border shadow-2xl',
        variant === 'dark'
          ? 'bg-[#0f0f16] border-white/[0.12] shadow-black/40'
          : 'bg-[#0a0a0f] border-white/[0.08] shadow-black/50',
        className
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#16161f]">
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57] ring-1 ring-white/[0.08]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e] ring-1 ring-white/[0.08]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840] ring-1 ring-white/[0.08]" />
        </div>
        {title && (
          <div className="flex-1 flex items-center justify-center gap-2">
            {icon && <span className="text-slate-500">{icon}</span>}
            <span className="text-[11px] font-medium text-slate-400 tracking-wide">
              {title}
            </span>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
