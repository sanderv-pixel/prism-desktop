import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

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

    const { searchParams } = req.nextUrl
    const limit = Math.min(250, Math.max(1, Number(searchParams.get('limit') ?? '50')))
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'))

    let query = adminClient
      .from('user_trust')
      .select('*', { count: 'exact' })
      .order('last_seen_at', { ascending: false })

    const search = searchParams.get('search')
    if (search) {
      query = query.ilike('user_id', `%${search}%`)
    }

    const { data: rows, error, count } = await query.range(offset, offset + limit - 1)
    if (error) throw error

    const userIds = (rows ?? []).map((r) => r.user_id)

    const { data: payouts } = await adminClient
      .from('payouts')
      .select('user_id, status, amount_cents')
      .in('user_id', userIds)

    const payoutTotals = new Map<
      string,
      { totalCents: number; pendingCents: number }
    >()
    for (const p of payouts ?? []) {
      const existing = payoutTotals.get(p.user_id) ?? { totalCents: 0, pendingCents: 0 }
      existing.totalCents += p.amount_cents
      if (p.status === 'pending_review') {
        existing.pendingCents += p.amount_cents
      }
      payoutTotals.set(p.user_id, existing)
    }

    const users = (rows ?? []).map((row) => {
      const payoutsForUser = payoutTotals.get(row.user_id) ?? {
        totalCents: 0,
        pendingCents: 0,
      }
      return {
        userId: row.user_id,
        trustScore: row.trust_score,
        impressionCount: row.impression_count,
        flaggedCount: row.flagged_count,
        payoutHold: row.payout_hold,
        totalPayoutsCents: payoutsForUser.totalCents,
        pendingPayoutsCents: payoutsForUser.pendingCents,
        firstSeenAt: row.first_seen_at,
        lastSeenAt: row.last_seen_at,
      }
    })

    return NextResponse.json({ users, total: count ?? 0 })
  } catch (err) {
    return handleApiError(err)
  }
}
