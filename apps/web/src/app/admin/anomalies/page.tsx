'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAdminSecret } from '@/components/admin/AdminSecretProvider'
import { adminHeaders } from '@/lib/admin/fetch'
import { Button } from '@/components/Button'

interface Anomaly {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: Record<string, unknown> | null
  acknowledged_at: string | null
  created_at: string
}

const severityClasses: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function AdminAnomaliesPage() {
  const { adminSecret } = useAdminSecret()
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [severity, setSeverity] = useState('')
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [processing, setProcessing] = useState<Record<string, boolean>>({})

  async function load() {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '100', offset: '0' })
      if (severity) params.set('severity', severity)
      params.set('acknowledged', String(showAcknowledged))
      const res = await fetch(`/api/admin/anomalies?${params.toString()}`, {
        headers: adminHeaders(adminSecret),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to load anomalies')
      }
      setAnomalies((await res.json()) as Anomaly[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [adminSecret, severity, showAcknowledged])

  async function acknowledge(id: string) {
    setProcessing((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch('/api/admin/anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders(adminSecret) },
        body: JSON.stringify({ anomalyId: id }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to acknowledge')
      }
      setAnomalies((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to acknowledge')
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Fraud & ops</p>
          <h1 className="text-2xl font-semibold">Anomalies</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="rounded border-border"
            />
            Show acknowledged
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600">{error}</div>
      ) : (
        <div className="space-y-4">
          {anomalies.map((a) => (
            <div
              key={a.id}
              className="surface p-5 flex flex-col md:flex-row md:items-start gap-4"
            >
              <div
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  severityClasses[a.severity]
                }`}
              >
                {a.severity}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.type}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(a.created_at).toLocaleString()}
                </p>
                {a.details && Object.keys(a.details).length > 0 && (
                  <pre className="mt-3 text-xs bg-muted/50 rounded-lg p-3 overflow-auto">
                    {JSON.stringify(a.details, null, 2)}
                  </pre>
                )}
              </div>
              {!a.acknowledged_at && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processing[a.id]}
                  onClick={() => acknowledge(a.id)}
                >
                  <CheckCircle2 size={16} className="mr-2" />
                  Acknowledge
                </Button>
              )}
              {a.acknowledged_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  Acknowledged
                </span>
              )}
            </div>
          ))}
          {anomalies.length === 0 && (
            <div className="surface p-8 text-center text-muted-foreground">
              <AlertTriangle className="mx-auto mb-3 text-emerald-600" size={32} />
              No anomalies match the current filters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
