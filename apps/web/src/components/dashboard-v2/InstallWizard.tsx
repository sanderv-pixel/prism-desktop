'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Monitor, X, Check, Loader2, Copy, Terminal, Sparkles } from 'lucide-react'
import type { DeviceInfo } from './DevicesCard'

type Os = 'mac' | 'windows'

const COMMAND: Record<Os, string> = {
  mac: 'curl -fsSL https://goprism.dev/install.sh | sh',
  windows: 'irm https://goprism.dev/install.ps1 | iex',
}

// Self-contained instruction the user can hand to their AI coding agent (Claude Code,
// Cursor, Codex, ...) so it installs Prism for them. Straight quotes so it pastes clean.
const AGENT_PROMPT: Record<Os, string> = {
  mac: `Install the Prism macOS app for me. Run this in my terminal:

curl -fsSL https://goprism.dev/install.sh | sh

It is a one-line installer that downloads the Prism overlay into /Applications and launches it. The app is unsigned (ad-hoc, there is no Apple Developer ID) and the script already strips the macOS quarantine attribute, so no extra Gatekeeper steps are needed. After it runs, tell me to enable "PrismOverlay" under System Settings > Privacy & Security > Accessibility, then click "Connect account" in the app to link it to my Prism account.`,
  windows: `Install the Prism Windows app for me. Run this in PowerShell:

irm https://goprism.dev/install.ps1 | iex

It is a one-line installer that downloads PrismOverlay.exe into %LOCALAPPDATA%\\Prism, unblocks it so SmartScreen does not nag, sets it to launch at login, and runs it. No admin rights and no .NET install are needed (the exe is self-contained). After it runs, tell me that Prism is now in the Windows system tray and I should click "Connect account" to link it to my Prism account.`,
}

const OS_COPY: Record<Os, { device: string; intro: string; cmdHint: string; step2Label: string; step2: string }> = {
  mac: {
    device: 'Connect your Mac',
    intro: 'Install Prism to start earning while your AI thinks. About a minute, and no App Store or signed installer needed.',
    cmdHint: 'Open Terminal (⌘+Space, type “Terminal”), paste, press Return. It downloads and installs Prism, no Apple ID required.',
    step2Label: '2 · Grant access & connect',
    step2: 'When the app opens, switch on “PrismOverlay” in the permission window, then click Connect account. Since you are already signed in here, it links to this account automatically.',
  },
  windows: {
    device: 'Connect your Windows PC',
    intro: 'Install Prism to start earning while your AI thinks. About a minute, and no admin rights or .NET install needed.',
    cmdHint: 'Open PowerShell (Win+X, then “Terminal” or “Windows PowerShell”), paste, press Enter. It downloads and runs Prism, no admin required.',
    step2Label: '2 · Open & connect',
    step2: 'Prism appears in your Windows system tray. If SmartScreen warns, click “More info”, then “Run anyway” (the installer already unblocks it). Click Connect account to link this account; since you are signed in here, it links automatically.',
  },
}

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
  const [mode, setMode] = useState<'command' | 'prompt'>('command')
  const [os, setOs] = useState<Os>('mac')

  // Best-effort OS detection (default macOS; correct to Windows on the client).
  useEffect(() => {
    if (/win/i.test(`${navigator.userAgent} ${navigator.platform}`)) setOs('windows')
  }, [])

  const cmd = COMMAND[os]
  const agentPrompt = AGENT_PROMPT[os]
  const cp = OS_COPY[os]

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
      await navigator.clipboard.writeText(mode === 'command' ? cmd : agentPrompt)
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
            <h2 style={title}>{cp.device}</h2>
            <p style={sub}>{cp.intro}</p>

            <p style={stepLabel}>1 · Install Prism</p>
            <div style={tabRow}>
              <button type="button" style={mode === 'command' ? tabActive : tab} onClick={() => setMode('command')}>
                <Terminal size={13} /> Terminal command
              </button>
              <button type="button" style={mode === 'prompt' ? tabActive : tab} onClick={() => setMode('prompt')}>
                <Sparkles size={13} /> AI agent prompt
              </button>
            </div>

            {mode === 'command' ? (
              <>
                <div style={cmdBox}>
                  <code style={cmdText}>{cmd}</code>
                  <button style={copyBtn} onClick={copy} aria-label="Copy command">
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p style={hint}>{cp.cmdHint}</p>
              </>
            ) : (
              <>
                <div style={promptBox}>
                  <pre style={promptText}>{agentPrompt}</pre>
                  <button style={{ ...copyBtn, alignSelf: 'flex-start' }} onClick={copy} aria-label="Copy prompt">
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p style={hint}>
                  Paste this into your AI coding agent (Claude Code, Cursor, Codex…) and it installs
                  Prism for you, no Terminal needed.
                </p>
              </>
            )}

            <p style={stepLabel}>{cp.step2Label}</p>
            <p style={hint}>{cp.step2}</p>

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
const tabRow: CSSProperties = {
  display: 'flex', gap: 6, marginBottom: 11, background: '#0b0d13',
  border: '1px solid rgba(255,255,255,.08)', borderRadius: 9, padding: 3,
}
const tabBase: CSSProperties = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 6px',
  borderRadius: 6, border: 0, background: 'transparent', color: '#8a92a3', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
}
const tab = tabBase
const tabActive: CSSProperties = { ...tabBase, background: '#23272f', color: '#fff' }
const promptBox: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10, background: '#0b0d13',
  border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '11px 12px',
}
const promptText: CSSProperties = {
  flex: 1, minWidth: 0, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  fontFamily: 'var(--font-mono), monospace', fontSize: 11.5, lineHeight: 1.5, color: '#cbd2e0',
  maxHeight: 168, overflowY: 'auto',
}
const hint: CSSProperties = { margin: '9px 0 0', fontSize: 12.5, lineHeight: 1.55, color: '#7a8294' }
const waitBox: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, marginTop: 22, padding: '11px 13px', borderRadius: 10,
  background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.18)', color: '#b9aef0',
  fontSize: 13, fontWeight: 500,
}
