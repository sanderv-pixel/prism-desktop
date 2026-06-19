import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const TEST_DEPOSIT_MARKER = '[TEST]'

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

    const now = new Date()
    const since = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - days + 1))

    const { data: rows, error } = await adminClient
      .from('advertiser_transactions')
      .select('type, amount_cents, created_at')
      .gte('created_at', since.toISOString())
      .or('type.eq.deposit,type.eq.campaign_allocation')
      .not('description', 'ilike', `%${TEST_DEPOSIT_MARKER}%`)

    if (error) throw error

    const points = new Map<string, { date: string; deposits: number; spend: number }>()
    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setUTCDate(d.getUTCDate() + i)
      const key = d.toISOString().slice(0, 10)
      points.set(key, { date: key, deposits: 0, spend: 0 })
    }

    for (const row of rows ?? []) {
      const key = new Date(row.created_at).toISOString().slice(0, 10)
      const point = points.get(key)
      if (!point) continue
      if (row.type === 'deposit') {
        point.deposits += row.amount_cents
      } else if (row.type === 'campaign_allocation') {
        point.spend += -(row.amount_cents ?? 0)
      }
    }

    const data = Array.from(points.values())

    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}
