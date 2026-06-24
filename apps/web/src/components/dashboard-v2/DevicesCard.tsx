'use client'

import Link from 'next/link'
import { Monitor, Plus, Download } from 'lucide-react'
import { timeAgo } from './format'

export interface DeviceInfo {
  id: string
  createdAt: string
  lastUsedAt: string | null
  lastSeenIp: string | null
  hasFingerprint: boolean
  revoked: boolean
  active: boolean
}

interface DevicesCardProps {
  devices: DeviceInfo[]
  onRevoke: (id: string) => void
  /** Opens the in-dashboard install wizard. Falls back to the /install page if absent. */
  onInstall?: () => void
}

/** Connected devices + disconnect. Reuses the real /api/dashboard/devices data. */
export function DevicesCard({ devices, onRevoke, onInstall }: DevicesCardProps) {
  return (
    <div className="dv-card">
      <h3>
        Your devices
        {onInstall ? (
          <button type="button" onClick={onInstall} className="dv-devlink">
            <Plus size={14} /> Connect a device
          </button>
        ) : (
          <Link href="/install" className="dv-devlink">
            <Plus size={14} /> Connect a device
          </Link>
        )}
      </h3>

      {devices.length === 0 ? (
        <div className="dv-devempty">
          <Monitor size={26} style={{ opacity: 0.4 }} />
          <p style={{ fontWeight: 600, color: '#fff' }}>No device connected</p>
          <p>Install Prism on your Mac to start earning while your AI thinks.</p>
          {onInstall ? (
            <button type="button" onClick={onInstall} className="dv-btn dv-btn-p" style={{ marginTop: 14 }}>
              <Download size={15} /> Install Prism
            </button>
          ) : (
            <Link href="/install" className="dv-btn dv-btn-p" style={{ marginTop: 14 }}>
              <Download size={15} /> Install Prism
            </Link>
          )}
        </div>
      ) : (
        <div className="dv-devlist">
          {devices.map((d) => {
            const dotColor = d.revoked ? 'var(--mut)' : d.active ? 'var(--emerald)' : 'var(--amber)'
            const meta = d.revoked
              ? 'Revoked'
              : d.active
                ? 'Active now'
                : d.lastUsedAt
                  ? `Last seen ${timeAgo(d.lastUsedAt)}`
                  : 'Never used'
            return (
              <div className="dv-devrow" key={d.id}>
                <div className="left">
                  <span className="dv-devdot" style={{ background: dotColor }} />
                  <div style={{ minWidth: 0 }}>
                    <p className="dv-devname">
                      <Monitor size={14} /> macOS overlay
                      {d.revoked && <span className="dv-devbadge">disconnected</span>}
                    </p>
                    <p className="dv-devmeta">
                      {meta}
                      {d.lastSeenIp ? ` · ${d.lastSeenIp}` : ''}
                    </p>
                  </div>
                </div>
                {!d.revoked && (
                  <button className="dv-disconnect" onClick={() => onRevoke(d.id)}>
                    Disconnect
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
