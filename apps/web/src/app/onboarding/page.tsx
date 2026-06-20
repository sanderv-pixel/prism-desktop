'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/Button'
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
    <div className="relative group">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-4 pr-14 text-left font-mono text-sm text-foreground shadow-sm">
        <span className="text-muted-foreground select-none">$</span>
        <span className="truncate">{command}</span>
      </div>
      <button
        onClick={copy}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
        aria-label="Copy install command"
      >
        {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
      </button>
    </div>
  )
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)

  const selected = INSTALL_OPTIONS.find((t) => t.id === selectedTool)

  return (
    <section className="min-h-screen bg-muted/30 py-24 md:py-32">
      <div className="container-tight max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-100 px-4 py-1.5 mb-6">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary">
              Start earning in minutes
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold text-foreground mb-4">
            Install Prism
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pick the AI tool you use most. One install, then you start earning
            from every AI wait state.
          </p>
        </div>

        {authLoading ? (
          <div className="card rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Loading…</p>
          </div>
        ) : !user ? (
          <div className="card rounded-2xl p-8 md:p-10 text-center mb-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-violet-50 text-primary mb-5">
              <Shield size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Create your free Prism account first
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              We need an account so we can pay you and let you manage your
              devices. It takes 30 seconds.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button href="/auth/sign-up?redirect=/onboarding" size="lg">
                Create account
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button
                href="/auth/sign-in?redirect=/onboarding"
                size="lg"
                variant="outline"
              >
                Sign in
              </Button>
            </div>
          </div>
        ) : null}

        {!selected ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {INSTALL_OPTIONS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className="text-left card rounded-2xl p-6 hover:shadow-md transition group"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-primary mb-5 group-hover:scale-105 transition">
                    {tool.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {tool.label}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tool.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Use ChatGPT, Perplexity, Gemini, or another tool?{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  Request support
                </Link>
              </p>
            </div>
          </>
        ) : (
          <div className="card rounded-2xl p-8 md:p-10">
            <button
              onClick={() => setSelectedTool(null)}
              className="text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              ← Back to options
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-primary">
                {selected.icon}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Install Prism for {selected.label}
                </h2>
                <p className="text-muted-foreground">{selected.description}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-3">
                  Run this command in your terminal
                </label>
                <InstallCommand command={selected.command} />

                {selected.windowsCommand && (
                  <>
                    <label className="block text-sm font-medium text-foreground/80 mt-4 mb-3">
                      Windows PowerShell
                    </label>
                    <InstallCommand command={selected.windowsCommand} />
                  </>
                )}
              </div>

              <div className="bg-muted/50 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  What happens next
                </h3>
                <ol className="space-y-3">
                  {selected.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-primary text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-border">
                <Button
                  href={selected.manualHref}
                  size="lg"
                  variant="outline"
                  external
                >
                  <Download size={18} className="mr-2" />
                  Download .vsix manually
                </Button>
                <Button href="/dashboard" size="lg">
                  <CheckCircle2 size={18} className="mr-2" />
                  I installed it — go to dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-10">
          Not ready yet?{' '}
          <Link href="/developers" className="text-primary hover:text-violet-700">
            Learn more about how Prism works
          </Link>
        </p>
      </div>
    </section>
  )
}
