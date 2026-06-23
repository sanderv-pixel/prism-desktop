'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { advertiserNav } from '@/components/dashboard-v2/advertiserNav'
import { CreditCard, Crosshair, AlertTriangle, Copy, Check } from 'lucide-react'

interface Settings {
  id: string
  name: string
  email: string
  website: string | null
  supportEmail: string | null
  status: string
  createdAt: string
  balanceCents: number
  lifetimeDepositsCents: number
  notifyBudget: boolean
  notifyLowBalance: boolean
  notifyCampaignStatus: boolean
  notifyWeeklySummary: boolean
  notifyReceipts: boolean
}

type NotifyKey =
  | 'notifyLowBalance'
  | 'notifyBudget'
  | 'notifyCampaignStatus'
  | 'notifyWeeklySummary'
  | 'notifyReceipts'

const lbl: CSSProperties = { display: 'block', fontSize: 13, color: 'var(--mut, #9aa0ad)', marginBottom: 7 }
const hint: CSSProperties = { fontSize: 12, color: 'var(--mut, #8b8f9c)', marginTop: 6 }
const cardGap: CSSProperties = { display: 'grid', gap: 16, marginTop: 18 }

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        position: 'relative', width: 42, height: 24, borderRadius: 999, flex: 'none',
        cursor: 'pointer', border: 'none', transition: '.2s',
        background: on ? '#8b5cf6' : 'rgba(255,255,255,.13)',
      }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: '.2s' }} />
    </button>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active: ['#6ee7b7', 'rgba(52,211,153,.14)'],
    pending: ['#fcd34d', 'rgba(251,191,36,.14)'],
    closed: ['#fda4af', 'rgba(244,63,94,.14)'],
  }
  const [color, bg] = map[status] ?? ['#cbd5e1', 'rgba(255,255,255,.08)']
  return (
    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color, background: bg, padding: '4px 11px', borderRadius: 999 }}>
      {status}
    </span>
  )
}

const fmtUsd = (c: number) => `$${(c / 100).toFixed(2)}`
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

