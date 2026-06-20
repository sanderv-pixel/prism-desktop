import { PrismLogo } from './PrismLogo'

const DISPLAY = 'var(--font-display), sans-serif'
const MONO = 'var(--font-mono), monospace'

const NAV_LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#advertisers', label: 'Advertisers' },
  { href: '#faq', label: 'FAQ' },
]

export function LandingFooter({ linkBase = '/' }: { linkBase?: string }) {
  return (
    <footer style={{ background: '#fafafa', borderTop: '1px solid #e8ebf0' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 24px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <PrismLogo size={24} id="lgFoot" />
          <span style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, letterSpacing: '-.02em', color: '#0f1729' }}>Prism</span>
          <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 6 }}>Get paid for every AI wait.</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={`${linkBase}${l.href}`} className="ld-footlink" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', transition: '.18s' }}>{l.label}</a>
          ))}
          <a href="/contact" className="ld-footlink" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', transition: '.18s' }}>Contact</a>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: MONO }}>© 2026 Prism</div>
      </div>
    </footer>
  )
}
