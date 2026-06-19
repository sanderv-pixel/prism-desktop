import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'
import { isGoogleAnalyticsConfigured, fetchGaVisitors } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

async function fetchInternalVisitors(
  adminClient: ReturnType<typeof createAdminClient>,
  days: number
) {
  const now = new Date()
  const since = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - days + 1))

  const { data: rows, error } = await adminClient
    .from('visits')
    .select('created_at, ip')
    .gte('created_at', since.toISOString())
    .not('path', 'match', '^/(admin|advertiser|dashboard|auth|api|_next|favicon)')

  if (error) throw error

  const points = new Map<string, { date: string; visits: number; unique: Set<string> }>()
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setUTCDate(d.getUTCDate() + i)
    const key = d.toISOString().slice(0, 10)
    points.set(key, { date: key, visits: 0, unique: new Set<string>() })
  }

  for (const row of rows ?? []) {
    const key = new Date(row.created_at).toISOString().slice(0, 10)
    const point = points.get(key)
    if (!point) continue
    point.visits++
    if (row.ip) point.unique.add(row.ip)
  }

  return Array.from(points.values()).map((p) => ({
    date: p.date,
    visits: p.visits,
    unique_visitors: p.unique.size,
  }))
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

    const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get('days') ?? '30')))

    const data = isGoogleAnalyticsConfigured()
      ? await fetchGaVisitors(days)
      : await fetchInternalVisitors(adminClient, days)

    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}
