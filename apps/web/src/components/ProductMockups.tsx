'use client'

import { useState } from 'react'
import { SectionHeader } from '@/components/SectionHeader'
import { CursorMockup } from '@/components/mockups/CursorMockup'
import { ClaudeCodeMockup } from '@/components/mockups/ClaudeCodeMockup'
import { ChatMockup } from '@/components/mockups/ChatMockup'
import { ExtensionPopupMockup } from '@/components/mockups/ExtensionPopupMockup'
import { cn } from '@/lib/cn'

const tabs = [
  {
    id: 'cursor',
    label: 'VS Code / Cursor',
    description: 'A tiny ad line in the status bar while the AI agent works.',
    component: CursorMockup,
  },
  {
    id: 'claude',
    label: 'Claude Code',
    description: 'Status-line placement in terminal AI workflows.',
    component: ClaudeCodeMockup,
  },
  {
    id: 'chat',
    label: 'Web AI tools',
    description: 'Subtle placement below ChatGPT, Claude, or Perplexity responses.',
    component: ChatMockup,
  },
  {
    id: 'popup',
    label: 'Extension',
    description: 'One-click controls for balance, payouts, and preferences.',
    component: ExtensionPopupMockup,
  },
]

export function ProductMockups() {
  const [active, setActive] = useState('cursor')
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0]
  const ActiveComponent = activeTab.component

  return (
    <section className="section-padding relative bg-white">
      <div className="container-tight">
        <SectionHeader
          eyebrow="Product"
          title="One line. Every AI workflow."
          description="Prism lives in the natural pauses of the tools you already use."
        />

        {/* Tabs */}
        <div className="flex flex-nowrap justify-start sm:justify-center gap-2 mb-8 sm:mb-10 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all border whitespace-nowrap shrink-0',
                active === tab.id
                  ? 'bg-violet-50 border-violet-200 text-primary'
                  : 'bg-white border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mockup */}
        <div className="relative overflow-hidden">
          <div className="absolute -inset-4 bg-gradient-to-r from-violet-100/50 via-fuchsia-100/30 to-cyan-100/30 blur-3xl rounded-full" />
          <ActiveComponent className="relative" />
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6 max-w-md mx-auto">
          {activeTab.description}
        </p>
      </div>
    </section>
  )
}
