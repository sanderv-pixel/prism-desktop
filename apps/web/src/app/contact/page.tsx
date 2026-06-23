import type { CSSProperties } from 'react'
import { SiteShell } from '@/components/v2/SiteShell'
import { ContactForm } from '@/components/landing/ContactForm'

export const metadata = {
  title: 'Contact Prism',
  description: "Questions about earning with Prism, advertising, partnerships, or press? Send us a message and we'll get back to you.",
}

const DISPLAY = 'var(--font-display), sans-serif'
const MONO = 'var(--font-mono), monospace'

const eyebrow: CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.16em', color: '#c4b5fd', marginBottom: 14 }

const SOCIALS = [
  { name: 'X', href: 'https://x.com/be_prism' },
  { name: 'Instagram', href: 'https://instagram.com/be_prism' },
  { name: 'TikTok', href: 'https://tiktok.com/@be_prism' },
  { name: 'Threads', href: 'https://threads.net/@be_prism' },
]

const REASONS = [
  ['Creators', 'Earning, payouts, supported tools, or anything install-related.'],
  ['Advertisers', 'Campaigns, contextual targeting, and founding-advertiser rates.'],
  ['Press & partnerships', 'Media requests and partnership opportunities.'],
]

export default function ContactPage() {
  return (
    <SiteShell>
      {/* HEADER */}
      <header style={{ background: 'radial-gradient(70% 60% at 70% 0%, rgba(124,58,237,.14), transparent 60%)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 24px 40px' }}>
          <div style={eyebrow}>Contact</div>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 'clamp(36px,5vw,56px)', fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1.05, color: '#fff' }}>Let&apos;s talk.</h1>
          <p style={{ marginTop: 18, maxWidth: 520, fontSize: 18, color: '#aeb4c2', lineHeight: 1.62 }}>Questions about earning, advertising, or partnerships? Send a note and a real person will get back to you.</p>
        </div>
      </header>

      {/* BODY */}
      <section style={{ paddingBottom: 96 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '24px 24px 0', display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }}>
          {/* Left: ways to reach us */}
          <div style={{ flex: '1 1 360px', minWidth: 300 }}>
            <a href="mailto:hello@goprism.dev" style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 18, textDecoration: 'none' }}>
              <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 12, background: 'rgba(139,92,246,.14)', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✉</span>
              <span>
                <span style={{ display: 'block', fontSize: 12, color: '#8b94a7' }}>Email us directly</span>
                <span style={{ display: 'block', fontFamily: MONO, fontSize: 15, fontWeight: 600, color: '#fff' }}>hello@goprism.dev</span>
              </span>
            </a>

            <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {REASONS.map(([t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ flex: 'none', width: 22, height: 22, borderRadius: 7, background: 'rgba(139,92,246,.14)', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>›</span>
                  <span style={{ fontSize: 15, color: '#aeb4c2', lineHeight: 1.5 }}><b style={{ color: '#fff' }}>{t}.</b> {d}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: '#6a7080', marginBottom: 12 }}>Follow along</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {SOCIALS.map((s) => (
                  <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#aeb4c2', textDecoration: 'none', padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)' }}>{s.name}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Right: the form */}
          <div style={{ flex: '1 1 420px', minWidth: 300 }}>
            <ContactForm />
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
