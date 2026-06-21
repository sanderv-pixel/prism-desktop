import type { CSSProperties } from 'react'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { CopyCommand } from '@/components/install/CopyCommand'

export const metadata = {
  title: 'Install Prism',
  description: 'Install Prism on your Mac in one line. Earn while your AI thinks, across Claude, Cursor, Codex, and your terminal.',
}

const DISPLAY = 'var(--font-display), sans-serif'
const MONO = 'var(--font-mono), monospace'

const eyebrow: CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.16em', color: '#7c3aed', marginBottom: 14 }
const stepNum: CSSProperties = { flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: '#7c3aed', color: '#fff', fontFamily: MONO, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const stepTitle: CSSProperties = { fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, color: '#0f1729', letterSpacing: '-.01em' }
const stepBody: CSSProperties = { marginTop: 6, fontSize: 15, color: '#475569', lineHeight: 1.6 }

const STEPS = [
  ['Enable Prism', 'In the window that opens, click Enable and switch on “PrismOverlay”. That’s the one permission it needs. It only reads the macOS Accessibility tree to place the line, and never touches your AI.'],
  ['Connect your account', 'Click Connect account. Your browser opens to sign in or create a free account, nothing to copy or paste. The app links itself automatically.'],
  ['Start earning', 'A small sponsored line appears next to your AI’s activity while it thinks, only then, never otherwise. Every viewed second pays you, straight to your dashboard.'],
]

export default function InstallPage() {
  return (
    <div style={{ background: '#fafafa', color: '#0f1729', overflowX: 'hidden' }}>
      <LandingNav linkBase="/" />

      <header style={{ background: 'radial-gradient(70% 60% at 70% 0%, rgba(124,58,237,.10), transparent 60%)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 24px 8px' }}>
          <div style={eyebrow}>Install · macOS</div>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 'clamp(34px,5vw,52px)', fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1.05, color: '#0f1729' }}>Up and running in a minute.</h1>
          <p style={{ marginTop: 18, maxWidth: 560, fontSize: 18, color: '#475569', lineHeight: 1.62 }}>Paste one line, grant one permission, sign in. Then earn while your AI thinks, across Claude, Cursor, Codex, and your terminal.</p>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Step 1: the command */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
          <div style={stepNum}>1</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={stepTitle}>Paste this in Terminal, or your favorite coding agent</div>
            <p style={stepBody}>It downloads Prism, installs it to your Applications, and launches it.</p>
            <div style={{ marginTop: 14 }}>
              <CopyCommand command="curl -fsSL https://goprism.dev/install.sh | sh" />
            </div>
            <p style={{ marginTop: 10, fontSize: 12.5, color: '#94a3b8' }}>Open Terminal (⌘+Space → “Terminal”), paste, press Return. Or just hand it to your coding agent and let it run.</p>
          </div>
        </div>

        {STEPS.map(([title, body], i) => (
          <div key={title} style={{ display: 'flex', gap: 16, marginBottom: i === STEPS.length - 1 ? 8 : 40 }}>
            <div style={stepNum}>{i + 2}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={stepTitle}>{title}</div>
              <p style={stepBody}>{body}</p>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 48, padding: '20px 22px', background: '#fff', border: '1px solid #e8ebf0', borderRadius: 14, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: '#0f1729' }}>Private by design.</span> Prism reads the Accessibility tree only to know when your AI is working and where to place the line. It never reads your prompts, never modifies your tools, and shows nothing unless an ad clears. Free, with payouts straight to your bank.
        </div>

        <p style={{ marginTop: 22, fontSize: 13, color: '#94a3b8' }}>
          Prefer to remove it? <code style={{ fontFamily: MONO, fontSize: 12.5, color: '#64748b' }}>curl -fsSL https://goprism.dev/uninstall.sh | sh</code>
        </p>
      </main>

      <LandingFooter linkBase="/" />
    </div>
  )
}
