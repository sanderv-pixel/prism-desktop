'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'

type Os = 'mac' | 'windows'

const COMMAND: Record<Os, string> = {
  mac: 'curl -fsSL https://goprism.dev/install.sh | sh',
  windows: 'irm https://goprism.dev/install.ps1 | iex',
}

const OS_LABEL: Record<Os, string> = {
  mac: 'macOS',
  windows: 'Windows',
}

const STEPS = [
  { n: 1, label: 'Run it' },
  { n: 2, label: 'Allow access once' },
  { n: 3, label: 'Connect & earn' },
]

export function InstallCard() {
  const [os, setOs] = useState<Os>('mac')
  const [copied, setCopied] = useState(false)

  // Best-effort OS detection; the toggle lets the user override.
  useEffect(() => {
    const ua = `${navigator.userAgent} ${navigator.platform}`
    if (/win/i.test(ua)) setOs('windows')
  }, [])

  const command = COMMAND[os]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-white/70 backdrop-blur-sm shadow-lg shadow-black/[0.03] p-4 sm:p-5 text-left">
      {/* OS toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick install
        </span>
        <div className="inline-flex rounded-lg bg-muted p-0.5">
          {(['mac', 'windows'] as Os[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setOs(id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                os === id
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {OS_LABEL[id]}
            </button>
          ))}
        </div>
      </div>

      {/* Command line */}
      <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-mono text-sm">
        <span className="select-none text-violet-400">$</span>
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-slate-100 [scrollbar-width:none]">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy install command"
          className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          {copied ? (
            <Check size={16} className="text-emerald-400" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>

      {/* Download alternative (macOS ready today) */}
      {os === 'mac' && (
        <a
          href="/download/PrismOverlay.zip"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-violet-700 transition-colors"
        >
          <Download size={15} />
          or download for macOS
        </a>
      )}
      {os === 'windows' && (
        <p className="mt-3 text-xs text-muted-foreground">
          Run in PowerShell. Windows build is in early access.
        </p>
      )}

      {/* What happens next */}
      <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 border-t border-border pt-4">
        {STEPS.map((step, i) => (
          <div key={step.n} className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-primary">
              {step.n}
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 hidden text-border sm:inline" aria-hidden="true">
                ·
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
