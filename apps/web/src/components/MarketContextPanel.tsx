'use client'

import { useEffect, useState } from 'react'
import { Activity, Target, Users, TrendingUp, DollarSign } from 'lucide-react'

interface MarketData {
  activeCampaigns: number
  totalImpressionsLast30d: number
  floorCpm: number
  suggestedBid: number
  competitiveness: 'low' | 'medium' | 'high' | 'very-high'
  winRateEstimate: number
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

const competitivenessLabels = {
  low: {
    text: 'Low competitiveness - bid is likely to win',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  medium: {
    text: 'Moderate competitiveness',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  high: {
    text: 'High competitiveness - raise bid to win more',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  'very-high': {
    text: 'Very high competitiveness - bid may rarely win',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
}

export function MarketContextPanel({
  contexts,
  bidCpm,
}: {
  contexts: string[]
  bidCpm: number
}) {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    fetch('/api/market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contexts, bidCpm: Math.round(bidCpm * 100) }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load market data')
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [contexts, bidCpm])

  if (loading && !data) {
    return (
      <div className="rounded-2xl card p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const comp = competitivenessLabels[data.competitiveness]

  return (
    <div className="rounded-2xl card p-6 hover:shadow-md transition">
      <div className="flex items-center gap-2 mb-5">
        <Activity size={18} className="text-primary" />
        <h3 className="text-base font-medium text-foreground">Market context</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl bg-muted/50 border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Target size={12} />
            Active campaigns
          </div>
          <p className="text-xl font-semibold text-foreground">{formatNumber(data.activeCampaigns)}</p>
        </div>
        <div className="rounded-xl bg-muted/50 border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Users size={12} />
            30d impressions
          </div>
          <p className="text-xl font-semibold text-foreground">{formatNumber(data.totalImpressionsLast30d)}</p>
        </div>
        <div className="rounded-xl bg-muted/50 border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <DollarSign size={12} />
            CPM floor
          </div>
          <p className="text-xl font-semibold text-foreground">{formatCents(data.floorCpm)}</p>
        </div>
        <div className="rounded-xl bg-muted/50 border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp size={12} />
            Suggested bid
          </div>
          <p className="text-xl font-semibold text-foreground">{formatCents(data.suggestedBid)}</p>
        </div>
      </div>

      {bidCpm > 0 && (
        <div className={`rounded-xl ${comp.bg} border ${comp.border} p-4`}>
          <p className={`text-sm font-medium ${comp.color} mb-1`}>{comp.text}</p>
          <p className="text-xs text-muted-foreground">
            At {formatCents(Math.round(bidCpm * 100))} CPM, your estimated win rate is{' '}
            <span className="text-foreground font-medium">{data.winRateEstimate}%</span> against{' '}
            {data.activeCampaigns} active campaign{data.activeCampaigns === 1 ? '' : 's'}.
          </p>
        </div>
      )}

      {bidCpm === 0 && (
        <p className="text-xs text-muted-foreground">
          Enter a max CPM bid to see how competitive your campaign would be.
        </p>
      )}
    </div>
  )
}
