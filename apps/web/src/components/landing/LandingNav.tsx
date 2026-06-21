'use client'

import { useRouter } from 'next/navigation'
import { PrismLogo } from './PrismLogo'

const DISPLAY = 'var(--font-display), sans-serif'

const NAV_LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#referral', label: 'Referrals' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#advertisers', label: 'Advertisers' },
  { href: '#faq', label: 'FAQ' },
]

const navLink: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: '#475569',
  textDecoration: 'none',
  padding: '8px 12px',
  borderRadius: 8,
  whiteSpace: 'nowrap',
}

/**
 * Shared marketing nav. `linkBase` is '' on the landing (same-page anchors) and
 * '/' elsewhere (anchor back to the homepage sections). `onGetStarted` lets the
 * landing open its modal; everywhere else it falls back to the onboarding route.
 */
export function LandingNav({
  linkBase = '/',
  onGetStarted,
}: {
  linkBase?: string
  onGetStarted?: () => void
}) {
  const router = useRouter()
  const getStarted = onGetStarted ?? (() => router.push('/onboarding'))

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,250,250,.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid #e8ebf0' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 28 }}>
        <a href={linkBase || '/'} style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
          <PrismLogo size={27} id="lgNav" />
          <span style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, letterSpacing: '-.02em', color: '#0f1729' }}>Prism</span>
        </a>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={`${linkBase}${l.href}`} className="ld-navlink" style={navLink}>{l.label}</a>
          ))}
          <a href="/auth/sign-in" className="ld-navlink" style={navLink}>Sign in</a>
          <button onClick={getStarted} className="ld-btn-nav" style={{ marginLeft: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: '#7c3aed', border: 'none', cursor: 'pointer', padding: '9px 18px', borderRadius: 11, transition: '.18s', whiteSpace: 'nowrap', boxShadow: '0 6px 16px -6px rgba(124,58,237,.55)' }}>Get started</button>
        </div>
      </div>
    </nav>
  )
}
