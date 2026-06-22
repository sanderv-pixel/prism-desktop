'use client'

import { useEffect, useState } from 'react'

export interface BarRow {
  name: string
  value: number
  display: string
}

interface BarBreakdownProps {
  rows: BarRow[]
  variant?: 'violet' | 'cyan'
  emptyLabel?: string
}

/** Horizontal bars with a grow-in animation, normalized to the largest value. */
export function BarBreakdown({ rows, variant = 'violet', emptyLabel = 'No data yet' }: BarBreakdownProps) {
  const [grown, setGrown] = useState(false)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGrown(true)
      return
    }
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [rows])

  if (!rows.length) {
    return <div className="dv-empty">{emptyLabel}</div>
  }

  const max = Math.max(...rows.map((r) => r.value), 1)

  return (
    <div>
      {rows.map((row) => (
        <div className={`dv-bar${variant === 'cyan' ? ' cyan' : ''}`} key={row.name}>
          <span className="bn" title={row.name}>
            {row.name}
          </span>
          <span className="bt">
            <span
              className="bf"
              style={{ width: grown ? `${Math.round((row.value / max) * 100)}%` : '0%' }}
            />
          </span>
          <span className="bv">{row.display}</span>
        </div>
      ))}
    </div>
  )
}
