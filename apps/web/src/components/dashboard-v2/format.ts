/** Shared formatters for the v2 dashboards (match the app's existing style). */

export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`

/** Like formatCents but keeps precision for sub-cent per-view payouts, so tiny
 *  amounts don't all collapse to $0.00. Aggregates still read as $X.XX. */
export const formatPayout = (cents: number): string => {
  const d = cents / 100
  const max = Math.abs(d) > 0 && Math.abs(d) < 0.01 ? 4 : 2
  return `$${d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: max })}`
}

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('en-US').format(Math.round(n))

export const compact = (n: number): string =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/** Best-effort surface/context string from the impression's opaque context blob. */
export function describeContext(context: unknown, fallback: string): string {
  if (context && typeof context === 'object') {
    const c = context as Record<string, unknown>
    const tool = c.tool ?? c.app ?? c.editor ?? c.client ?? c.surface
    const mode = c.mode ?? c.agent ?? c.action
    if (typeof tool === 'string' && typeof mode === 'string') return `${tool} · ${mode}`
    if (typeof tool === 'string') return tool
  }
  return fallback
}
