'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import '../v2/v2.css'
import { useAuth } from '@/hooks/useAuth'
import { V2Shell } from '@/components/v2/V2Shell'
import {
  ArrowRight,
  Monitor,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Sparkles,
  Shield,
} from 'lucide-react'

type Tool = 'vscode' | 'cursor' | 'claude'

interface InstallOption {
  id: Tool
  label: string
  shortLabel: string
  icon: React.ReactNode
  description: string
  command: string
  windowsCommand?: string
  manualHref: string
  steps: string[]
}

const INSTALL_OPTIONS: InstallOption[] = [
  {
    id: 'vscode',
    label: 'VS Code',
    shortLabel: 'VS Code',
    icon: <Monitor size={22} />,
    description: 'Show ads in your editor status bar while AI agents work.',
    command: 'curl -fsSL https://goprism.dev/install.sh | bash',
    windowsCommand: 'irm https://goprism.dev/install.ps1 | iex',
    manualHref: 'https://goprism.dev/prism-extension.vsix',
    steps: [
      'Open your terminal and run the install command.',
      'The script downloads and installs the Prism VS Code extension.',
      'Reload VS Code when prompted.',
      'Open the Command Palette, run Prism: Open dashboard to connect account, and sign in.',
    ],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    shortLabel: 'Cursor',
    icon: <Monitor size={22} />,
    description: 'Native Cursor integration for the AI coding workflow.',
    command: 'curl -fsSL https://goprism.dev/install.sh | bash -s -- --cursor',
    windowsCommand: '& ([scriptblock]::Create((irm https://goprism.dev/install.ps1))) -Cursor',
    manualHref: 'https://goprism.dev/prism-extension.vsix',
    steps: [
      'Open your terminal and run the Cursor install command.',
      'The script installs the Prism extension into Cursor.',
      'Reload Cursor when prompted.',
      'Open the Command Palette, run Prism: Open dashboard to connect account, and sign in.',
    ],
  },
  {
    id: 'claude',
    label: 'Claude Code (beta)',
    shortLabel: 'Claude Code',
    icon: <Terminal size={22} />,
    description: 'Status-line adapter for the Claude Code CLI.',
    command:
      'mkdir -p ~/.local/bin && curl -fsSL https://goprism.dev/claude-status.sh -o ~/.local/bin/prism-status.sh && chmod +x ~/.local/bin/prism-status.sh',
    manualHref: 'https://goprism.dev/claude-status.sh',
    steps: [
      'Run the command above to download the status-line adapter.',
      'Add it to your Claude Code config: ~/.claude/config.json',
      'Set PRISM_USER_ID to your Prism user ID from the dashboard if you want earnings attributed to your account.',
      'Restart Claude Code or run /refresh.',
    ],
  },
]

// Inject the one-time account link token into an install command so the device binds
// to this account on first launch. Handles shell pipes (| bash / | sh) and PowerShell
// (irm | iex, or the Cursor scriptblock form). Commands without an interpreter pipe
// (e.g. the Claude Code status-line script) are returned unchanged.
function withLinkToken(command: string, token: string | null): string {
  if (!token) return command
  if (command.startsWith('irm ') || command.startsWith('& (')) {
    return `$env:PRISM_LINK_TOKEN='${token}'; ${command}`
  }
  return command.replace(/\|\s*(bash|sh)\b/, `| PRISM_LINK_TOKEN=${token} $1`)
}

function InstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = command
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="v2code">
      <div className="cmd">
        <span className="p">$</span>
        <span className="t">{command}</span>
      </div>
      <button onClick={copy} className="cp" aria-label="Copy install command">
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  )
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [linkToken, setLinkToken] = useState<string | null>(null)

  // Once signed in, mint a one-time link token so the install command binds the new
  // device to this account automatically. Best-effort; falls back to an unlinked
  // command (anonymous self-register, linkable later from the dashboard).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/link/token', { method: 'POST' })
        if (!res.ok) return
        const { token } = await res.json()
        if (!cancelled && typeof token === 'string') setLinkToken(token)
      } catch {
        // Network blip - leave the command unlinked.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const selected = INSTALL_OPTIONS.find((t) => t.id === selectedTool)

  return (
    <V2Shell>
      <div className="v2ob">
        <div className="wrap">
          <div className="obhead">
            <span className="v2kicker">
              <Sparkles size={13} /> Start earning in minutes
            </span>
            <h1 className="obtitle">Install Prism</h1>
            <p className="obsub">
              Pick the AI tool you use most. One install, then you start earning
              from every AI wait state.
            </p>
          </div>

          {authLoading ? (
            <div className="obpanel" style={{ maxWidth: 520, textAlign: 'center' }}>
              <p style={{ color: 'var(--txt)' }}>Loading…</p>
            </div>
          ) : !user ? (
            <div
              className="obpanel"
              style={{ maxWidth: 520, textAlign: 'center', marginBottom: 36 }}
            >
              <div
                className="tcicon"
                style={{ width: 56, height: 56, margin: '0 auto 18px' }}
              >
                <Shield size={26} strokeWidth={1.5} />
              </div>
              <h2 className="v2title" style={{ fontSize: 20 }}>
                Create your free Prism account first
              </h2>
              <p className="v2sub" style={{ maxWidth: 380, margin: '8px auto 24px' }}>
                We need an account so we can pay you and let you manage your
                devices. It takes 30 seconds.
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 12,
                }}
              >
                <Link className="btn btn-p" href="/auth/sign-up?redirect=/onboarding">
                  Create account
                  <ArrowRight size={18} />
                </Link>
                <Link className="btn btn-g" href="/auth/sign-in?redirect=/onboarding">
                  Sign in
                </Link>
              </div>
            </div>
          ) : null}

          {!selected ? (
            <>
              <div className="toolgrid">
                {INSTALL_OPTIONS.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className="toolcard"
                  >
                    <div className="tcicon">{tool.icon}</div>
                    <h3>{tool.label}</h3>
                    <p>{tool.description}</p>
                  </button>
                ))}
              </div>

              <p className="obcardnote">
                Use ChatGPT, Perplexity, Gemini, or another tool?{' '}
                <Link href="/contact">Request support</Link>
              </p>
            </>
          ) : (
            <div className="obpanel">
              <button onClick={() => setSelectedTool(null)} className="obback">
                ← Back to options
              </button>

              <div className="obselhead">
                <div className="tcicon" style={{ marginBottom: 0 }}>
                  {selected.icon}
                </div>
                <div>
                  <h2>Install Prism for {selected.label}</h2>
                  <p>{selected.description}</p>
                </div>
              </div>

              <div>
                <label className="oblabel">Run this command in your terminal</label>
                <InstallCommand command={withLinkToken(selected.command, linkToken)} />

                {selected.windowsCommand && (
                  <>
                    <label className="oblabel">Windows PowerShell</label>
                    <InstallCommand command={withLinkToken(selected.windowsCommand, linkToken)} />
                  </>
                )}
              </div>

              <div className="stepbox">
                <h3>What happens next</h3>
                <ol>
                  {selected.steps.map((step, idx) => (
                    <li key={idx}>
                      <span className="sn">{idx + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="obactions">
                <a
                  className="btn btn-g"
                  href={selected.manualHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={18} />
                  Download .vsix manually
                </a>
                <Link className="btn btn-p" href="/dashboard">
                  <CheckCircle2 size={18} />
                  I installed it - go to dashboard
                </Link>
              </div>
            </div>
          )}

          <p className="obfoot">
            Not ready yet?{' '}
            <Link href="/developers">Learn more about how Prism works</Link>
          </p>
        </div>
      </div>
    </V2Shell>
  )
}
