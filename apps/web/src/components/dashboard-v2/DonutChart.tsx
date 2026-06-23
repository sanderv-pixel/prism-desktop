'use client'

import { useEffect, useState } from 'react'

export interface DonutSlice {
  name: string
  value: number
  display: string
}

interface DonutChartProps {
  data: DonutSlice[]
  emptyLabel?: string
  centerLabel?: string
}

const PALETTE = ['#8b5cf6', '#22d3ee', '#ec4899', '#34d399', '#fbbf24', '#a78bfa']

/** Earnings/share-by-category donut. Custom SVG to match AreaChartV2's look. */
export function DonutChart({ data, emptyLabel = 'No data yet', centerLabel = 'Total' }: DonutChartProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShow(true)
      return
    }
    const id = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(id)
  }, [data])

  const slices = data.filter((d) => d.value > 0)
  const total = slices.reduce((s, d) => s + d.value, 0)

  if (!slices.length || total <= 0) {
    return <div className="dv-empty">{emptyLabel}</div>
  }

  const size = 160
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2

  let cursor = 0
  const arcs = slices.map((d, i) => {
    const len = (d.value / total) * c
    const rotation = (cursor / c) * 360
    cursor += len
    return { color: PALETTE[i % PALETTE.length], dash: len, rotation }
  })

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }} role="img" aria-label="Earnings by tool">
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeDasharray={`${show ? a.dash : 0} ${c}`}
              transform={`rotate(${a.rotation} ${cx} ${cx})`}
              style={{ transition: 'stroke-dasharray .85s cubic-bezier(.22,1,.36,1)' }}
            />
          ))}
        </g>
        <text x="50%" y="46%" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700" fontFamily="var(--font-display), sans-serif">
          ${total.toFixed(2)}
        </text>
        <text x="50%" y="59%" textAnchor="middle" fill="var(--mut)" fontSize="11">
          {centerLabel}
        </text>
      </svg>

      <div style={{ flex: 1, minWidth: 150, display: 'grid', gap: 9 }}>
        {slices.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: PALETTE[i % PALETTE.length], flex: 'none' }} />
            <span style={{ flex: 1, color: '#e2e8f0', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {d.name}
            </span>
            <span style={{ color: 'var(--mut)', fontSize: 12, minWidth: 30, textAlign: 'right' }}>
              {Math.round((d.value / total) * 100)}%
            </span>
            <span style={{ color: '#fff', fontWeight: 600, minWidth: 54, textAlign: 'right' }}>{d.display}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
