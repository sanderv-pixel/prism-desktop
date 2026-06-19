import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { stripeTest } from '@/lib/stripe'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!stripeTest) {
    return NextResponse.json(
      { error: 'Stripe test mode is not configured', code: 'TEST_NOT_CONFIGURED' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { sessionId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sessionId } = body
  if (!sessionId || !sessionId.startsWith('cs_test_')) {
    return NextResponse.json({ error: 'Invalid test session ID' }, { status: 400 })
  }

  try {
    const session = await stripeTest.checkout.sessions.retrieve(sessionId)

    const advertiserId = session.metadata?.advertiserId
    if (!advertiserId) {
      return NextResponse.json(
        { error: 'Session is missing advertiser metadata' },
        { status: 400 }
      )
    }

    const { data: advertiser, error: advertiserError } = await supabase
      .from('advertisers')
      .select('id')
      .eq('id', advertiserId)
      .eq('user_id', user.id)
      .single()

    if (advertiserError || !advertiser) {
      return NextResponse.json(
        { error: 'Advertiser not found or does not belong to you' },
        { status: 403 }
      )
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Test checkout has not been paid yet', paymentStatus: session.payment_status },
        { status: 402 }
      )
    }

    const adminClient = createAdminClient()

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null

    const amountCents = Number(session.metadata?.baseUsdCents ?? session.amount_total ?? 0)
    if (!amountCents || amountCents <= 0) {
      throw new ApiError(400, 'Invalid deposit amount', 'INVALID_AMOUNT')
    }

    // Idempotency: if this test session was already credited, return the current balance.
    const { data: existing } = await adminClient
      .from('advertiser_transactions')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId ?? sessionId)
      .maybeSingle()

    if (existing) {
      const { data: refreshed } = await adminClient
        .from('advertisers')
        .select('balance_cents, status')
        .eq('id', advertiserId)
        .single()
      return NextResponse.json({
        success: true,
        alreadyCredited: true,
        balanceCents: refreshed?.balance_cents ?? 0,
        status: refreshed?.status ?? 'active',
      })
    }

    const { data: newBalance, error: creditError } = await adminClient.rpc(
      'credit_advertiser_balance',
      {
        p_advertiser_id: advertiserId,
        p_amount_cents: amountCents,
        p_description: `[TEST] Test deposit via Stripe Checkout (${session.id})`,
        p_stripe_payment_intent_id: paymentIntentId ?? sessionId,
      }
    )

    if (creditError) {
      if (creditError.code === '23505') {
        const { data: refreshed } = await adminClient
          .from('advertisers')
          .select('balance_cents, status')
          .eq('id', advertiserId)
          .single()
        return NextResponse.json({
          success: true,
          alreadyCredited: true,
          balanceCents: refreshed?.balance_cents ?? 0,
          status: refreshed?.status ?? 'active',
        })
      }
      throw creditError
    }

    const { error: statusError } = await adminClient
      .from('advertisers')
      .update({ status: 'active', subscription_status: 'active' })
      .eq('id', advertiserId)

    if (statusError) throw statusError

    await logAudit({
      action: 'advertiser.deposit',
      targetType: 'advertiser',
      targetId: advertiserId,
      metadata: {
        amountCents,
        newBalance,
        sessionId,
        paymentIntentId,
        isTest: true,
      },
    })

    return NextResponse.json({
      success: true,
      balanceCents: newBalance ?? 0,
      status: 'active',
    })
  } catch (err) {
    return handleApiError(err)
  }
}
