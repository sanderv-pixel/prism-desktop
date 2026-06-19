'use client'

import { useState } from 'react'
import { Check, Copy, Code2, Terminal, Monitor, Sparkles } from 'lucide-react'

type Os = 'mac' | 'windows'
type AiTool = 'claude' | 'codex'
type EditorId = 'vscode' | 'cursor' | 'terminal' | 'desktop'

const AI_TOOLS: { id: AiTool; label: string }[] = [
  { id: 'claude', label: 'Claude' },
  { id: 'codex', label: 'Codex' },
]

const OS_LABELS: Record<Os, string> = {
  mac: 'macOS / Linux / WSL',
  windows: 'Windows',
}

const OS_PROMPT: Record<Os, string> = {
  mac: '$',
  windows: '>',
}

const EDITORS: {
  id: EditorId
  label: string
  icon: React.ElementType
  soon?: boolean
}[] = [
  { id: 'vscode', label: 'VS Code', icon: Code2 },
  { id: 'cursor', label: 'Cursor', icon: Sparkles },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'desktop', label: 'Desktop app', icon: Monitor, soon: true },
]

const COMMANDS: Record<
  AiTool,
  Partial<Record<EditorId, Record<Os, string>>>
> = {
  claude: {
    vscode: {
      mac: 'curl -fsSL https://goprism.dev/install.sh | bash',
      windows: 'irm https://goprism.dev/install.ps1 | iex',
    },
    cursor: {
      mac: 'curl -fsSL https://goprism.dev/install.sh | bash -s -- --cursor',
      windows:
        '& ([scriptblock]::Create((irm https://goprism.dev/install.ps1))) -Cursor',
    },
    terminal: {
      mac: 'curl -fsSL https://goprism.dev/install-terminal.sh | bash',
      windows: 'curl -fsSL https://goprism.dev/install-terminal.sh | bash',
    },
  },
  codex: {
    vscode: {
      mac: 'curl -fsSL https://goprism.dev/install.sh | bash',
      windows: 'irm https://goprism.dev/install.ps1 | iex',
    },
    cursor: {
      mac: 'curl -fsSL https://goprism.dev/install.sh | bash -s -- --cursor',
      windows:
        '& ([scriptblock]::Create((irm https://goprism.dev/install.ps1))) -Cursor',
    },
  },
}

export function InstallCommand() {
  const [activeAi, setActiveAi] = useState<AiTool>('claude')
  const [activeEditor, setActiveEditor] = useState<EditorId>('vscode')
  const [activeOs, setActiveOs] = useState<Os>('mac')
  const [copied, setCopied] = useState(false)

  const command = COMMANDS[activeAi][activeEditor]?.[activeOs]
  const unavailable =
    activeEditor === 'desktop'
      ? 'Desktop app support is coming soon.'
      : activeAi === 'codex' && activeEditor === 'terminal'
        ? 'Codex terminal support is coming soon.'
        : undefined

  async function copy() {
    if (!command) return
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
    <div className="w-full max-w-3xl mx-auto">
      {/* AI tool selector */}
      <div className="flex items-center justify-center gap-1 rounded-full border border-border bg-muted/40 p-1 w-fit mx-auto mb-4">
        {AI_TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              setActiveAi(tool.id)
              setCopied(false)
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              activeAi === tool.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {EDITORS.map((editor) => {
          const Icon = editor.icon
          const active = activeEditor === editor.id
          return (
            <button
              key={editor.id}
              onClick={() => {
                setActiveEditor(editor.id)
                setCopied(false)
              }}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border px-4 py-4 transition text-sm font-medium ${
                active
                  ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                  : 'border-border bg-white/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <Icon size={22} />
              <span>{editor.label}</span>
              {editor.soon && (
                <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* OS selector */}
      <div className="flex items-center justify-center gap-2 mb-5">
        {(Object.keys(OS_LABELS) as Os[]).map((os) => (
          <button
            key={os}
            onClick={() => {
              setActiveOs(os)
              setCopied(false)
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              activeOs === os
                ? 'bg-violet-50 border-violet-200 text-primary'
                : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {OS_LABELS[os]}
          </button>
        ))}
      </div>

      {/* Command box */}
      <div className="relative group">
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 pr-12 text-left font-mono text-sm shadow-sm ${
            command
              ? 'border-border bg-slate-950 text-slate-50'
              : 'border-dashed border-border bg-muted/30 text-muted-foreground'
          }`}
        >
          <span className={command ? 'text-slate-400' : 'text-muted-foreground'}>
            {OS_PROMPT[activeOs]}
          </span>
          <span className="truncate">{command ?? unavailable}</span>
        </div>

        <button
          onClick={copy}
          disabled={!command}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${
            command
              ? 'text-slate-400 hover:text-white hover:bg-white/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          aria-label="Copy install command"
          title="Copy"
        >
          {copied ? (
            <Check size={16} className="text-emerald-500" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>
    </div>
  )
}
