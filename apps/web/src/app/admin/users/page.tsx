'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Search, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useAdminSecret } from '@/components/admin/AdminSecretProvider'
import { adminHeaders } from '@/lib/admin/fetch'
import { Button } from '@/components/Button'

interface BuilderUser {
  userId: string
  trustScore: number
  impressionCount: number
  flaggedCount: number
  payoutHold: boolean
  totalPayoutsCents: number
  pendingPayoutsCents: number
  firstSeenAt: string
  lastSeenAt: string
}

interface UsersResponse {
  users: BuilderUser[]
  total: number
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export default function AdminUsersPage() {
  const { adminSecret } = useAdminSecret()
  const [users, setUsers] = useState<BuilderUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 50
  const [processing, setProcessing] = useState<Record<string, boolean>>({})

  async function load() {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: adminHeaders(adminSecret),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to load users')
      }
      const data = (await res.json()) as UsersResponse
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [adminSecret, offset, search])

  async function toggleHold(userId: string, hold: boolean) {
    setProcessing((prev) => ({ ...prev, [userId]: true }))
    try {
      const res = await fetch(`/api/admin/users/${userId}/release-hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders(adminSecret) },
        body: JSON.stringify({ hold }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to update hold')
      }
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, payoutHold: hold } : u))
      )
      toast.success(json.message ?? (hold ? 'Payout hold enabled.' : 'Payout hold released.'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update hold')
    } finally {
      setProcessing((prev) => ({ ...prev, [userId]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Builders</p>
          <h1 className="text-2xl font-semibold">Users</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setOffset(0)
            }}
            placeholder="Search user ID…"
            className="pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm w-full sm:w-72"
          />
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
                  <th className="px-4 py-3 font-medium">User ID</th>
                  <th className="px-4 py-3 font-medium">Trust</th>
                  <th className="px-4 py-3 font-medium">Impressions</th>
                  <th className="px-4 py-3 font-medium">Payouts</th>
                  <th className="px-4 py-3 font-medium">Hold</th>
                  <th className="px-4 py-3 font-medium">Last seen</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.userId} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[180px]">
                      {u.userId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.trustScore >= 70
                            ? 'bg-emerald-50 text-emerald-700'
                            : u.trustScore >= 40
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {u.trustScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(u.impressionCount)}
                      {u.flaggedCount > 0 && (
                        <span className="ml-2 text-xs text-red-600">
                          {u.flaggedCount} flagged
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatCents(u.totalPayoutsCents)} total</div>
                      {u.pendingPayoutsCents > 0 && (
                        <div className="text-xs text-amber-600">
                          {formatCents(u.pendingPayoutsCents)} pending
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.payoutHold ? (
                        <ShieldAlert size={18} className="text-red-600" />
                      ) : (
                        <ShieldCheck size={18} className="text-emerald-600" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.lastSeenAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={u.payoutHold ? 'primary' : 'outline'}
                        disabled={processing[u.userId]}
                        onClick={() => toggleHold(u.userId, !u.payoutHold)}
                      >
                        {u.payoutHold ? 'Release hold' : 'Hold payouts'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No users found.</div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {formatNumber(offset + 1)}–{formatNumber(Math.min(offset + users.length, total))} of {formatNumber(total)}
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
                disabled={offset + users.length >= total}
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
