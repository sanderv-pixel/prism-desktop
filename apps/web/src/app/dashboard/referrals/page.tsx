'use client'

import { useState } from 'react'
import '../../dashboard-v2/dashboard-v2.css'
import { Zap, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardData } from '@/components/dashboard-v2/useDashboardData'
import { earnerNav } from '@/components/dashboard-v2/earnerNav'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { KpiCard } from '@/components/dashboard-v2/KpiCard'
import { formatCents, formatNumber } from '@/components/dashboard-v2/format'

const STEPS = [
  { t: 'Share your link', d: 'Send your referral link to other builders.' },
  { t: 'They install and earn', d: 'When they set up Prism and start earning from their AI waits, you are credited.' },
  { t: 'You earn 10%, for life', d: "A lifetime 10% of their earnings, paid out of Prism's cut, so they keep their full 50%." },
]

export default function ReferralsPage() {
  const { user, loading: authLoading } = useAuth()
  const { data, loading, error } = useDashboardData()
  const [copied, setCopied] = useState(false)

  const userName = user?.email ? user.email.split('@')[0] : 'creator'
  const userEmail = user?.email ?? ''

  function shell(children: React.ReactNode) {
    return (
      <DashboardShellV2 view="earn" title="Referrals" subtitle="Bring a builder, earn 10% of their earnings for life." nav={earnerNav('referrals')} userName={userName} userEmail={userEmail}>
        {children}
      </DashboardShellV2>
    )
  }

  if (authLoading || loading) return shell(<div className="dv-loadwrap"><Zap size={18} className="animate-pulse" /> Loading referrals…</div>)
  if (error || !data) return shell(<div className="dv-alert"><AlertCircle size={20} /><div><p style={{ fontWeight: 600 }}>Failed to load referrals</p><p style={{ fontSize: 13, opacity: 0.85 }}>{error}</p></div></div>)

  const { referral } = data
  const link = referral.referralCode && typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referral.referralCode}` : ''

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return shell(
    <>
      <div className="dv-grid dv-kpis">
        <KpiCard label="Referral earnings" dotColor="var(--emerald)" value={referral.referralEarningsCents} format={(n) => formatCents(n)} emphasis delta="lifetime, paid to you" />
        <KpiCard label="Builders referred" dotColor="var(--v400)" value={referral.referredCount} format={(n) => formatNumber(n)} delta="installed and earning" />
        <KpiCard label="Your rate" dotColor="var(--cyan)" value={10} format={(n) => `${n}%`} delta="of their earnings" />
        <KpiCard label="Validity" dotColor="var(--amber)" value={0} format={() => '∞'} delta="no cap, no expiry" />
      </div>

      <div className="dv-row2">
        <div className="dv-card">
          <h3>Your referral link <span className="meta">lifetime 10%</span></h3>
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--txt)' }}>
            Share this link. When a builder installs and earns, you get a lifetime 10% of their
            earnings, paid out of Prism&apos;s cut, so your referrals keep their full 50%.
          </p>
          {link ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <input className="dv-input" readOnly value={link} style={{ flex: 1, fontSize: 13 }} onFocus={(e) => e.currentTarget.select()} />
              <button className="dv-btn dv-btn-p" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
          ) : (
            <div className="dv-empty" style={{ marginTop: 14 }}>Your referral link will appear once your account is fully set up.</div>
          )}
        </div>

        <div className="dv-card">
          <h3>How it works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', background: 'rgba(139,92,246,.16)', color: 'var(--v300)', fontFamily: 'var(--font-mono), monospace', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.t}</div>
                  <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.5, marginTop: 2 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dv-ftnote">Lifetime 10% on every referral · paid from Prism&apos;s cut</div>
    </>
  )
}
