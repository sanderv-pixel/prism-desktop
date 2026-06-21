import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { logAudit } from '@/lib/audit'
import { getProvider } from '@/lib/payouts/providers'
import {
  sendPayoutRequestedEmail,
  sendAdminPayoutRequestedEmail,
} from '@/lib/email/helpers'
import {
  RateLimiter,
  getClientIp,
  checkRateLimit,
} from '@/lib/api/rate-limit'

export const dynamic = 'force-dynamic'

const MIN_PAYOUT_CENTS = 2000 // $20.00
const payoutRateLimiter = new RateLimiter(3, 60 * 60 * 1000)

async function getLinkedUserIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: identities } = await supabase
    .from('builder_identities')
    .select('anonymous_user_id')
    .eq('auth_user_id', userId)

  return [userId, ...(identities ?? []).map((i) => i.anonymous_user_id)]
}

async function getPayoutSettings(userId: string) {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('builder_payout_settings')
    .select('payout_provider, recipient_details')
    .eq('auth_user_id', userId)
    .maybeSingle()

  const provider = data?.payout_provider ?? null
  const recipientDetails = (data?.recipient_details as Record<string, unknown> | null) ?? null
  const payoutProvider = provider ? getProvider(provider) : undefined
  const configErrors = provider && payoutProvider ? payoutProvider.validate(recipientDetails ?? {}) : []

  return {
    provider,
    recipientDetails,
    configured: Boolean(provider && recipientDetails && configErrors.length === 0),
    configErrors,
  }
}

async function getTotalEarningsCents(userId: string, userIds: string[]) {
  // All-time own earnings + lifelong referral commission, summed in SQL (uncapped,
  // not subject to the 1000-row fetch cap). Admin client so RLS doesn't zero it.
  const admin = createAdminClient()
  const { data } = await admin.rpc('creator_earnings_totals', {
    p_user_ids: userIds,
    p_referrer_id: userId,
  })
  const t = data?.[0] ?? { own_millicents: 0, referral_millicents: 0 }
  return Math.floor((Number(t.own_millicents) + Number(t.referral_millicents)) / 1000)
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userIds = await getLinkedUserIds(supabase, user.id)

    const [
      totalEarningsCents,
      { data: payouts },
      { data: trust },
      payoutSettings,
    ] = await Promise.all([
      getTotalEarningsCents(user.id, userIds),
      supabase
        .from('payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('user_trust').select('trust_score, payout_hold').eq('user_id', user.id).maybeSingle(),
      getPayoutSettings(user.id),
    ])

    const paidOutCents = (payouts ?? [])
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount_cents, 0)
    const inFlightCents = (payouts ?? [])
      .filter((p) => p.status === 'pending_review' || p.status === 'approved')
      .reduce((sum, p) => sum + p.amount_cents, 0)
    const availableCents = totalEarningsCents - paidOutCents - inFlightCents

    const payoutBlocked = trust?.payout_hold ?? false

    return NextResponse.json({
      payouts: (payouts ?? []).map((p) => ({
        id: p.id,
        amountCents: p.amount_cents,
        status: p.status,
        provider: p.provider,
        createdAt: p.created_at,
        paidAt: p.paid_at,
      })),
      availableCents: Math.max(0, availableCents),
      minPayoutCents: MIN_PAYOUT_CENTS,
      payoutEnabled:
        !payoutBlocked &&
        payoutSettings.configured &&
        availableCents >= MIN_PAYOUT_CENTS,
      payoutBlocked,
      payoutSettings,
    })
  } catch (err) {
    console.error('GET /api/dashboard/payouts error:', err)
    return NextResponse.json(
      { error: "We couldn't load your payout history right now. Please refresh or try again later.", code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rateLimited = await checkRateLimit(payoutRateLimiter, `payouts:${user.id}`)
    if (rateLimited) return rateLimited

    const userIds = await getLinkedUserIds(supabase, user.id)

    const [totalEarningsCents, { data: payouts }, { data: trust }, payoutSettings] = await Promise.all([
      getTotalEarningsCents(user.id, userIds),
      supabase.from('payouts').select('*').eq('user_id', user.id),
      supabase.from('user_trust').select('trust_score, payout_hold').eq('user_id', user.id).maybeSingle(),
      getPayoutSettings(user.id),
    ])

    if (trust?.payout_hold) {
      return NextResponse.json(
        { error: 'Payouts are currently on hold for this account.', code: 'PAYOUT_HOLD' },
        { status: 403 }
      )
    }

    if (!payoutSettings.configured) {
      return NextResponse.json(
        {
          error: 'Payout method is not configured. Add your Wise or Payoneer details first.',
          code: 'PAYOUT_METHOD_REQUIRED',
          configErrors: payoutSettings.configErrors,
        },
        { status: 403 }
      )
    }

    const paidOrInFlightCents = (payouts ?? []).reduce(
      (sum, p) =>
        sum + (p.status === 'paid' || p.status === 'pending_review' || p.status === 'approved' ? p.amount_cents : 0),
      0
    )
    const availableCents = totalEarningsCents - paidOrInFlightCents

    if (availableCents < MIN_PAYOUT_CENTS) {
      return NextResponse.json(
        { error: `Minimum payout is $${(MIN_PAYOUT_CENTS / 100).toFixed(2)}` },
        { status: 400 }
      )
    }

    // Optional partial withdrawal: default to the full available balance.
    const body = (await req.json().catch(() => ({}))) as { amountCents?: number }
    const requestedCents =
      typeof body?.amountCents === 'number' ? Math.round(body.amountCents) : availableCents
    if (requestedCents < MIN_PAYOUT_CENTS) {
      return NextResponse.json(
        { error: `Minimum payout is $${(MIN_PAYOUT_CENTS / 100).toFixed(2)}` },
        { status: 400 }
      )
    }
    if (requestedCents > availableCents) {
      return NextResponse.json({ error: 'Amount exceeds your available balance.' }, { status: 400 })
    }

    const { data: payout, error } = await supabase
      .from('payouts')
      .insert({
        user_id: user.id,
        amount_cents: requestedCents,
        status: 'pending_review',
      })
      .select()
      .single()

    if (error) {
      // Unique partial index: only one in-flight payout per user at a time.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A payout request is already pending review', code: 'PAYOUT_EXISTS' },
          { status: 409 }
        )
      }
      throw error
    }

    await logAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'payout.request',
      targetType: 'payout',
      targetId: payout.id,
      metadata: {
        amountCents: payout.amount_cents,
        linkedUserCount: userIds.length,
        provider: payoutSettings.provider,
      },
      ipAddress: getClientIp(req),
    })

    sendPayoutRequestedEmail(user.id, payout.amount_cents).catch(() => {})
    sendAdminPayoutRequestedEmail(user.id, payout.amount_cents).catch(() => {})

    return NextResponse.json({
      id: payout.id,
      amountCents: payout.amount_cents,
      status: payout.status,
      createdAt: payout.created_at,
    })
  } catch (err) {
    console.error('POST /api/dashboard/payouts error:', err)
    return NextResponse.json(
      { error: "We couldn't submit your payout request right now. Please try again later.", code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
