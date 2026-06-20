'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Download, ArrowRight, Terminal } from 'lucide-react'

type Os = 'mac' | 'windows'

const COMMAND: Record<Os, string> = {
  mac: 'curl -fsSL https://goprism.dev/install.sh | sh',
  windows: 'irm https://goprism.dev/install.ps1 | iex',
}

export function InstallCard() {
  const [os, setOs] = useState<Os>('mac')
  const [copied, setCopied] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)

  // Best-effort OS detection.
  useEffect(() => {
    if (/win/i.test(`${navigator.userAgent} ${navigator.platform}`)) setOs('windows')
  }, [])

  const command = COMMAND[os]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable, ignore */
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* One clear primary action */}
      <a
        href={os === 'mac' ? '/download/PrismOverlay.zip' : '/onboarding'}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]"
      >
        <Download size={18} />
        {os === 'mac' ? 'Download for macOS' : 'Get the Windows build'}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </a>

      {/* Quiet secondary line: reassurance + terminal escape hatch */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground lg:justify-start">
        <span>Free, signed, uninstall anytime</span>
        <span className="text-border" aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => setShowTerminal((v) => !v)}
          className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors"
        >
          <Terminal size={12} />
          {showTerminal ? 'Hide command' : 'Install via terminal'}
        </button>
      </div>

      {showTerminal && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-mono text-sm">
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
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
      )}
    </div>
  )
}
