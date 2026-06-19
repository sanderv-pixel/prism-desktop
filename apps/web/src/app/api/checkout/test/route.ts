import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { stripeTest } from '@/lib/stripe'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    enabled: Boolean(stripeTest && process.env.STRIPE_TEST_SECRET_KEY),
  })
}

async function creditTestDeposit(
  advertiserId: string,
  amountCents: number,
  paymentIntentId: string | null,
  description: string
) {
  const adminClient = createAdminClient()

  const idempotencyKey = paymentIntentId ?? `manual-${advertiserId}-${amountCents}`

  const { data: existing } = await adminClient
    .from('advertiser_transactions')
    .select('id')
    .eq('stripe_payment_intent_id', idempotencyKey)
    .maybeSingle()

  if (existing) {
    const { data: refreshed } = await adminClient
      .from('advertisers')
      .select('balance_cents, status')
      .eq('id', advertiserId)
      .single()
    return {
      alreadyCredited: true,
      balanceCents: refreshed?.balance_cents ?? 0,
      status: refreshed?.status ?? 'active',
    }
  }

  const { data: newBalance, error: creditError } = await adminClient.rpc(
    'credit_advertiser_balance',
    {
      p_advertiser_id: advertiserId,
      p_amount_cents: amountCents,
      p_description: description,
      p_stripe_payment_intent_id: idempotencyKey,
    }
  )

  if (creditError) {
    if (creditError.code === '23505') {
      const { data: refreshed } = await adminClient
        .from('advertisers')
        .select('balance_cents, status')
        .eq('id', advertiserId)
        .single()
      return {
        alreadyCredited: true,
        balanceCents: refreshed?.balance_cents ?? 0,
        status: refreshed?.status ?? 'active',
      }
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
      paymentIntentId,
      isTest: true,
    },
  })

  return {
    alreadyCredited: false,
    balanceCents: newBalance ?? 0,
    status: 'active',
  }
}

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

  try {
    const { data: advertiser, error } = await supabase
      .from('advertisers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Advertiser not found. Complete onboarding first.' },
          { status: 404 }
        )
      }
      throw error
    }

    const body = await req.json().catch(() => ({}))
    const amountCents = Math.max(1000, Math.min(10000000, Math.round(body.amountCents ?? 1000)))

    const customer = await stripeTest.customers.create({
      email: advertiser.email,
      name: advertiser.name,
      metadata: { advertiserId: advertiser.id },
    })

    // Direct server-side test charge for automation. No browser redirect needed.
    if (body.direct) {
      const paymentMethod = await stripeTest.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' },
      })

      const paymentIntent = await stripeTest.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: customer.id,
        payment_method: paymentMethod.id,
        payment_method_types: ['card'],
        confirm: true,
        metadata: {
          advertiserId: advertiser.id,
          type: 'deposit',
          baseUsdCents: String(amountCents),
        },
      })

      if (paymentIntent.status !== 'succeeded') {
        throw new ApiError(402, `Test payment did not succeed: ${paymentIntent.status}`, 'PAYMENT_FAILED')
      }

      const result = await creditTestDeposit(
        advertiser.id,
        amountCents,
        paymentIntent.id,
        `[TEST] Test deposit via PaymentIntent (${paymentIntent.id})`
      )

      return NextResponse.json({
        success: true,
        balanceCents: result.balanceCents,
        status: result.status,
        alreadyCredited: result.alreadyCredited,
      })
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://goprism.dev'

    const checkout = await stripeTest.checkout.sessions.create({
      customer: customer.id,
      mode: 'payment',
      payment_method_types: ['card', 'link'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Prism TEST campaign budget deposit' },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/advertiser/dashboard?test_checkout=success&test_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/advertiser/dashboard?test_checkout=canceled`,
      metadata: {
        advertiserId: advertiser.id,
        type: 'deposit',
        baseUsdCents: String(amountCents),
        currency: 'USD',
        rate: '1',
      },
    })

    return NextResponse.json({ url: checkout.url, sessionId: checkout.id })
  } catch (err) {
    return handleApiError(err)
  }
}
