'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Settings {
  enabled: boolean
  thresholdCents: number
  amountCents: number
  hasSavedCard: boolean
}

export function AutoRechargeSettings() {
  const [s, setS] = useState<Settings | null>(null)
  const [threshold, setThreshold] = useState('20')
  const [amount, setAmount] = useState('50')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/advertiser/auto-recharge')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: Settings) => {
        setS(d)
        setThreshold(String(Math.round(d.thresholdCents / 100)))
        setAmount(String(Math.round(d.amountCents / 100)))
      })
      .catch(() => {})
  }, [])

  async function save(next: Partial<Settings>) {
    setSaving(true)
    const body: Record<string, unknown> = {}
    if (next.enabled !== undefined) body.enabled = next.enabled
    body.thresholdCents = Math.round(parseFloat(threshold) * 100)
    body.amountCents = Math.round(parseFloat(amount) * 100)
    const res = await fetch('/api/advertiser/auto-recharge', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      setS((prev) => (prev ? { ...prev, ...next } : prev))
      toast.success('Auto-recharge saved')
    } else {
      const e = await res.json().catch(() => ({}))
      toast.error(e.error ?? 'Could not save')
    }
  }

  if (!s) return null

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-medium">Auto-recharge</h2>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={s.enabled}
            disabled={!s.hasSavedCard || saving}
            onChange={(e) => save({ enabled: e.target.checked })}
          />
          <span className="text-sm">{s.enabled ? 'On' : 'Off'}</span>
        </label>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Automatically top up so pay-as-you-go campaigns never pause for lack of funds.
      </p>

      {!s.hasSavedCard && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          Complete a top-up first so a card is saved, then auto-recharge can be turned on.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-muted-foreground">When balance falls below</span>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-muted-foreground">$</span>
            <input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              onBlur={() => s.enabled && save({})}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-sm text-muted-foreground">Top up by</span>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-muted-foreground">$</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => s.enabled && save({})}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </label>
      </div>
    </div>
  )
}
