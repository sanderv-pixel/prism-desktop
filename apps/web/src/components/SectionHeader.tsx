import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'max-w-3xl mb-14 md:mb-16',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {eyebrow && <span className="eyebrow mb-4">{eyebrow}</span>}
      <h2 className="text-section mb-5">{title}</h2>
      {description && (
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance">
          {description}
        </p>
      )}
    </div>
  )
}
