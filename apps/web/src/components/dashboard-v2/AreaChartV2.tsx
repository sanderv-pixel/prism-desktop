'use client'

import { useEffect, useId, useRef } from 'react'

interface AreaChartV2Props {
  data: number[]
  /** Optional dashed average line. If omitted, a trailing 7-point avg is used. */
  avg?: number[]
  color1?: string
  color2?: string
  height?: number
  emptyLabel?: string
}

function trailingAvg(data: number[], window = 7): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = data.slice(start, i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

/**
 * Dependency-free SVG area chart matching the mock: gradient fill, a dashed
 * average line, and a draw-in animation on the main line (skipped for reduced
 * motion). Pure presentation, fed real series by the page.
 */
export function AreaChartV2({
  data,
  avg,
  color1 = '#8b5cf6',
  color2 = '#22d3ee',
  height = 200,
  emptyLabel = 'No data yet',
}: AreaChartV2Props) {
  const rawId = useId().replace(/:/g, '')
  const gradId = `dvgrad-${rawId}`
  const lineRef = useRef<SVGPolylineElement>(null)

  useEffect(() => {
    const pl = lineRef.current
    if (!pl) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const len = pl.getTotalLength()
    pl.style.strokeDasharray = String(len)
    pl.style.strokeDashoffset = String(len)
    // force reflow so the transition runs
    void pl.getBoundingClientRect()
    pl.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.22,1,.36,1)'
    pl.style.strokeDashoffset = '0'
  }, [data])

  if (!data || data.length < 2) {
    return (
      <div
        className="dv-empty"
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {emptyLabel}
      </div>
    )
  }

  const W = 560
  const H = 180
  const P = 24
  const avgSeries = avg && avg.length === data.length ? avg : trailingAvg(data)
  const max = Math.max(...data, ...avgSeries) * 1.15 || 1
  const x = (i: number) => P + (i * (W - 2 * P)) / (data.length - 1)
  const y = (v: number) => H - P - (v / max) * (H - 2 * P)

  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`
  const avgLine = avgSeries.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const grid = Array.from({ length: 4 }, (_, g) => {
    const gy = P + (g * (H - 2 * P)) / 3
    return (
      <line key={g} x1={P} y1={gy} x2={W - P} y2={gy} stroke="rgba(255,255,255,.05)" strokeWidth="1" />
    )
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color1} stopOpacity="0.35" />
          <stop offset="1" stopColor={color1} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid}
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        ref={lineRef}
        points={line}
        fill="none"
        stroke={color1}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={avgLine}
        fill="none"
        stroke={color2}
        strokeWidth="1.6"
        strokeDasharray="4 4"
        opacity="0.8"
      />
      {data.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.4" fill={color1} />
      ))}
    </svg>
  )
}
