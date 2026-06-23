'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import '../../dashboard-v2/dashboard-v2.css'
import { Zap, AlertCircle, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardData } from '@/components/dashboard-v2/useDashboardData'
import { earnerNav } from '@/components/dashboard-v2/earnerNav'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { KpiCard } from '@/components/dashboard-v2/KpiCard'
import { PayoutProgress } from '@/components/dashboard-v2/PayoutProgress'
import { PayoutMethodForm } from '@/components/dashboard/PayoutMethodForm'
import { formatCents } from '@/components/dashboard-v2/format'

function payoutChip(status: string): { cls: string; label: string } {
  switch (status) {
    case 'paid':
      return { cls: 'live', label: 'Paid' }
    case 'approved':
    case 'pending_review':
      return { cls: 'rev', label: status === 'approved' ? 'Approved' : 'In review' }
    case 'rejected':
    case 'failed':
      return { cls: 'pause', label: status }
    default:
      return { cls: 'pause', label: status.replace(/_/g, ' ') }
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PayoutsPage() {
  const { user, loading: authLoading } = useAuth()
  const { data, loading, error, refetch } = useDashboardData()
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [amount, setAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  const userName = user?.email ? user.email.split('@')[0] : 'creator'
  const userEmail = user?.email ?? ''

  async function handleWithdraw(amountCents?: number) {
    setWithdrawing(true)
    try {
      const res = await fetch('/api/dashboard/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(amountCents ? { amountCents } : {}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Withdrawal failed')
      setShowWithdraw(false)
      await refetch()
      toast.success('Withdrawal request submitted.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Withdrawal failed')
    } finally {
      setWithdrawing(false)
    }
  }

  function shell(children: React.ReactNode, primary?: React.ReactNode) {
    return (
      <DashboardShellV2 view="earn" title="Payouts" subtitle="Withdraw your balance and track every payout." primary={primary} nav={earnerNav('payouts')} userName={userName} userEmail={userEmail}>
        {children}
      </DashboardShellV2>
    )
  }

  if (authLoading || loading) return shell(<div className="dv-loadwrap"><Zap size={18} className="animate-pulse" /> Loading payouts…</div>)
  if (error || !data) return shell(<div className="dv-alert"><AlertCircle size={20} /><div><p style={{ fontWeight: 600 }}>Failed to load payouts</p><p style={{ fontSize: 13, opacity: 0.85 }}>{error}</p></div></div>)

  const { stats, payouts } = data
  const configured = data.user.connectStatus.configured
  const balanceDollars = stats.balanceCents / 100
  const paidOutCents = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amountCents, 0)

  const primary = configured ? (
    <button className="dv-btn dv-btn-p" onClick={() => { setAmount(balanceDollars.toFixed(2)); setShowWithdraw(true) }} disabled={stats.balanceCents <= 0}>Withdraw {formatCents(stats.balanceCents)}</button>
  ) : (
    <button className="dv-btn dv-btn-p" onClick={() => setShowSetup(true)}>Set up payouts</button>
  )

  return shell(
    <>
      <div className="dv-grid dv-kpis">
        <KpiCard label="Available balance" dotColor="var(--emerald)" value={stats.balanceCents} format={(n) => formatCents(n)} emphasis delta="ready to withdraw" />
        <KpiCard label="Pending payout" dotColor="var(--amber)" value={stats.pendingPayoutCents} format={(n) => formatCents(n)} delta="in review" />
        <KpiCard label="Total paid out" dotColor="var(--cyan)" value={paidOutCents} format={(n) => formatCents(n)} delta="to your account" />
        <KpiCard label="Total earned" dotColor="var(--v400)" value={stats.totalEarningsCents} format={(n) => formatCents(n)} delta="lifetime" />
      </div>

      <div className="dv-row2">
        <div className="dv-card">
          <h3>Payout progress</h3>
          <PayoutProgress balanceCents={stats.balanceCents} autoEnabled={configured} payoutsConfigured={configured} />
          <div className="dv-subblock">
            <h3 style={{ fontSize: 13 }}>Payout method <span className="meta">{configured ? data.user.connectStatus.provider ?? 'configured' : 'not set'}</span></h3>
            <button className="dv-btn dv-btn-g" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => setShowSetup(true)}>
              {configured ? 'Change payout method' : 'Set up payout method'}
            </button>
          </div>
        </div>
        <div className="dv-card">
          <h3>Payout history <span className="meta">{payouts.length} total</span></h3>
          {payouts.length === 0 ? (
            <div className="dv-empty">No payouts yet. Withdraw once you pass the $50 minimum.</div>
          ) : (
            <div className="dv-tablewrap">
              <table className="dv-table" style={{ minWidth: 420 }}>
                <thead><tr><th className="r">Amount</th><th>Status</th><th className="r">Requested</th><th className="r">Paid</th></tr></thead>
                <tbody>
                  {payouts.map((p) => {
                    const chip = payoutChip(p.status)
                    return (
                      <tr key={p.id}>
                        <td className="r" style={{ color: '#fff' }}>{formatCents(p.amountCents)}</td>
                        <td><span className={`dv-stat ${chip.cls}`}>{chip.label}</span></td>
                        <td className="r">{formatDate(p.createdAt)}</td>
                        <td className="r">{formatDate(p.paidAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="dv-ftnote">Minimum payout $50 · paid to your saved method after review</div>

      {showWithdraw && (
        <div className="dv-modalbg" onClick={() => setShowWithdraw(false)}>
          <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dv-modalx" onClick={() => setShowWithdraw(false)} aria-label="Close"><X size={18} /></button>
            <h3>Withdraw earnings</h3>
            <p>Paid to your saved payout method after review. Available: {formatCents(stats.balanceCents)}.</p>
            <input className="dv-input" type="number" step="0.01" min="0" max={balanceDollars} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="dv-btn dv-btn-g" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowWithdraw(false)}>Cancel</button>
              <button className="dv-btn dv-btn-p" style={{ flex: 1, justifyContent: 'center' }} disabled={withdrawing || !amount || parseFloat(amount) <= 0} onClick={() => handleWithdraw(Math.round(parseFloat(amount) * 100))}>{withdrawing ? 'Submitting…' : 'Withdraw'}</button>
            </div>
          </div>
        </div>
      )}

      {showSetup && (
        <div className="dv-modalbg" onClick={() => setShowSetup(false)}>
          <div className="dv-modal dash-dark" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '85vh', overflowY: 'auto', background: '#0c0c14', backgroundImage: 'none' }}>
            <button className="dv-modalx" onClick={() => setShowSetup(false)} aria-label="Close"><X size={18} /></button>
            <h3>Set up your payout method</h3>
            <p>Choose how you want to receive your earnings. Minimum payout is $20.</p>
            <PayoutMethodForm onSaved={() => { setShowSetup(false); refetch() }} />
          </div>
        </div>
      )}
    </>,
    primary
  )
}