const NOTIFICATIONS: { key: NotifyKey; title: string; desc: string }[] = [
  { key: 'notifyLowBalance', title: 'Low balance', desc: 'When your wallet is running low.' },
  { key: 'notifyBudget', title: 'Budget exhausted', desc: 'When a campaign reaches its budget cap.' },
  { key: 'notifyCampaignStatus', title: 'Campaign status', desc: 'When a campaign goes live or is reviewed.' },
  { key: 'notifyWeeklySummary', title: 'Weekly performance summary', desc: 'A Monday recap of spend, impressions, and clicks.' },
  { key: 'notifyReceipts', title: 'Payment receipts', desc: 'A receipt by email after every top-up.' },
]

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const userName = user?.email ? user.email.split('@')[0] : 'advertiser'
  const userEmail = user?.email ?? ''
  const [s, setS] = useState<Settings | null>(null)
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [closeText, setCloseText] = useState('')
  const [dangerBusy, setDangerBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/advertiser/settings')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: Settings) => {
        setS(d)
        setName(d.name ?? '')
        setWebsite(d.website ?? '')
        setSupportEmail(d.supportEmail ?? '')
      })
      .catch(() => toast.error('Could not load settings'))
  }, [])

  async function patch(body: Record<string, unknown>, ok = 'Saved') {
    const res = await fetch('/api/advertiser/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) toast.success(ok)
    else toast.error((await res.json().catch(() => ({}))).error ?? 'Could not save')
    return res.ok
  }

  async function saveProfile() {
    setSavingProfile(true)
    await patch({ name, website: website || null, supportEmail: supportEmail || null }, 'Profile saved')
    setSavingProfile(false)
  }

  function toggleNotify(key: NotifyKey, value: boolean) {
    if (!s) return
    setS({ ...s, [key]: value })
    patch({ [key]: value }, 'Preferences saved')
  }

  async function danger(action: 'pauseAll' | 'close') {
    setDangerBusy(true)
    const res = await fetch('/api/advertiser/danger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setDangerBusy(false)
    if (!res.ok) {
      toast.error('Action failed. Please try again.')
      return
    }
    if (action === 'pauseAll') {
      toast.success('All campaigns paused')
    } else {
      toast.success('Account closed')
      router.push('/')
    }
  }

  function copyId() {
    if (!s) return
    navigator.clipboard.writeText(s.id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (!s) {
    return (
      <DashboardShellV2 view="adv" title="Settings" subtitle="Account, brand, and notifications." nav={advertiserNav('settings')} userName={userName} userEmail={userEmail}>
        <div className="dv-loadwrap">Loading…</div>
      </DashboardShellV2>
    )
  }

  return (
    <DashboardShellV2 view="adv" title="Settings" subtitle="Account, brand, and notifications." nav={advertiserNav('settings')} userName={userName} userEmail={userEmail}>
      <div style={{ maxWidth: 720, display: 'grid', gap: 18 }}>
        {/* ACCOUNT */}
        <div className="dv-card">
          <h3>Account <span className="meta">since {fmtDate(s.createdAt)}</span></h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <StatusPill status={s.status} />
            <span style={{ fontSize: 13, color: 'var(--mut, #9aa0ad)' }}>{s.email}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: 'var(--mut, #9aa0ad)' }}>Wallet balance</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginTop: 2 }}>{fmtUsd(s.balanceCents)}</div>
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: 'var(--mut, #9aa0ad)' }}>Lifetime spend</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginTop: 2 }}>{fmtUsd(s.lifetimeDepositsCents)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, border: '1px solid var(--line)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--mut, #9aa0ad)' }}>Account ID</div>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.id}</div>
            </div>
            <button onClick={copyId} className="dv-btn dv-btn-g" style={{ flex: 'none' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* PROFILE */}
        <div className="dv-card">
          <h3>Profile</h3>
          <div style={cardGap}>
            <label>
              <span style={lbl}>Business name</span>
              <input className="dv-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span style={lbl}>Website</span>
              <input className="dv-input" value={website} placeholder="https://example.com" onChange={(e) => setWebsite(e.target.value)} />
            </label>
            <label>
              <span style={lbl}>Support email</span>
              <input className="dv-input" type="email" value={supportEmail} placeholder="support@yourcompany.com" onChange={(e) => setSupportEmail(e.target.value)} />
              <span style={hint}>Where customers can reach you. Shown on receipts.</span>
            </label>
            <div>
              <button onClick={saveProfile} disabled={savingProfile} className="dv-btn dv-btn-p">
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className="dv-card">
          <h3>Email notifications <span className="meta">{NOTIFICATIONS.filter((n) => s[n.key]).length}/{NOTIFICATIONS.length} on</span></h3>
          <div style={{ marginTop: 6 }}>
            {NOTIFICATIONS.map((n, i) => (
              <div
                key={n.key}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}
              >
                <div>
                  <p style={{ fontSize: 14, color: '#e6e8ee' }}>{n.title}</p>
                  <p style={{ fontSize: 12.5, color: 'var(--mut, #9aa0ad)', marginTop: 2 }}>{n.desc}</p>
                </div>
                <Toggle on={s[n.key] as boolean} onChange={(v) => toggleNotify(n.key, v)} />
              </div>
            ))}
          </div>
        </div>

        {/* BILLING & TRACKING */}
        <div className="dv-card">
          <h3>Billing &amp; tracking</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <a href="/advertiser/billing" style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--line)', borderRadius: 12, padding: 14, textDecoration: 'none' }}>
              <CreditCard size={18} style={{ color: '#c4b5fd', flex: 'none' }} />
              <div>
                <p style={{ fontSize: 13.5, color: '#e6e8ee' }}>Billing &amp; auto top-up</p>
                <p style={{ fontSize: 12, color: 'var(--mut, #9aa0ad)' }}>Payments, receipts, auto-recharge</p>
              </div>
            </a>
            <a href="/advertiser/conversions" style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--line)', borderRadius: 12, padding: 14, textDecoration: 'none' }}>
              <Crosshair size={18} style={{ color: '#c4b5fd', flex: 'none' }} />
              <div>
                <p style={{ fontSize: 13.5, color: '#e6e8ee' }}>Conversion tracking</p>
                <p style={{ fontSize: 12, color: 'var(--mut, #9aa0ad)' }}>Postback key + setup</p>
              </div>
            </a>
          </div>
        </div>

        {/* DANGER ZONE */}
        <div className="dv-card" style={{ borderColor: 'rgba(248,113,113,.32)', background: 'rgba(248,113,113,.05)' }}>
          <h3 style={{ color: '#fca5a5' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> Danger zone</span>
          </h3>
          <div style={{ marginTop: 16, display: 'grid', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 14, color: '#e6e8ee' }}>Pause all campaigns</p>
                <p style={{ fontSize: 12.5, color: 'var(--mut, #9aa0ad)', marginTop: 2 }}>Stop all delivery. You can resume any campaign later.</p>
              </div>
              <button
                onClick={() => { if (confirm('Pause all active campaigns? They will stop delivering until you resume them.')) danger('pauseAll') }}
                disabled={dangerBusy}
                style={{ flex: 'none', borderRadius: 11, border: '1px solid rgba(248,113,113,.4)', color: '#fca5a5', background: 'transparent', padding: '9px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Pause all
              </button>
            </div>
            <div style={{ borderTop: '1px solid rgba(248,113,113,.2)', paddingTop: 16 }}>
              <p style={{ fontSize: 14, color: '#e6e8ee' }}>Close account</p>
              <p style={{ fontSize: 12.5, color: 'var(--mut, #9aa0ad)', margin: '4px 0 12px' }}>
                Deactivates your account and pauses all campaigns. Your data and wallet balance are kept; contact support to reopen or request a refund. Type{' '}
                <span style={{ fontWeight: 600, color: '#fff' }}>{s.name?.trim()}</span> to confirm.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="dv-input"
                  value={closeText}
                  onChange={(e) => setCloseText(e.target.value)}
                  placeholder={s.name?.trim()}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button
                  onClick={() => danger('close')}
                  disabled={dangerBusy || closeText.trim() !== (s.name ?? '').trim()}
                  style={{ flex: 'none', borderRadius: 11, background: '#dc2626', color: '#fff', border: 'none', padding: '0 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', opacity: dangerBusy || closeText.trim() !== (s.name ?? '').trim() ? 0.4 : 1, whiteSpace: 'nowrap' }}
                >
                  Close account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShellV2>
  )
}
