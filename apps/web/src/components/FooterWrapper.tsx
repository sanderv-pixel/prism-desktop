'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

export function FooterWrapper() {
  const pathname = usePathname()

  // Hide the marketing footer on routes that ship their own dark chrome
  // (landing, app/auth/dashboard/admin, and the content pages on SiteShell).
  const ownChrome = [
    '/',
    '/v2',
    '/contact',
    '/install',
    '/onboarding',
    '/privacy',
    '/terms',
    '/payout-policy',
    '/advertiser-policy',
    '/security',
    '/transparency',
    '/roadmap',
    '/advertisers',
    '/developers',
    '/faq',
  ]
  if (
    (pathname && ownChrome.includes(pathname)) ||
    pathname?.startsWith('/auth/') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/advertiser/') ||
    pathname?.startsWith('/admin/')
  ) {
    return null
  }

  return <Footer />
}
