'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'

export function NavbarWrapper() {
  const pathname = usePathname()

  // Hide the marketing navbar inside dashboard, advertiser, and admin routes —
  // and on the landing page (`/`), which ships its own nav.
  if (
    pathname === '/' ||
    pathname === '/contact' ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/advertiser/') ||
    pathname?.startsWith('/admin/')
  ) {
    return null
  }

  return <Navbar />
}
