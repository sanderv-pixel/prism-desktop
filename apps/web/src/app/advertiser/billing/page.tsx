'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ArrowLeft, Download, Receipt as ReceiptIcon, ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react'
import { AutoRechargeSettings } from '@/components/advertiser/AutoRechargeSettings'
import { AddFundsModal } from '@/components/advertiser/AddFundsModal'

interface Txn {
  id: string
  kind: 'deposit' | 'spend'
  date: string
  description: string
  amountCents: number
  isTest?: boolean
  impressions?: number
  receiptId?: string | null
}

interface BillingData {
  advertiser: { name: string; email: string }
  summary: { balanceCents: number; lifetimeDepositsCents: number; lifetimeSpentCents: number }
  transactions: Txn[]
}

function fmt(cents: number) {
  const v = Math.abs(cents) / 100
  return `$${v.toFixed(2)}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function BillingPage() {
  const router = useRouter()
  const [data, setData] = useState<BillingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<Txn | null>(null)
  const [showAddFunds, setShowAddFunds] = useState(false)

  const load = useCallback(() => {
    fetch('/api/advertiser/billing')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setError('Could not load billing history.'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <DashboardShell>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div>
      </DashboardShell>
    )
  }
  if (!data) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-96 text-muted-foreground">Loading…</div>
      </DashboardShell>
    )
  }

  const { summary, transactions } = data

  return (
    <DashboardShell>
      <button
        onClick={() => router.push('/advertiser/dashboard')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Billing</h1>
        <button
          onClick={() => setShowAddFunds(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-violet-700"
        >
          <Plus size={16} /> Add funds
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Wallet balance</p>
          <p className="text-3xl font-semibold">{fmt(summary.balanceCents)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Lifetime deposits</p>
          <p className="text-3xl font-semibold text-emerald-600">{fmt(summary.lifetimeDepositsCents)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Lifetime ad spend</p>
          <p className="text-3xl font-semibold">{fmt(summary.lifetimeSpentCents)}</p>
        </div>
      </div>

      <div className="mb-8">
        <AutoRechargeSettings />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-medium">Transactions</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(t.date)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      {t.kind === 'deposit' ? (
                        <ArrowDownLeft size={15} className="text-emerald-600" />
                      ) : (
                        <ArrowUpRight size={15} className="text-slate-400" />
                      )}
                      {t.description}
                      {t.isTest && (
                        <span className="text-[11px] uppercase tracking-wide text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">test</span>
                      )}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${t.kind === 'deposit' ? 'text-emerald-600' : 'text-foreground'}`}>
                    {t.kind === 'deposit' ? '+' : '−'}{fmt(t.amountCents)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {t.kind === 'deposit' ? (
                      <button
                        onClick={() => setReceipt(t)}
                        className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline"
                      >
                        <ReceiptIcon size={13} /> View
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {receipt && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setReceipt(null)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-8 print:shadow-none"
            onClick={(e) => e.stopPropagation()}
            id="receipt"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="text-xl font-semibold">Prism</div>
              <div className="text-sm text-muted-foreground">Receipt</div>
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Billed to" value={data.advertiser.name || data.advertiser.email} />
              <Row label="Email" value={data.advertiser.email} />
              <Row label="Date" value={fmtDate(receipt.date)} />
              <Row label="Description" value={receipt.description} />
              {receipt.receiptId && <Row label="Reference" value={receipt.receiptId} />}
              <div className="border-t pt-3 mt-3 flex justify-between font-semibold text-base">
                <span>Total {receipt.isTest ? '(test)' : ''}</span>
                <span>{fmt(receipt.amountCents)}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-8 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 text-white py-2.5 text-sm font-medium hover:bg-violet-700"
              >
                <Download size={15} /> Download / print
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="rounded-lg border px-4 py-2.5 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddFunds && (
        <AddFundsModal onClose={() => setShowAddFunds(false)} onFunded={load} />
      )}
    </DashboardShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value}</span>
    </div>
  )
}
