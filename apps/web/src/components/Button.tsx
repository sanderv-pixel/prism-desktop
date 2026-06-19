import Link from 'next/link'
import { cn } from '@/lib/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'white'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  href?: string
  external?: boolean
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  href,
  external,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]'

  const variants = {
    primary:
      'bg-primary text-primary-foreground hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-500/25 shadow-sm',
    secondary:
      'bg-secondary text-secondary-foreground hover:bg-slate-200',
    outline:
      'border border-border bg-background text-foreground hover:bg-muted hover:border-slate-300',
    ghost: 'text-muted-foreground hover:text-foreground',
    white:
      'bg-white text-foreground hover:bg-white/90 shadow-lg shadow-black/5 border border-border/50',
  }

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
    xl: 'px-8 py-4 text-lg',
  }

  const classes = cn(baseStyles, variants[variant], sizes[size], className)

  if (href) {
    const linkProps = external
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : {}
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
