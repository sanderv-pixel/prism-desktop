'use client'

import { useEffect, useState } from 'react'
import { Loader2, ClipboardList } from 'lucide-react'
import { useAdminSecret } from '@/components/admin/AdminSecretProvider'
import { adminHeaders } from '@/lib/admin/fetch'
import { Button } from '@/components/Button'

interface AuditLog {
  id: string
  action: string
  actor_email: string | null
  actor_id: string | null
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export default function AdminAuditLogsPage() {
  const { adminSecret } = useAdminSecret()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 50

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
        if (action) params.set('action', action)
        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
          headers: adminHeaders(adminSecret),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? 'Failed to load audit logs')
        }
        const data = (await res.json()) as AuditLog[]
        setLogs(data)
        // API does not return total count; estimate from returned length.
        setTotal(data.length < limit ? offset + data.length : offset + data.length + 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [adminSecret, action, offset])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Compliance</p>
          <h1 className="text-2xl font-semibold">Audit logs</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              setOffset(0)
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All actions</option>
            <option value="payout.approve">payout.approve</option>
            <option value="payout.reject">payout.reject</option>
            <option value="admin.campaign.approve">admin.campaign.approve</option>
            <option value="admin.campaign.reject">admin.campaign.reject</option>
            <option value="admin.user.set_hold">admin.user.set_hold</option>
            <option value="admin.user.release_hold">admin.user.release_hold</option>
            <option value="advertiser.deposit">advertiser.deposit</option>
            <option value="campaign.create">campaign.create</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600">{error}</div>
      ) : (
        <>
          <div className="surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.action}</td>
                    <td className="px-4 py-3">
                      {log.actor_email ?? '—'}
                      {log.actor_id && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {log.actor_id.slice(0, 8)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.target_type && log.target_id ? (
                        <span className="text-xs">
                          {log.target_type} · {log.target_id.slice(0, 8)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.ip_address ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <ClipboardList className="mx-auto mb-3" size={32} />
                No audit logs match the filters.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1}–{Math.min(offset + logs.length, total)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset((v) => Math.max(0, v - limit))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={logs.length < limit}
                onClick={() => setOffset((v) => v + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
