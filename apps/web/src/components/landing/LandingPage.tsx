'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { PrismLogo } from './PrismLogo'
import { LandingNav } from './LandingNav'
import { LandingFooter } from './LandingFooter'

// Font families map to the app's next/font CSS variables.
const DISPLAY = 'var(--font-display), sans-serif'
const MONO = 'var(--font-mono), monospace'
const SPECTRUM = 'linear-gradient(90deg,#8b5cf6,#ec4899,#06b6d4)'

const TOOLS = [
  { name: 'Claude', domain: 'claude.ai' },
  { name: 'Cursor', domain: 'cursor.com' },
  { name: 'Codex', domain: 'openai.com' },
  { name: 'VS Code', domain: 'code.visualstudio.com' },
  { name: 'Gemini', domain: 'gemini.google.com' },
]

const TRUST = ['Free forever', 'No credit card', 'Cash out straight to your bank', 'Uninstall anytime']

const STEPS = [
  { n: '01', accent: false, title: 'Install Prism', body: 'Add Prism once and it works across every supported tool. A single install covers Claude, Cursor, Codex, VS Code, Gemini, and more.' },
  { n: '02', accent: false, title: 'Keep building', body: 'One quiet, relevant ad appears only while your AI is already thinking. No popups, no slowdown, no clutter.' },
  { n: '03', accent: true, title: 'Get paid', body: 'Keep 50% of every advertiser dollar. Earnings accrue per impression and you can cash out anytime.' },
]

const WHY = [
  { accent: false, title: 'Effortless by design', body: 'Prism runs silently inside the tools you already use. No new tab, no workflow change, nothing to manage.' },
  { accent: false, title: 'Private by architecture', body: 'Context is computed on your machine. Your prompts, files, and outputs never leave your device.' },
  { accent: true, title: 'Fair by default', body: 'You keep half of every advertiser dollar. The split is the product, not a limited-time promotion.' },
]

const ADV_STATS = [
  { v: '50%', d: 'shared back to the creator who saw your ad. Alignment, not extraction.' },
  { v: '$10', d: 'minimum to start. Launch a contextual campaign in minutes, no sales call.' },
  { v: '100%', d: 'contextual targeting. Matched to the task at hand, never to a personal profile.' },
]

const FAQS = [
  { q: 'Does Prism track me or read my code?', a: 'No. Context is computed entirely on-device. Prism never sees your prompts, files, or outputs. Only a coarse topic category ever leaves your machine.' },
  { q: 'How much can I earn?', a: 'You keep 50% of every advertiser dollar. Earnings depend on how often your AI is working, and active builders watch it add up across the day, with no cap.' },
  { q: 'Will it slow down my AI?', a: 'No. The ad is one quiet line shown only during the wait your AI already takes. No popups, no animations, no added latency.' },
  { q: 'Which tools does Prism support?', a: 'Claude, ChatGPT, Cursor, Cowork, Notion AI, VS Code, and more, with new tools added often. One extension covers them all.' },
  { q: 'How do advertisers reach me without tracking?', a: 'Ads are contextual, matched to the on-device topic category, never to your identity or history. Every impression is fraud-filtered.' },
  { q: 'When and how do I get paid?', a: 'Earnings accrue per impression and you can cash out anytime from your dashboard. No minimums, no waiting periods.' },
]

const eyebrow = (color: string): CSSProperties => ({
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.16em',
  color,
  marginBottom: 14,
})

const sectionWrap: CSSProperties = { maxWidth: 1160, margin: '0 auto', padding: '96px 24px' }
const cardBase: CSSProperties = { background: '#fff', border: '1px solid #e8ebf0', borderRadius: 20, padding: 30, transition: '.22s' }

