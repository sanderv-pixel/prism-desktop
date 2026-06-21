'use client'

import { useState } from 'react'

const MONO = 'var(--font-mono), ui-monospace, monospace'

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — the command is still selectable */
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#0f0f17',
        border: '1px solid #272733',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <code
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: MONO,
          fontSize: 13.5,
          color: '#e8ebf0',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: '#7c8190', userSelect: 'none' }}>$ </span>
        {command}
      </code>
      <button
        onClick={copy}
        style={{
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 600,
          color: copied ? '#34d399' : '#fff',
          background: copied ? 'rgba(52,211,153,.12)' : '#7c3aed',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 14px',
          borderRadius: 9,
          transition: '.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}
