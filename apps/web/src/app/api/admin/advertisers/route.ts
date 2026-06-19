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
      .from('advertisers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    const search = searchParams.get('search')
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: rows, error, count } = await query.range(offset, offset + limit - 1)
    if (error) throw error

    const advertiserIds = (rows ?? []).map((r) => r.id)

    const [{ data: campaigns }, { data: transactions }] = await Promise.all([
      adminClient
        .from('campaigns')
        .select('advertiser_id, status, budget_cents, spent_cents')
        .in('advertiser_id', advertiserIds),
      adminClient
        .from('advertiser_transactions')
        .select('advertiser_id, type, amount_cents')
        .eq('type', 'deposit')
        .in('advertiser_id', advertiserIds),
    ])

    const campaignStats = new Map<
      string,
      { count: number; active: number; budgetCents: number; spentCents: number }
    >()
    for (const c of campaigns ?? []) {
      const existing = campaignStats.get(c.advertiser_id) ?? {
        count: 0,
        active: 0,
        budgetCents: 0,
        spentCents: 0,
      }
      existing.count++
      if (c.status === 'active') existing.active++
      existing.budgetCents += c.budget_cents
      existing.spentCents += c.spent_cents
      campaignStats.set(c.advertiser_id, existing)
    }

    const depositTotals = new Map<string, number>()
    for (const t of transactions ?? []) {
      depositTotals.set(
        t.advertiser_id,
        (depositTotals.get(t.advertiser_id) ?? 0) + t.amount_cents
      )
    }

    const advertisers = (rows ?? []).map((row) => {
      const stats = campaignStats.get(row.id) ?? {
        count: 0,
        active: 0,
        budgetCents: 0,
        spentCents: 0,
      }
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        website: row.website,
        status: row.status,
        balanceCents: row.balance_cents,
        lifetimeDepositsCents: row.lifetime_deposits_cents,
        totalDepositsCents: depositTotals.get(row.id) ?? 0,
        campaignCount: stats.count,
        activeCampaignCount: stats.active,
        totalBudgetCents: stats.budgetCents,
        totalSpendCents: stats.spentCents,
        createdAt: row.created_at,
      }
    })

    return NextResponse.json({ advertisers, total: count ?? 0 })
  } catch (err) {
    return handleApiError(err)
  }
}
