'use client'

import { useState, useMemo } from 'react'
import { DollarSign, Clock, Sparkles } from 'lucide-react'

const SUBSCRIPTIONS = [
  { name: 'ChatGPT Plus', cost: 20 },
  { name: 'Claude Pro', cost: 20 },
  { name: 'Cursor Pro', cost: 20 },
  { name: 'Midjourney Pro', cost: 30 },
  { name: 'GitHub Copilot', cost: 10 },
  { name: 'Lovable Pro', cost: 20 },
]

export function EarningsCalculator() {
  const [hours, setHours] = useState(4)
  const [targetIndex, setTargetIndex] = useState(1)

  const target = SUBSCRIPTIONS[targetIndex]

  const monthly = useMemo(() => {
    // Estimate: ~25% of active Ai time is wait-state
    // Starting bid ~$5/1k impressions, 50% creator share
    const waitMinutes = hours * 60 * 0.25 * 30
    const impressions = waitMinutes * 1.5 // ~1.5 impressions per minute
    const cpm = 5
    const creatorShare = 0.5
    return Math.round((impressions / 1000) * cpm * creatorShare)
  }, [hours])

  const coverage = Math.min(Math.round((monthly / target.cost) * 100), 999)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
          <DollarSign size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">
            Calculate your earnings
          </h3>
          <p className="text-sm text-muted-foreground">
            See what creators can earn passively
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Clock size={14} className="text-muted-foreground" />
              Ai hours per day
            </label>
            <span className="text-sm font-bold text-primary bg-violet-50 px-2.5 py-1 rounded-lg">
              {hours}h
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>1h</span>
            <span>10h</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            What could it cover?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUBSCRIPTIONS.map((sub, idx) => (
              <button
                key={sub.name}
                onClick={() => setTargetIndex(idx)}
                className={`text-left px-3 py-2.5 rounded-xl text-xs font-medium transition border ${
                  idx === targetIndex
                    ? 'bg-violet-50 border-violet-200 text-primary shadow-sm'
                    : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-slate-300'
                }`}
              >
                {sub.name}
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  ${sub.cost}/mo
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-violet-50/50 to-fuchsia-50 border border-violet-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={48} className="text-primary" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            Estimated monthly earnings
          </p>
          <p className="text-5xl font-bold text-foreground mb-3">${monthly}</p>
          <p className="text-sm text-foreground/80 font-medium">
            {coverage >= 100 ? (
              <>
                <span className="text-emerald-600">{target.name} covered</span>{' '}
                + ${monthly - target.cost} extra
              </>
            ) : (
              <>
                Covers <span className="text-primary">{coverage}%</span> of{' '}
                {target.name}
              </>
            )}
          </p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Based on average Ai wait-state coverage, fill rates, and a 50% creator
          revenue share. Not a guarantee — actual earnings depend on advertiser
          demand and your usage patterns.
        </p>
      </div>
    </div>
  )
}
