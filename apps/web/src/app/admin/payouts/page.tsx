'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import { useAdminSecret } from '@/components/admin/AdminSecretProvider'
import { adminHeaders } from '@/lib/admin/fetch'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

type Payout = {
  id: string
  userId: string
  userEmail: string
  amountCents: number
  status: string
  createdAt: string
  provider: string | null
  recipientDetails: Record<string, unknown>
}

export default function AdminPayoutsPage() {
  const { adminSecret } = useAdminSecret()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<Record<string, boolean>>({})

  async function load() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/payouts?status=pending_review', {
        headers: adminHeaders(adminSecret),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to load payouts')
      }
      const data = (await res.json()) as Payout[]
      setPayouts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [adminSecret])

  async function approve(id: string) {
    setProcessing((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/admin/payouts/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders(adminSecret) },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error ?? 'Approval failed')
      }
      setPayouts((prev) => prev.filter((p) => p.id !== id))
      toast.success(json.message ?? 'Payout approved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: false }))
    }
  }

  async function reject(id: string) {
    const reason = window.prompt('Rejection reason:')
    if (!reason) return

    setProcessing((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/admin/payouts/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders(adminSecret) },
        body: JSON.stringify({ reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error ?? 'Rejection failed')
      }
      setPayouts((prev) => prev.filter((p) => p.id !== id))
      toast.success(json.message ?? 'Payout rejected.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed')
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: false }))
    }
  }

  function formatCents(cents: number) {
    return `$${(cents / 100).toFixed(2)}`
  }

  function recipientSummary(payout: Payout) {
    const details = payout.recipientDetails
    if (!payout.provider) return 'No payout method configured'
    if (payout.provider === 'payoneer') {
      return `Payoneer: ${details.payoneerEmail || '—'}`
    }
    const parts = [
      details.accountHolderName,
      details.currency,
      details.iban || details.accountNumber,
    ].filter(Boolean)
    return `Wise: ${parts.join(' · ') || '—'}`
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Review queue</p>
        <h1 className="text-2xl font-semibold text-foreground">Payout review queue</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : error ? (
        <div className="rounded-2xl card p-8 text-center text-red-600 border border-red-200 bg-red-50">
          <AlertCircle className="mx-auto mb-3" size={32} />
          <p>{error}</p>
        </div>
      ) : payouts.length === 0 ? (
        <div className="rounded-2xl card p-8 text-center hover:shadow-md transition">
          <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={32} />
          <p className="text-muted-foreground">No payouts awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="rounded-2xl card p-6 flex flex-col md:flex-row md:items-center gap-6 hover:shadow-md transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-medium text-foreground">
                    {formatCents(payout.amountCents)}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-500 border border-amber-200">
                    pending review
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {payout.userEmail || 'Unknown email'}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  User: {payout.userId}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Requested {new Date(payout.createdAt).toLocaleString()}
                </p>
                <p className="text-xs font-medium text-foreground mt-2">
                  {recipientSummary(payout)}
                </p>
                {!payout.provider && (
                  <p className="text-xs text-red-600 mt-1">
                    Cannot approve until builder adds a payout method.
                  </p>
                )}
              </div>

              <div className="flex md:flex-col gap-3 shrink-0">
                <Button
                  size="sm"
                  disabled={processing[payout.id] || !payout.provider}
                  onClick={() => approve(payout.id)}
                >
                  {processing[payout.id] ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 size={16} className="mr-2" />
                  )}
                  Approve & pay
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processing[payout.id]}
                  onClick={() => reject(payout.id)}
                >
                  <XCircle size={16} className="mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
