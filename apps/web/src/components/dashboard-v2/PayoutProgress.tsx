'use client'

import { useEffect, useState } from 'react'
import { formatCents } from './format'

interface PayoutProgressProps {
  balanceCents: number
  thresholdCents?: number
  autoEnabled: boolean
  payoutsConfigured: boolean
}

/** Progress toward the payout minimum. Real balance vs threshold; no faked ETA. */
export function PayoutProgress({
  balanceCents,
  thresholdCents = 5000,
  autoEnabled,
  payoutsConfigured,
}: PayoutProgressProps) {
  const [grown, setGrown] = useState(false)
  const pct = Math.min(100, Math.round((balanceCents / thresholdCents) * 100))
  const reached = balanceCents >= thresholdCents

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGrown(true)
      return
    }
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [pct])

  const note = !payoutsConfigured
    ? 'Set up a payout method to cash out.'
    : reached
      ? autoEnabled
        ? "You're past the $50 minimum. Auto-payout is on."
        : "You're past the $50 minimum. Withdraw any time."
      : `${formatCents(thresholdCents - balanceCents)} to go until the $50 minimum.`

  return (
    <div>
      <p style={{ marginTop: 8, fontSize: 13, color: 'var(--txt)' }}>{note}</p>
      <div className="dv-pbar">
        <i style={{ width: grown ? `${pct}%` : '0%' }} />
      </div>
      <div className="dv-pmeta">
        <span>{formatCents(balanceCents)} available</span>
        <span>min {formatCents(thresholdCents)}{autoEnabled ? ' · auto' : ''}</span>
      </div>
    </div>
  )
}
