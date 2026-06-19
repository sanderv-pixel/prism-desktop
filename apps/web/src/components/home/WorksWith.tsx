'use client'

import { SectionHeader } from '@/components/SectionHeader'
import { Button } from '@/components/Button'
import { siCursor, siClaude } from 'simple-icons'
import { Code2 } from 'lucide-react'

const supported = [
  {
    name: 'VS Code',
    svg: (
      <svg viewBox="0 0 24 24" fill="#007ACC" className="w-7 h-7" aria-hidden="true">
        <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
      </svg>
    ),
  },
  {
    name: 'Cursor',
    svg: (
      <svg viewBox="0 0 24 24" fill={`#${siCursor.hex}`} className="w-7 h-7" aria-hidden="true">
        <path d={siCursor.path} />
      </svg>
    ),
  },
  {
    name: 'Codex',
    svg: <Code2 size={28} className="text-primary" />,
  },
  {
    name: 'Claude Code',
    svg: (
      <svg viewBox="0 0 24 24" fill={`#${siClaude.hex}`} className="w-7 h-7" aria-hidden="true">
        <path d={siClaude.path} />
      </svg>
    ),
  },
]

const comingSoon = [
  'ChatGPT',
  'Perplexity',
  'Gemini',
  'Windsurf',
  'Bolt',
  'Replit Agent',
]

export function WorksWith() {
  return (
    <section className="section-padding bg-muted/30 border-y border-border">
      <div className="container-tight px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Works where you work"
          title="Install Prism in the tools you already use"
          description="Available today for VS Code, Cursor, Codex, and Claude Code. More Ai tools coming soon."
        />

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Supported tools */}
          <div className="premium-card p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">
              Available now
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {supported.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border hover:border-primary/20 transition"
                >
                  {tool.svg}
                  <span className="font-semibold text-foreground">{tool.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coming soon */}
          <div className="premium-card p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">
              Coming soon
            </h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {comingSoon.map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1.5 rounded-full bg-muted border border-border text-sm text-muted-foreground"
                >
                  {tool}
                </span>
              ))}
            </div>

            <div className="p-5 rounded-xl bg-violet-50/50 border border-violet-100">
              <p className="text-sm font-medium text-foreground mb-4">
                Want Prism on another tool?
              </p>
              <Button href="/contact" variant="outline" size="sm">
                Request support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
