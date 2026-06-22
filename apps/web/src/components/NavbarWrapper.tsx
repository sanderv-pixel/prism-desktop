'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'

export function NavbarWrapper() {
  const pathname = usePathname()

  // Hide the marketing navbar inside dashboard, advertiser, and admin routes —
  // and on the landing pages (`/`, `/v2`), which ship their own nav.
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

  return <Navbar />
}
