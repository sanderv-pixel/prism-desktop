'use client'

import { useEffect, useId, useRef, useState } from 'react'

export interface TooltipRow {
  label: string
  value: string
  color?: string
}

interface AreaChartV2Props {
  data: number[]
  /** Optional dashed average line. If omitted, a trailing 7-point avg is used. */
  avg?: number[]
  color1?: string
  color2?: string
  height?: number
  emptyLabel?: string
  /** x-axis labels (e.g. ISO dates) shown in the hover tooltip. */
  labels?: string[]
  /** Builds the tooltip rows for a hovered index (real values, decoupled from
   * the plotted series so scaled lines can still show true numbers). */
  tooltipRows?: (index: number) => TooltipRow[]
}

function trailingAvg(data: number[], window = 7): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = data.slice(start, i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

function formatLabel(s?: string): string {
  if (!s) return ''
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }
  return s
}

const W = 560
const H = 180
const P = 24

/**
 * Dependency-free SVG area chart: gradient fill, dashed average line, draw-in
 * animation, and an interactive hover tooltip (date + real values) with a guide
 * line and highlighted point.
 */
export function AreaChartV2({
  data,
  avg,
  color1 = '#8b5cf6',
  color2 = '#22d3ee',
  height = 200,
  emptyLabel = 'No data yet',
  labels,
  tooltipRows,
}: AreaChartV2Props) {
  const rawId = useId().replace(/:/g, '')
  const gradId = `dvgrad-${rawId}`
  const lineRef = useRef<SVGPolylineElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const pl = lineRef.current
    if (!pl) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const len = pl.getTotalLength()
    pl.style.strokeDasharray = String(len)
    pl.style.strokeDashoffset = String(len)
    void pl.getBoundingClientRect()
    pl.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.22,1,.36,1)'
    pl.style.strokeDashoffset = '0'
  }, [data])

  if (!data || data.length < 2) {
    return (
      <div className="dv-empty" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {emptyLabel}
      </div>
    )
  }

  const avgSeries = avg && avg.length === data.length ? avg : trailingAvg(data)
  const max = Math.max(...data, ...avgSeries) * 1.15 || 1
  const x = (i: number) => P + (i * (W - 2 * P)) / (data.length - 1)
  const y = (v: number) => H - P - (v / max) * (H - 2 * P)

  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`
  const avgLine = avgSeries.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const grid = Array.from({ length: 4 }, (_, g) => {
    const gy = P + (g * (H - 2 * P)) / 3
    return <line key={g} x1={P} y1={gy} x2={W - P} y2={gy} stroke="rgba(255,255,255,.05)" strokeWidth="1" />
  })

  function onMove(e: React.MouseEvent) {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const dataFx = (fx * W - P) / (W - 2 * P)
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(dataFx * (data.length - 1))))
    setHover(idx)
  }

  const hi = hover
  const leftPct = hi != null ? (x(hi) / W) * 100 : 0
  const dotTop = hi != null ? (y(data[hi]) / H) * height : 0
  const rows: TooltipRow[] =
    hi != null
      ? tooltipRows
        ? tooltipRows(hi)
        : [{ label: 'Value', value: String(data[hi]), color: color1 }]
      : []
  const anchorTransform = leftPct < 16 ? 'translateX(0)' : leftPct > 84 ? 'translateX(-100%)' : 'translateX(-50%)'

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height, display: 'block', width: '100%' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color1} stopOpacity="0.35" />
            <stop offset="1" stopColor={color1} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid}
        <polygon points={area} fill={`url(#${gradId})`} />
        <polyline ref={lineRef} points={line} fill="none" stroke={color1} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={avgLine} fill="none" stroke={color2} strokeWidth="1.6" strokeDasharray="4 4" opacity="0.8" />
        {data.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="2.4" fill={color1} />
        ))}
      </svg>

      {hi != null && (labels || tooltipRows) && (
        <>
          {/* guide line + highlighted dot (HTML overlay to avoid stroke scaling) */}
          <div style={{ position: 'absolute', left: `${leftPct}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.18)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: `${leftPct}%`, top: dotTop, width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: '50%', background: color1, boxShadow: `0 0 0 3px rgba(139,92,246,.25)`, pointerEvents: 'none' }} />
          {/* tooltip */}
          <div
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: 6,
              transform: anchorTransform,
              background: '#0c0c14',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 10,
              padding: '8px 11px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 24px -8px rgba(0,0,0,.7)',
              zIndex: 2,
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, color: '#8b94a7', marginBottom: 5 }}>
              {formatLabel(labels?.[hi])}
            </div>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color ?? color1, flex: 'none' }} />
                <span style={{ color: 'var(--txt, #aeb4c2)' }}>{r.label}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono), monospace', fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
