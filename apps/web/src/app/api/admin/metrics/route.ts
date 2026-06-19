import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'
import { fetchAuditLogs } from '@/lib/audit'
import { isGoogleAnalyticsConfigured, fetchGaVisitTotals } from '@/lib/analytics'
import { kvGet, kvSet } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const METRICS_CACHE_KEY = 'admin:metrics:v1'
const METRICS_CACHE_TTL_SECONDS = 60

const INTERNAL_PATH_REGEX = '^/(admin|advertiser|dashboard|auth|api|_next|favicon)'

const TEST_DEPOSIT_MARKER = '[TEST]'

async function fetchRevenueMetrics(adminClient: ReturnType<typeof createAdminClient>) {
  const today = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))

  const [{ data: todayRows }, { data: monthRows }, { data: totalRows }] = await Promise.all([
    adminClient
      .from('advertiser_transactions')
      .select('amount_cents')
      .eq('type', 'deposit')
      .gte('created_at', today.toISOString())
      .not('description', 'ilike', `%${TEST_DEPOSIT_MARKER}%`),
    adminClient
      .from('advertiser_transactions')
      .select('amount_cents')
      .eq('type', 'deposit')
      .gte('created_at', month.toISOString())
      .not('description', 'ilike', `%${TEST_DEPOSIT_MARKER}%`),
    adminClient
      .from('advertiser_transactions')
      .select('amount_cents')
      .eq('type', 'deposit')
      .not('description', 'ilike', `%${TEST_DEPOSIT_MARKER}%`),
  ])

  const sumCents = (rows: { amount_cents: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.amount_cents ?? 0), 0)

  const [{ data: spendRows }, { data: heldRows }] = await Promise.all([
    adminClient.from('campaigns').select('spent_cents'),
    adminClient.from('advertisers').select('balance_cents'),
  ])

  return {
    today: sumCents(todayRows),
    month: sumCents(monthRows),
    total: sumCents(totalRows),
    spend: (spendRows ?? []).reduce((acc, r) => acc + (r.spent_cents ?? 0), 0),
    held: (heldRows ?? []).reduce((acc, r) => acc + (r.balance_cents ?? 0), 0),
  }
}

const ACTIVE_VISIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

async function fetchInternalVisitTotals(adminClient: ReturnType<typeof createAdminClient>) {
  const today = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))
  const week = new Date(today)
  week.setUTCDate(week.getUTCDate() - week.getUTCDay())
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))

  const [
    { count: todayCount },
    { count: weekCount },
    { count: monthCount },
    { data: todayRows },
  ] = await Promise.all([
    adminClient
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .not('path', 'match', INTERNAL_PATH_REGEX),
    adminClient
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', week.toISOString())
      .not('path', 'match', INTERNAL_PATH_REGEX),
    adminClient
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', month.toISOString())
      .not('path', 'match', INTERNAL_PATH_REGEX),
    adminClient
      .from('visits')
      .select('ip')
      .gte('created_at', today.toISOString())
      .not('path', 'match', INTERNAL_PATH_REGEX)
      .not('ip', 'is', null),
  ])

  return {
    today: todayCount ?? 0,
    week: weekCount ?? 0,
    month: monthCount ?? 0,
    uniqueToday: new Set((todayRows ?? []).map((r) => r.ip)).size,
  }
}

async function fetchInternalActiveVisitors(adminClient: ReturnType<typeof createAdminClient>) {
  const activeSince = new Date(Date.now() - ACTIVE_VISIT_WINDOW_MS)

  const { data: activeRows } = await adminClient
    .from('visits')
    .select('country')
    .gte('created_at', activeSince.toISOString())
    .not('path', 'match', INTERNAL_PATH_REGEX)

  const activeByCountry: Record<string, number> = {}
  for (const row of activeRows ?? []) {
    const code = row.country || 'Unknown'
    activeByCountry[code] = (activeByCountry[code] ?? 0) + 1
  }
  const sortedCountries = Object.entries(activeByCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }))

  return {
    active: (activeRows ?? []).length,
    activeByCountry: sortedCountries,
  }
}

async function fetchVisitMetrics(adminClient: ReturnType<typeof createAdminClient>) {
  const [totals, active] = await Promise.all([
    isGoogleAnalyticsConfigured()
      ? fetchGaVisitTotals().catch(() => fetchInternalVisitTotals(adminClient))
      : fetchInternalVisitTotals(adminClient),
    fetchInternalActiveVisitors(adminClient),
  ])

  return { ...totals, ...active }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const auth = await requireAdminAuth(req, user)
    if (auth.response) return auth.response

    const rateLimitResult = await adminRateLimiter.check(getClientIp(req))
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    try {
      const cached = await kvGet(METRICS_CACHE_KEY)
      if (cached) {
        return NextResponse.json(JSON.parse(cached))
      }
    } catch {
      // ignore cache read errors and fetch fresh
    }

    const [
      { data: metricsData, error: metricsError },
      visitMetrics,
      revenueMetrics,
    ] = await Promise.all([
      adminClient.rpc('get_admin_metrics'),
      fetchVisitMetrics(adminClient),
      fetchRevenueMetrics(adminClient),
    ])
    if (metricsError) throw metricsError

    const rawAuditLogs = await fetchAuditLogs(adminClient, { limit: 10, offset: 0 })

    const auditLogs = (rawAuditLogs ?? []).map((log) => ({
      id: log.id,
      action: log.action,
      actorEmail: log.actor_email ?? undefined,
      targetType: log.target_type ?? undefined,
      targetId: log.target_id ?? undefined,
      metadata: (log.metadata ?? undefined) as Record<string, unknown> | undefined,
      createdAt: log.created_at,
    }))

    const metrics = (metricsData ?? {}) as Record<string, unknown>
    metrics.visits = visitMetrics
    metrics.revenue = revenueMetrics

    const responsePayload = { metrics, auditLogs }

    try {
      await kvSet(METRICS_CACHE_KEY, JSON.stringify(responsePayload), {
        ex: METRICS_CACHE_TTL_SECONDS,
      })
    } catch {
      // ignore cache write errors
    }

    return NextResponse.json(responsePayload)
  } catch (err) {
    return handleApiError(err)
  }
}
