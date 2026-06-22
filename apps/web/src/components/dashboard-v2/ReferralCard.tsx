'use client'

import { useCountUp } from './useCountUp'
import { formatCents } from './format'

interface ReferralCardProps {
  earningsCents: number
  referredCount: number
  referralCode: string | null
  onCopy: () => void
  copied?: boolean
}

/** Lifetime-10% referral summary + copy link. Real referral data only. */
export function ReferralCard({
  earningsCents,
  referredCount,
  referralCode,
  onCopy,
  copied,
}: ReferralCardProps) {
  const animated = useCountUp(earningsCents / 100)
  return (
    <div className="dv-subblock">
      <h3 style={{ fontSize: 13 }}>
        Referrals <span className="meta">lifetime 10%</span>
      </h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <span
          className="mono"
          style={{ fontSize: 24, fontWeight: 700, color: 'var(--emerald)' }}
        >
          ${animated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={{ fontSize: 12, color: 'var(--mut)' }}>
          {referredCount > 0
            ? `from ${referredCount} builder${referredCount === 1 ? '' : 's'}`
            : 'no referrals yet'}
        </span>
      </div>
      <button
        className="dv-btn dv-btn-g"
        style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
        onClick={onCopy}
        disabled={!referralCode}
      >
        {copied ? 'Copied!' : referralCode ? 'Copy referral link' : 'No referral link yet'}
      </button>
    </div>
  )
}
