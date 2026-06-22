'use client'

import { useId } from 'react'
import { useCountUp } from './useCountUp'

interface KpiCardProps {
  label: string
  dotColor: string
  value: number
  format: (n: number) => string
  delta?: React.ReactNode
  emphasis?: boolean
  /** Optional sparkline series (drawn bottom-right). */
  spark?: number[]
  sparkColor?: string
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const id = useId()
  if (data.length < 2) return null
  const w = 70
  const h = 26
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - 2 - ((v - min) / span) * (h - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" key={id} />
    </svg>
  )
}

/** KPI tile: mono label + dot, animated value, delta line, optional sparkline. */
export function KpiCard({
  label,
  dotColor,
  value,
  format,
  delta,
  emphasis,
  spark,
  sparkColor = '#a78bfa',
}: KpiCardProps) {
  const animated = useCountUp(value)
  return (
    <div className="dv-card dv-kpi">
      <div className="lab">
        <span style={{ color: dotColor }}>●</span> {label}
      </div>
      <div className={`val${emphasis ? ' em' : ''}`}>{format(animated)}</div>
      {delta ? <div className="delta">{delta}</div> : null}
      {spark && spark.length > 1 ? (
        <Sparkline data={spark} color={sparkColor} />
      ) : null}
    </div>
  )
}
