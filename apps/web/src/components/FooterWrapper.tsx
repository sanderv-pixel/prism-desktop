'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

export function FooterWrapper() {
  const pathname = usePathname()

  // Hide the marketing footer inside dashboard, advertiser, and admin routes —
  // and on the landing page (`/`), which ships its own footer.
  if (
    pathname === '/' ||
    pathname === '/contact' ||
    pathname === '/install' ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/advertiser/') ||
    pathname?.startsWith('/admin/')
  ) {
    return null
  }

  return <Footer />
}
