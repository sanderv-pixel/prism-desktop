import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  className?: string
  accent?: 'violet' | 'cyan' | 'fuchsia'
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  accent = 'violet',
}: FeatureCardProps) {
  const accentColors = {
    violet: 'from-violet-500 via-violet-300 to-transparent',
    cyan: 'from-cyan-500 via-cyan-300 to-transparent',
    fuchsia: 'from-fuchsia-500 via-fuchsia-300 to-transparent',
  }

  const iconBgColors = {
    violet: 'bg-violet-50 text-violet-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-600',
  }

  return (
    <div
      className={cn(
        'group relative rounded-2xl card p-7 md:p-8 overflow-hidden transition-all duration-300 hover:shadow-md',
        className
      )}
    >
      {/* Top gradient line */}
      <div
        className={cn(
          'absolute top-0 left-4 right-4 h-px bg-gradient-to-r',
          accentColors[accent]
        )}
      />

      <div className="relative">
        <div
          className={cn(
            'mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl transition',
            iconBgColors[accent]
          )}
        >
          <Icon size={22} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed text-[15px]">
          {description}
        </p>
      </div>
    </div>
  )
}
