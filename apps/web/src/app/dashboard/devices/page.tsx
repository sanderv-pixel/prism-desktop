'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import '../../dashboard-v2/dashboard-v2.css'
import { Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { earnerNav } from '@/components/dashboard-v2/earnerNav'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { KpiCard } from '@/components/dashboard-v2/KpiCard'
import { DevicesCard } from '@/components/dashboard-v2/DevicesCard'
import { formatNumber, timeAgo } from '@/components/dashboard-v2/format'
import type { DeviceInfo } from '@/components/dashboard-v2/types'

export default function DevicesPage() {
  const { user, loading: authLoading } = useAuth()
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/devices')
      if (res.ok) setDevices((await res.json()).devices ?? [])
    } catch {
      /* non-critical */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  async function revokeDevice(id: string) {
    if (!confirm('Disconnect this device? Its key stops working and the overlay must re-pair to earn again.')) return
    const res = await fetch('/api/dashboard/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success('Device disconnected')
      fetchDevices()
    } else {
      toast.error('Could not disconnect device')
    }
  }

  const userName = user?.email ? user.email.split('@')[0] : 'creator'
  const userEmail = user?.email ?? ''

  function shell(children: React.ReactNode) {
    return (
      <DashboardShellV2 view="earn" title="Devices" subtitle="Where Prism is connected and earning." nav={earnerNav('devices')} userName={userName} userEmail={userEmail}>
        {children}
      </DashboardShellV2>
    )
  }

  if (authLoading || loading) return shell(<div className="dv-loadwrap"><Zap size={18} className="animate-pulse" /> Loading devices…</div>)

  const connected = devices.filter((d) => !d.revoked).length
  const activeNow = devices.filter((d) => d.active && !d.revoked).length
  const disconnected = devices.filter((d) => d.revoked).length
  const lastEarned = devices.filter((d) => !d.revoked).map((d) => d.lastUsedAt).filter(Boolean).sort().reverse()[0] ?? null

  return shell(
    <>
      <div className="dv-grid dv-kpis">
        <KpiCard label="Connected" dotColor="var(--emerald)" value={connected} format={(n) => formatNumber(n)} emphasis delta="device(s) paired" />
        <KpiCard label="Active now" dotColor="var(--v400)" value={activeNow} format={(n) => formatNumber(n)} delta="earning right now" />
        <KpiCard label="Disconnected" dotColor="var(--mut)" value={disconnected} format={(n) => formatNumber(n)} delta="revoked devices" />
        <div className="dv-card dv-kpi">
          <div className="lab"><span style={{ color: 'var(--cyan)' }}>●</span> Last earned</div>
          <div className="val" style={{ fontSize: 22 }}>{lastEarned ? timeAgo(lastEarned) : '—'}</div>
          <div className="delta">most recent device</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <DevicesCard devices={devices} onRevoke={revokeDevice} />
      </div>

      <div className="dv-ftnote">Each device pairs once and earns from your AI waits</div>
    </>
  )
}
