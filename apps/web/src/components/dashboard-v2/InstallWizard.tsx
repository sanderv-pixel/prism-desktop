'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Monitor, X, Check, Loader2, Copy, Terminal } from 'lucide-react'
import type { DeviceInfo } from './DevicesCard'

const INSTALL_CMD = 'curl -fsSL https://goprism.dev/install.sh | sh'

interface InstallWizardProps {
  onClose: () => void
  /** Called once a non-revoked device shows up, so the dashboard can refresh. */
  onConnected: () => void
}

/**
 * Auto-launched on the earner dashboard when no device is connected. Walks a new
 * user through the one-line curl install (the app is unsigned/ad-hoc since there is
 * no Apple Developer ID, so distribution is via curl + the install script strips
 * quarantine), then polls for the device and advances itself the moment it connects.
 */
export function InstallWizard({ onClose, onConnected }: InstallWizardProps) {
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/devices')
      if (!res.ok) return
      const list: DeviceInfo[] = (await res.json()).devices ?? []
      if (list.some((d) => !d.revoked)) setConnected(true)
    } catch {
      // Network blip; the next tick retries.
    }
  }, [])

  // Poll for a connected device while the wizard is open.
  useEffect(() => {
    if (connected) return
    poll()
    const id = setInterval(poll, 4000)
    return () => clearInterval(id)
  }, [poll, connected])

  // Show the success state briefly, then hand back to the dashboard.
  useEffect(() => {
    if (!connected) return
    const t = setTimeout(onConnected, 1800)
    return () => clearTimeout(t)
  }, [connected, onConnected])

  async function copy() {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked; the user can still select the text manually.
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button style={closeBtn} onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {connected ? (
          <div style={{ textAlign: 'center', padding: '28px 8px 12px' }}>
            <div style={{ ...badge, background: 'rgba(52,211,153,.16)', color: '#6ee7b7' }}>
              <Check size={30} />
            </div>
            <h2 style={title}>Device connected</h2>
            <p style={sub}>You are all set. Prism will start earning whenever your AI is thinking.</p>
          </div>
        ) : (
          <>
            <div style={badge}>
              <Monitor size={24} />
            </div>
            <h2 style={title}>Connect your Mac</h2>
            <p style={sub}>
              Install Prism to start earning while your AI thinks. About a minute, and no
              App Store or signed installer needed.
            </p>

            <p style={stepLabel}>1 · Paste this in Terminal</p>
            <div style={cmdBox}>
              <Terminal size={15} style={{ color: '#8b5cf6', flex: 'none' }} />
              <code style={cmdText}>{INSTALL_CMD}</code>
              <button style={copyBtn} onClick={copy} aria-label="Copy command">
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={hint}>
              Open Terminal (⌘+Space, type “Terminal”), paste, press Return. It downloads and
              installs Prism, no Apple ID required. Or hand the line to your coding agent.
            </p>

            <p style={stepLabel}>2 · Grant access &amp; connect</p>
            <p style={hint}>
              When the app opens, switch on “PrismOverlay” in the permission window, then click
              <b style={{ color: '#cbd2e0' }}> Connect account</b>. Since you are already signed in
              here, it links to this account automatically.
            </p>

            <div style={waitBox}>
              <Loader2 size={16} className="animate-spin" style={{ flex: 'none' }} />
              Waiting for your device to connect…
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(6,8,15,.66)',
  backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const modal: CSSProperties = {
  position: 'relative', width: '100%', maxWidth: 460, background: '#12151d',
  border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, padding: '28px 26px 24px',
  boxShadow: '0 30px 80px rgba(0,0,0,.55)',
}
const closeBtn: CSSProperties = {
  position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.08)', color: '#9aa1b1', cursor: 'pointer',
}
const badge: CSSProperties = {
  width: 48, height: 48, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(139,92,246,.16)', color: '#a78bfa', marginBottom: 16,
}
const title: CSSProperties = { margin: 0, fontSize: 21, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display), sans-serif' }
const sub: CSSProperties = { margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, color: '#9aa1b1' }
const stepLabel: CSSProperties = { margin: '22px 0 8px', fontSize: 12.5, fontWeight: 600, color: '#cbd2e0', letterSpacing: '.01em' }
const cmdBox: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, background: '#0b0d13',
  border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '11px 12px',
}
const cmdText: CSSProperties = {
  flex: 1, minWidth: 0, overflowX: 'auto', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono), monospace',
  fontSize: 12.5, color: '#e6e9f0',
}
const copyBtn: CSSProperties = {
  flex: 'none', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8,
  background: '#7c3aed', color: '#fff', border: 0, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
}
const hint: CSSProperties = { margin: '9px 0 0', fontSize: 12.5, lineHeight: 1.55, color: '#7a8294' }
const waitBox: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, marginTop: 22, padding: '11px 13px', borderRadius: 10,
  background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.18)', color: '#b9aef0',
  fontSize: 13, fontWeight: 500,
}
