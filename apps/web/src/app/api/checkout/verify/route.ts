import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { stripe } from '@/lib/stripe'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { paymentIntentId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const paymentIntentId = body.paymentIntentId
  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
    return NextResponse.json({ error: 'Invalid payment intent ID' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      throw new ApiError(
        402,
        `Payment status: ${paymentIntent.status}`,
        'PAYMENT_NOT_SUCCEEDED'
      )
    }

    const advertiserId = paymentIntent.metadata?.advertiserId
    if (!advertiserId) {
      throw new ApiError(400, 'Missing advertiser metadata', 'INVALID_METADATA')
    }

    // Ensure the advertiser belongs to the authenticated user.
    const { data: advertiser, error: advertiserError } = await supabase
      .from('advertisers')
      .select('id, user_id')
      .eq('id', advertiserId)
      .single()

    if (advertiserError || !advertiser) {
      throw new ApiError(404, 'Advertiser not found', 'ADVERTISER_NOT_FOUND')
    }

    if (advertiser.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isDeposit = paymentIntent.metadata?.type === 'deposit'
    const amountCents = isDeposit
      ? Number(paymentIntent.metadata?.baseUsdCents ?? paymentIntent.amount ?? 0)
      : paymentIntent.amount ?? 0

    if (!isDeposit || amountCents <= 0) {
      throw new ApiError(400, 'Not a deposit payment', 'INVALID_TYPE')
    }

    // Idempotency: skip if already credited.
    const { data: existing } = await supabase
      .from('advertiser_transactions')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .limit(1)
      .single()

    if (existing) {
      const { data: refreshed } = await supabase
        .from('advertisers')
        .select('balance_cents, status')
        .eq('id', advertiserId)
        .single()

      return NextResponse.json({
        success: true,
        alreadyCredited: true,
        balanceCents: refreshed?.balance_cents ?? 0,
        status: refreshed?.status ?? 'pending',
      })
    }

    const isTestPayment = paymentIntent.livemode === false
    const { data: newBalance, error: creditError } = await supabase.rpc(
      'credit_advertiser_balance',
      {
        p_advertiser_id: advertiserId,
        p_amount_cents: amountCents,
        p_description: isTestPayment
          ? `[TEST] Deposit via Stripe PaymentElement (${paymentIntentId})`
          : `Deposit via Stripe PaymentElement (${paymentIntentId})`,
        p_stripe_payment_intent_id: paymentIntentId,
      }
    )

    if (creditError) throw creditError

    // Capture the saved card so auto-recharge can charge it off-session later.
    const savedPm =
      typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : paymentIntent.payment_method?.id ?? null
    const advUpdate: {
      status: string
      subscription_status: string
      default_payment_method_id?: string
    } = { status: 'active', subscription_status: 'active' }
    if (savedPm) advUpdate.default_payment_method_id = savedPm
    const { error: statusError } = await supabase
      .from('advertisers')
      .update(advUpdate)
      .eq('id', advertiserId)

    if (statusError) throw statusError

    await logAudit({
      action: 'advertiser.deposit',
      targetType: 'advertiser',
      targetId: advertiserId,
      metadata: {
        amountCents,
        newBalance,
        paymentIntentId,
      },
    })

    return NextResponse.json({
      success: true,
      balanceCents: newBalance,
      status: 'active',
    })
  } catch (err) {
    return handleApiError(err)
  }
}