export function LandingPage() {
  const router = useRouter()
  const [phase, setPhase] = useState(0)
  const [total, setTotal] = useState(12.84)
  const [hours, setHours] = useState(6)
  const [faq, setFaq] = useState(-1)
  const [modal, setModal] = useState(false)

  // Looping 4-phase demo state machine.
  useEffect(() => {
    const seq: [number, number][] = [[0, 1200], [1, 1700], [2, 2600], [3, 1300]]
    let i = 0
    let t: ReturnType<typeof setTimeout>
    const step = () => {
      const [p, d] = seq[i]
      setPhase(p)
      t = setTimeout(() => {
        i = (i + 1) % seq.length
        if (i === 0) setTotal((s) => Math.round((s + 0.04) * 100) / 100)
        step()
      }, d)
    }
    step()
    return () => clearTimeout(t)
  }, [])

  // Live estimator.
  const perHr = 0.72
  const days = 21
  const monthly = hours * days * perHr
  const estMonthly = '$' + Math.round(monthly).toLocaleString()
  const estDay = '$' + (hours * perHr).toFixed(2)
  const estYear = '$' + Math.round(monthly * 12).toLocaleString()
  const hoursLabel = `${hours} ${hours === 1 ? 'hr' : 'hrs'} / day`

  const shown: CSSProperties = { opacity: 1, transform: 'translateY(0)', transition: 'opacity .55s ease,transform .55s ease' }
  const hidden: CSSProperties = { opacity: 0, transform: 'translateY(10px)', transition: 'opacity .45s ease,transform .45s ease', pointerEvents: 'none' }

  const openModal = () => router.push('/install')
  const closeModal = () => setModal(false)
  // The handoff modal captures an email; submitting kicks off the real onboarding flow.
  const startOnboarding = () => {
    setModal(false)
    router.push('/onboarding')
  }

  return (
    <div style={{ overflowX: 'hidden', background: '#fafafa', color: '#0f1729' }}>
      {/* NAV */}
      <LandingNav linkBase="" onGetStarted={openModal} />

      <div id="top" />

      {/* HERO */}
      <header style={{ position: 'relative', background: 'radial-gradient(70% 60% at 70% 0%, rgba(124,58,237,.10), transparent 60%)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '64px 24px 88px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 56 }}>
          <div style={{ flex: '1 1 440px', minWidth: 300 }}>
            <div style={eyebrow('#7c3aed')}>For AI creators &amp; advertisers</div>
            <h1 style={{ fontFamily: DISPLAY, fontSize: 'clamp(40px,6vw,68px)', fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1.04, color: '#0f1729' }}>
              Get paid while<br />AI <span style={{ background: SPECTRUM, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>thinks.</span>
            </h1>
            <p style={{ marginTop: 24, maxWidth: 520, fontSize: 18, color: '#475569', lineHeight: 1.62 }}>One small, relevant ad while your AI is already thinking. You keep half of every advertiser dollar.</p>
            <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 13 }}>
              <button onClick={openModal} className="ld-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#fff', background: '#7c3aed', border: 'none', cursor: 'pointer', padding: '14px 26px', borderRadius: 13, transition: '.18s', boxShadow: '0 10px 26px -10px rgba(124,58,237,.65)' }}>Start earning →</button>
              <a href="#advertisers" className="ld-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', fontSize: 15, fontWeight: 600, color: '#0f1729', background: '#fff', textDecoration: 'none', padding: '14px 24px', borderRadius: 13, border: '1px solid #e8ebf0', transition: '.18s' }}>For advertisers</a>
            </div>
            <div style={{ marginTop: 30, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {['No tracking', 'On-device context', 'Keep 50%'].map((t) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669' }} />{t}</span>
              ))}
            </div>
          </div>

          {/* Animated agent demo */}
          <div className="ld-float" style={{ flex: '1 1 420px', minWidth: 300 }}>
            <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #1e293b', background: '#020617', boxShadow: '0 40px 90px -40px rgba(76,29,149,.55),0 12px 30px -16px rgba(0,0,0,.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f87171' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#fbbf24' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#34d399' }} />
                <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 12, color: '#64748b' }}>claude · agent</span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 10, color: '#94a3b8' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 9px #8b5cf6', animation: 'prismPulse 2s infinite' }} />Prism active</span>
              </div>
              <div style={{ padding: 22, fontFamily: MONO, fontSize: 13, lineHeight: 1.9 }}>
                <div style={{ color: '#94a3b8' }}><span style={{ color: '#a78bfa' }}>›</span> refactor the auth module to use the new session API</div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ color: '#fbbf24', display: 'inline-block', animation: 'prismSpin 3.5s linear infinite' }}>✶</span> Thinking… <span style={{ color: '#475569' }}>(12s · 1.4k tokens)</span></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.38)', borderRadius: 9, padding: '5px 11px', boxShadow: '0 0 22px -6px rgba(139,92,246,.7)', ...(phase >= 1 ? shown : hidden) }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: '#8b5cf6', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>V</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Vercel</span>
                    <span style={{ fontSize: 12, color: '#cbd5e1', textDecoration: 'underline', textUnderlineOffset: 2 }}>Ship faster →</span>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#64748b' }}>Ad</span>
                  </span>
                </div>
                <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 9, background: '#fff', borderRadius: 11, padding: '7px 13px', ...(phase >= 2 ? shown : hidden) }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-inter)' }}>↗</span>
                  <span style={{ fontFamily: 'var(--font-inter)' }}><small style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em', color: '#64748b' }}>Earned this view</small><b style={{ fontSize: 14, color: '#0f1729' }}>+$0.04</b></span>
                </div>
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.07)', fontFamily: 'var(--font-inter)', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Earned today</span><b style={{ fontFamily: MONO, fontSize: 14, color: '#a78bfa' }}>${total.toFixed(2)}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TOOLS */}
      <section id="tools" style={{ borderTop: '1px solid #e8ebf0', borderBottom: '1px solid #e8ebf0', background: '#fff' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '34px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 26, justifyContent: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: '#94a3b8' }}>Works inside</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {/* Brand-neutral mode (NEXT_PUBLIC_BRAND_NEUTRAL=true) drops third-party
                names/logos. Default (unset) keeps the branded tool cloud. */}
            {process.env.NEXT_PUBLIC_BRAND_NEUTRAL === 'true' ? (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>your AI coding tools</span>
            ) : (
              TOOLS.map((t) => (
                <div key={t.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '8px 15px', border: '1px solid #e8ebf0', borderRadius: 11, background: '#fafafa' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://www.google.com/s2/favicons?domain=${t.domain}&sz=128`} alt={t.name} width={20} height={20} style={{ borderRadius: 5, display: 'block', flex: 'none' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{t.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px 22px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
            Product names and logos are trademarks of their respective owners. Prism is independent and is not affiliated with, sponsored by, or endorsed by them.
          </p>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ background: '#fafafa' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '22px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px 30px' }}>
          {TRUST.map((t) => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}><span style={{ color: '#059669', fontWeight: 700 }}>✓</span>{t}</span>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ background: '#fafafa' }}>
        <div style={sectionWrap}>
          <div data-reveal style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
            <div style={eyebrow('#7c3aed')}>How it works</div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,44px)', fontWeight: 600, letterSpacing: '-.02em', color: '#0f1729' }}>Three steps. Then you just build.</h2>
            <p style={{ marginTop: 14, fontSize: 17, color: '#64748b' }}>Prism runs quietly in the background of the tools you already use, turning your AI&apos;s idle seconds into income.</p>
          </div>
          <div data-reveal style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {STEPS.map((s) => (
              <div key={s.n} className="ld-card" style={cardBase}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.accent ? '#ecfdf5' : '#f5f3ff', color: s.accent ? '#059669' : '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 600, fontSize: 18 }}>{s.n}</div>
                <h3 style={{ marginTop: 20, fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: '#0f1729' }}>{s.title}</h3>
                <p style={{ marginTop: 8, fontSize: 15, color: '#64748b', lineHeight: 1.6 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EARNINGS ESTIMATOR */}
      <section id="earnings" style={{ background: '#fff', borderTop: '1px solid #e8ebf0' }}>
        <div style={sectionWrap}>
          <div data-reveal style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'center' }}>
            <div style={{ flex: '1 1 380px', minWidth: 300 }}>
              <div style={eyebrow('#7c3aed')}>Estimate your earnings</div>
              <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-.02em', color: '#0f1729', maxWidth: '16ch' }}>Idle seconds add up faster than you&apos;d think.</h2>
              <p style={{ marginTop: 16, fontSize: 17, color: '#64748b', lineHeight: 1.62, maxWidth: 460 }}>Drag to match a normal day of working with AI. Prism pays you for the waits you&apos;re already sitting through.</p>
              <div style={{ marginTop: 34, maxWidth: 440 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, color: '#64748b' }}>Active AI use</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>{hoursLabel}</span>
                </div>
                <input type="range" min={1} max={12} step={1} value={hours} onChange={(e) => setHours(+e.target.value)} style={{ width: '100%', accentColor: '#7c3aed', height: 6, cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: MONO, fontSize: 11, color: '#94a3b8' }}>
                  <span>1 hr</span><span>12 hrs</span>
                </div>
                <p style={{ marginTop: 14, fontSize: 12, color: '#94a3b8', lineHeight: 1.55 }}>Based on typical contextual ad rates and how often your AI is working. Your actual earnings will vary.</p>
              </div>
            </div>
            <div style={{ flex: '1 1 360px', minWidth: 300 }}>
              <div style={{ borderRadius: 22, background: 'linear-gradient(160deg,#0f0f17,#1a132e)', padding: 38, position: 'relative', overflow: 'hidden', boxShadow: '0 30px 70px -34px rgba(76,29,149,.6)' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(70% 60% at 80% 0%,rgba(124,58,237,.3),transparent 60%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: '#a78bfa' }}>Projected earnings</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                    <span style={{ fontFamily: DISPLAY, fontSize: 'clamp(48px,8vw,68px)', fontWeight: 600, letterSpacing: '-.03em', color: '#fff', lineHeight: 1 }}>{estMonthly}</span>
                    <span style={{ fontSize: 16, color: '#a8a8b8' }}>/ month</span>
                  </div>
                  <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 13, padding: 16 }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: MONO }}>PER DAY</div>
                      <div style={{ marginTop: 5, fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, color: '#fff' }}>{estDay}</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 13, padding: 16 }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: MONO }}>PER YEAR</div>
                      <div style={{ marginTop: 5, fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, color: '#34d399' }}>{estYear}</div>
                    </div>
                  </div>
                  <p style={{ marginTop: 18, fontSize: 11, color: '#64748b', fontFamily: MONO, lineHeight: 1.6 }}>Est. ~18 AI waits/hr × your 50% share, 21 days/mo. A projection, not a guarantee: actual earnings depend on live advertiser demand, which is still ramping. Withdraw once you reach the $20 minimum.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REFERRALS */}
      <section id="referral" style={{ background: '#fff', borderTop: '1px solid #e8ebf0' }}>
        <div style={sectionWrap}>
          <div data-reveal style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
            <div style={eyebrow('#7c3aed')}>Referral program</div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-.02em', color: '#0f1729' }}>Bring a creator, earn 10% for life.</h2>
            <p style={{ marginTop: 14, fontSize: 17, color: '#64748b', lineHeight: 1.62 }}>Every creator gets a referral link. When someone joins Prism through yours, you earn 10% of everything they make, for as long as their account stays active. It never comes out of their pocket.</p>
          </div>
          <div data-reveal style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginBottom: 32 }}>
            {[
              { t: '10% for life', b: 'A tenth of every referred creator’s earnings, with no cap and no expiry, for as long as their account is active.' },
              { t: 'Never at their expense', b: 'Your commission is paid from Prism’s share, so the creators you refer always keep their full 50%.' },
              { t: 'Paid automatically', b: 'Referral earnings land in your balance next to your own and withdraw together. Nothing to track.' },
            ].map((c) => (
              <div key={c.t} style={{ background: '#fafafa', border: '1px solid #e8ebf0', borderRadius: 20, padding: 28 }}>
                <h3 style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, color: '#0f1729' }}>{c.t}</h3>
                <p style={{ marginTop: 8, fontSize: 15, color: '#64748b', lineHeight: 1.6 }}>{c.b}</p>
              </div>
            ))}
          </div>
          <div data-reveal style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'linear-gradient(160deg,#0f0f17,#1a132e)', borderRadius: 14, padding: '14px 20px', boxShadow: '0 24px 50px -30px rgba(76,29,149,.6)' }}>
              <span style={{ fontFamily: MONO, fontSize: 14, color: '#a78bfa' }}>goprism.dev/r/you</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: '#94a3b8' }}>→</span>
              <span style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, color: '#34d399' }}>+10% for life</span>
            </div>
          </div>
        </div>
      </section>

      {/* WHY PRISM */}
      <section style={{ background: '#fafafa', borderTop: '1px solid #e8ebf0' }}>
        <div style={sectionWrap}>
          <div data-reveal style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
            <div style={eyebrow('#7c3aed')}>Why Prism</div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-.02em', color: '#0f1729' }}>Why creators choose Prism.</h2>
            <p style={{ marginTop: 14, fontSize: 17, color: '#64748b' }}>Three commitments that don&apos;t change: effortless to run, private by design, and fair by default.</p>
          </div>
          <div data-reveal style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {WHY.map((w) => (
              <div key={w.title} style={{ background: '#fff', border: '1px solid #e8ebf0', borderRadius: 20, padding: 28 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: w.accent ? '#ecfdf5' : '#f5f3ff', color: w.accent ? '#059669' : '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 600, fontSize: 18 }}>✓</div>
                <h3 style={{ marginTop: 18, fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, color: '#0f1729' }}>{w.title}</h3>
                <p style={{ marginTop: 8, fontSize: 15, color: '#64748b', lineHeight: 1.6 }}>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section id="privacy" style={{ background: '#fff', borderTop: '1px solid #e8ebf0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '96px 24px', display: 'flex', flexWrap: 'wrap', gap: 56, alignItems: 'center' }}>
          <div data-reveal style={{ flex: '1 1 420px', minWidth: 300 }}>
            <div style={eyebrow('#059669')}>Private by architecture</div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-.02em', color: '#0f1729', maxWidth: '14ch' }}>We never see your work.</h2>
            <p style={{ marginTop: 16, fontSize: 17, color: '#64748b', lineHeight: 1.62, maxWidth: 480 }}>Privacy isn&apos;t a policy at Prism. It&apos;s the architecture. Relevance is computed entirely on your machine, so the only thing that ever leaves is a coarse topic category.</p>
            <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Context computed on-device.', ' Matching happens locally, and nothing is uploaded to score an ad.'],
                ['Prompts, files & outputs stay put.', ' Prism never reads, stores, or transmits what you’re working on.'],
                ['Fraud-filtered, no profiles.', ' Every impression is verified without building a profile of you.'],
              ].map(([b, rest]) => (
                <div key={b} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ flex: 'none', width: 22, height: 22, borderRadius: 7, background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 15, color: '#334155' }}><b style={{ color: '#0f1729' }}>{b}</b>{rest}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {['On-device by default', 'SOC 2 Type II in progress', 'Your data is never sold'].map((c) => (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 11, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 9, padding: '6px 11px' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />{c}</span>
              ))}
            </div>
          </div>
          <div data-reveal style={{ flex: '1 1 380px', minWidth: 300 }}>
            <div style={{ border: '1px solid #e8ebf0', borderRadius: 20, background: '#fafafa', padding: 26 }}>
              <div style={{ border: '1.5px dashed #c4b5fd', borderRadius: 16, background: '#fff', padding: 22 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669' }} />Your device</div>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {['prompt.txt', 'board-update.docx', 'sales-notes.csv'].map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f5f3ff', borderRadius: 10, padding: '11px 14px' }}><span style={{ fontFamily: MONO, fontSize: 12, color: '#4c1d95' }}>{f}</span><span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>🔒 local</span></div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 4px', color: '#94a3b8' }}>
                <div style={{ flex: 1, height: 1, background: '#e8ebf0' }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#7c3aed' }}>only this leaves ↓</span>
                <div style={{ flex: 1, height: 1, background: '#e8ebf0' }} />
              </div>
              <div style={{ background: '#0f0f17', borderRadius: 12, padding: '14px 16px', fontFamily: MONO, fontSize: 12, color: '#a78bfa' }}>{'{ topic: '}<span style={{ color: '#7dd3fc' }}>&quot;finance&quot;</span>{', type: '}<span style={{ color: '#7dd3fc' }}>&quot;doc&quot;</span>{' }'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ADVERTISERS */}
      <section id="advertisers" style={{ background: '#0f0f17', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 80% at 80% 10%, rgba(124,58,237,.28), transparent 55%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '96px 24px', position: 'relative' }}>
          <div data-reveal style={{ maxWidth: 640 }}>
            <div style={eyebrow('#a78bfa')}>For advertisers</div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,44px)', fontWeight: 600, letterSpacing: '-.02em' }}>Reach people in their flow.</h2>
            <p style={{ marginTop: 16, fontSize: 18, color: '#a8a8b8', lineHeight: 1.6, maxWidth: 560 }}>Your product appears at the exact moment someone is solving a related problem, matched by on-device context, never by surveillance. High intent, fraud-filtered, and genuinely welcomed because it pays the creator too.</p>
          </div>
          <div data-reveal style={{ marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 }}>
            {ADV_STATS.map((s) => (
              <div key={s.v} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: 26, background: 'rgba(255,255,255,.03)' }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 38, fontWeight: 600, letterSpacing: '-.02em', color: '#fff' }}>{s.v}</div>
                <div style={{ marginTop: 6, fontSize: 14, color: '#a8a8b8' }}>{s.d}</div>
              </div>
            ))}
          </div>
          <div data-reveal style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center' }}>
            <div style={{ flex: '1 1 340px', minWidth: 300 }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', color: '#fff' }}>Launch a campaign in minutes.</h3>
              <p style={{ marginTop: 12, fontSize: 16, color: '#a8a8b8', lineHeight: 1.6, maxWidth: 460 }}>Pick a topic, set a budget, and your ad appears the moment someone hits a matching wait-state. Reserve your category now and lock in <b style={{ color: '#fff' }}>founding-advertiser rates</b>. No agency, no insertion order.</p>
              <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                {['Self-serve dashboard', 'Fraud-filtered impressions', 'Pay per real view'].map((t) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399' }} />{t}</span>
                ))}
              </div>
              <a href="/advertiser/campaigns/new" className="ld-btn-white" style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#0f1729', background: '#fff', textDecoration: 'none', padding: '14px 26px', borderRadius: 13, transition: '.18s' }}>Launch a campaign →</a>
            </div>
            <div style={{ flex: '1 1 360px', minWidth: 300 }}>
              <div style={{ border: '1px solid rgba(255,255,255,.12)', borderRadius: 18, background: '#020617', overflow: 'hidden', boxShadow: '0 30px 70px -34px rgba(0,0,0,.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f87171' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#fbbf24' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#34d399' }} />
                  <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 12, color: '#64748b' }}>prism · campaigns / new</span>
                </div>
                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#64748b', marginBottom: 7 }}>Target context</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: '#a78bfa', background: 'rgba(139,92,246,.14)', border: '1px solid rgba(139,92,246,.4)', borderRadius: 8, padding: '5px 10px' }}>topic: finance</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: '#a78bfa', background: 'rgba(139,92,246,.14)', border: '1px solid rgba(139,92,246,.4)', borderRadius: 8, padding: '5px 10px' }}>task: writing</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: '#64748b', border: '1px dashed rgba(255,255,255,.2)', borderRadius: 8, padding: '5px 10px' }}>+ add</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#64748b' }}>Daily budget</span><span style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, color: '#fff' }}>$120 / day</span></div>
                    <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}><div style={{ width: '46%', height: '100%', background: 'linear-gradient(90deg,#8b5cf6,#7c3aed)' }} /></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '14px 16px' }}>
                    <div><div style={{ fontSize: 11, color: '#94a3b8', fontFamily: MONO }}>DELIVERY</div><div style={{ marginTop: 3, fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: '#fff' }}>Real views only</div></div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f1729', background: '#34d399', borderRadius: 9, padding: '8px 14px' }}>Launch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: '#fafafa' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '96px 24px' }}>
          <div data-reveal style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={eyebrow('#7c3aed')}>FAQ</div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,42px)', fontWeight: 600, letterSpacing: '-.02em', color: '#0f1729' }}>Questions, answered</h2>
          </div>
          <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((item, i) => {
              const open = faq === i
              return (
                <div key={item.q} style={{ background: '#fff', border: '1px solid #e8ebf0', borderRadius: 16, overflow: 'hidden' }}>
                  <button onClick={() => setFaq(open ? -1 : i)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, fontFamily: 'var(--font-inter)', fontSize: 16, fontWeight: 600, color: '#0f1729' }}>
                    {item.q}<span style={{ flex: 'none', color: '#7c3aed', fontSize: 20, display: 'inline-block', transition: '.25s', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
                  </button>
                  <div style={{ maxHeight: open ? 220 : 0, opacity: open ? 1 : 0, overflow: 'hidden', transition: open ? 'max-height .4s ease,opacity .4s ease' : 'max-height .35s ease,opacity .25s ease' }}>
                    <p style={{ padding: '0 22px 20px', fontSize: 15, color: '#64748b', lineHeight: 1.6 }}>{item.a}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="waitlist" style={{ background: '#fff', borderTop: '1px solid #e8ebf0' }}>
        <div style={sectionWrap}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, background: '#0f0f17', padding: 'clamp(40px,6vw,72px)', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 90% at 50% 0%, rgba(124,58,237,.32), transparent 60%)', pointerEvents: 'none' }} />
            <div data-reveal style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><PrismLogo size={40} id="lgCta" /></div>
              <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4.5vw,48px)', fontWeight: 600, letterSpacing: '-.025em', color: '#fff', lineHeight: 1.08 }}>Get paid for every<br />AI wait.</h2>
              <p style={{ margin: '16px auto 0', maxWidth: 540, fontSize: 17, color: '#a8a8b8' }}>Build with AI and get paid for the wait, or put your product in front of the people who do. There&apos;s a path for both.</p>
              <div style={{ margin: '36px auto 0', maxWidth: 760, display: 'flex', flexWrap: 'wrap', gap: 18, textAlign: 'left' }}>
                <div style={{ flex: '1 1 320px', minWidth: 280, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: 26 }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: '#a78bfa' }}>For creators</div>
                  <h3 style={{ marginTop: 8, fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: '#fff' }}>Start earning</h3>
                  <p style={{ marginTop: 6, fontSize: 14, color: '#a8a8b8', lineHeight: 1.55 }}>Add Prism to the tools you already use and turn idle seconds into income.</p>
                  <button onClick={openModal} className="ld-btn-nav" style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: '#7c3aed', border: 'none', cursor: 'pointer', padding: '12px 22px', borderRadius: 12, transition: '.18s' }}>Start earning →</button>
                  <p style={{ marginTop: 10, fontSize: 11, color: '#64748b', fontFamily: MONO }}>Free · No credit card</p>
                </div>
                <div style={{ flex: '1 1 320px', minWidth: 280, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: '#a78bfa' }}>For advertisers</div>
                  <h3 style={{ marginTop: 8, fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: '#fff' }}>Advertise on Prism</h3>
                  <p style={{ marginTop: 6, fontSize: 14, color: '#a8a8b8', lineHeight: 1.55 }}>Reach high-intent people in their flow with contextual, fraud-filtered ads.</p>
                  <a href="#advertisers" className="ld-btn-white-sm" style={{ marginTop: 18, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: '#0f1729', background: '#fff', textDecoration: 'none', padding: '12px 22px', borderRadius: 12, transition: '.18s' }}>Advertise on Prism →</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <LandingFooter linkBase="" />

      {/* GET-STARTED MODAL */}
      {modal && <GetStartedModal onClose={closeModal} onSubmit={startOnboarding} />}
    </div>
  )
}

function GetStartedModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,15,23,.6)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: 24, maxWidth: 420, width: '100%', padding: 36, boxShadow: '0 50px 110px -30px rgba(15,23,41,.5)' }}>
        <button onClick={onClose} aria-label="Close" className="ld-modal-close" style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, border: 'none', background: '#f1f0f5', borderRadius: 9, cursor: 'pointer', color: '#64748b', fontSize: 15, lineHeight: 1, transition: '.18s' }}>✕</button>
        <PrismLogo size={38} id="lgModal" />
        <h3 style={{ marginTop: 18, fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', color: '#0f1729' }}>Get started with Prism</h3>
        <p style={{ marginTop: 8, fontSize: 15, color: '#64748b', lineHeight: 1.55 }}>Enter your email and we&apos;ll send your invite plus the one-click setup link for your tools.</p>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
          <input ref={inputRef} type="email" required placeholder="you@domain.com" style={{ marginTop: 20, width: '100%', background: '#fafafa', border: '1px solid #e8ebf0', borderRadius: 13, padding: '14px 16px', color: '#0f1729', fontSize: 15, fontFamily: 'var(--font-inter)', outline: 'none' }} />
          <button type="submit" className="ld-btn-primary" style={{ marginTop: 12, width: '100%', fontSize: 15, fontWeight: 600, color: '#fff', background: '#7c3aed', border: 'none', cursor: 'pointer', padding: 14, borderRadius: 13, transition: '.18s', boxShadow: '0 10px 26px -10px rgba(124,58,237,.7)' }}>Get my invite</button>
        </form>
        <p style={{ marginTop: 14, fontSize: 11, color: '#94a3b8', fontFamily: MONO, textAlign: 'center' }}>Free · No credit card · Cash out straight to your bank</p>
      </div>
    </div>
  )
}
