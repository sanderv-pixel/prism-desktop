'use client'

import Link from 'next/link'
import { useRef } from 'react'

interface MagneticLinkProps {
  href: string
  className?: string
  children: React.ReactNode
}

/**
 * Primary CTA with a cheap "magnetic" pull toward the cursor. Falls back to a
 * plain link when reduced motion is requested. Routes via next/link.
 */
export function MagneticLink({ href, className, children }: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${
      (e.clientY - r.top - r.height / 2) * 0.35
    }px)`
  }
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </Link>
  )
}
