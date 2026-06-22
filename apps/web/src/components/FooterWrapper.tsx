'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

export function FooterWrapper() {
  const pathname = usePathname()

  // Hide the marketing footer inside dashboard, advertiser, and admin routes —
  // and on the landing pages (`/`, `/v2`), which ship their own footer.
  if (
    pathname === '/' ||
    pathname === '/v2' ||
    pathname === '/contact' ||
    pathname === '/install' ||
    pathname === '/onboarding' ||
    pathname?.startsWith('/auth/') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/advertiser/') ||
    pathname?.startsWith('/admin/')
  ) {
    return null
  }

  return <Footer />
}
