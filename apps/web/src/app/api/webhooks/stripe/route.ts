import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/utils/supabase/admin'
import { handleApiError } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import {
  sendDepositReceiptEmail,
  sendAdvertiserApprovedEmail,
  clearLowBalanceEmailFlag,
  getAdvertiserById,
} from '@/lib/email/helpers'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    )
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature', code: 'INVALID_SIGNATURE' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // DB-level idempotency: insert the event ID before processing.
  const { error: idempotencyError } = await supabase
    .from('processed_stripe_events')
    .insert({ stripe_event_id: event.id })

  if (idempotencyError) {
    if (idempotencyError.code === '23505') {
      return NextResponse.json({ received: true, idempotent: true })
    }
    return NextResponse.json(
      { error: 'Failed to record event', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  function syncConnectAccount(account: Stripe.Account) {
    const onboardingComplete = account.details_submitted ?? false
    const payoutsEnabled = account.payouts_enabled ?? false
    const chargesEnabled = account.charges_enabled ?? false

    let kycStatus = 'unverified'
    if (account.requirements?.disabled_reason) {
      kycStatus = 'disabled'
    } else if (payoutsEnabled && chargesEnabled) {
      kycStatus = 'verified'
    } else if (onboardingComplete) {
      kycStatus = 'pending_verification'
    }

    return supabase
      .from('builder_payout_settings')
      .update({
        onboarding_complete: onboardingComplete,
        payouts_enabled: payoutsEnabled,
        charges_enabled: chargesEnabled,
        kyc_status: kycStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_connect_account_id', account.id)
  }

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await syncConnectAccount(account)
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const advertiserId = session.metadata?.advertiserId
        if (!advertiserId) break

        const isDeposit = session.mode === 'payment' && session.metadata?.type === 'deposit'
        // Multi-currency support: we charge in the visitor's local currency but
        // credit the wallet in our base currency (USD cents).
        const amountCents = isDeposit
          ? Number(session.metadata?.baseUsdCents ?? session.amount_total ?? 0)
          : session.amount_total ?? 0

        if (isDeposit && amountCents > 0) {
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null

          const { data: newBalance, error: creditError } = await supabase.rpc(
            'credit_advertiser_balance',
            {
              p_advertiser_id: advertiserId,
              p_amount_cents: amountCents,
              p_description: `Deposit via Stripe Checkout (${session.id})`,
              p_stripe_payment_intent_id: paymentIntentId ?? undefined,
            }
          )

          if (creditError) throw creditError

          const previousAdvertiser = await getAdvertiserById(advertiserId)

          const { error: statusError } = await supabase
            .from('advertisers')
            .update({ status: 'active', subscription_status: 'active' })
            .eq('id', advertiserId)

          if (statusError) throw statusError

          const balanceCents = typeof newBalance === 'number' ? newBalance : 0
          sendDepositReceiptEmail(advertiserId, amountCents, balanceCents).catch(() => {})
          clearLowBalanceEmailFlag(advertiserId).catch(() => {})
          if (previousAdvertiser?.status === 'pending') {
            sendAdvertiserApprovedEmail(advertiserId).catch(() => {})
          }

          await logAudit({
            action: 'advertiser.deposit',
            targetType: 'advertiser',
            targetId: advertiserId,
            metadata: {
              amountCents,
              newBalance,
              mode: session.mode,
              stripeEventId: event.id,
              paymentIntentId,
            },
          })
        } else {
          const update: Record<string, unknown> = { status: 'active' }
          if (session.mode === 'subscription') {
            update.stripe_subscription_id = session.subscription
            update.subscription_status = 'active'
          }

          const { error } = await supabase
            .from('advertisers')
            .update(update as any)
            .eq('id', advertiserId)

          if (error) throw error

          await logAudit({
            action: 'advertiser.activate',
            targetType: 'advertiser',
            targetId: advertiserId,
            metadata: {
              mode: session.mode,
              stripeEventId: event.id,
            },
          })
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const advertiserId = paymentIntent.metadata?.advertiserId
        if (!advertiserId) break

        const isDeposit = paymentIntent.metadata?.type === 'deposit'
        const amountCents = isDeposit
          ? Number(paymentIntent.metadata?.baseUsdCents ?? paymentIntent.amount ?? 0)
          : paymentIntent.amount ?? 0

        if (isDeposit && amountCents > 0) {
          const { data: existing } = await supabase
            .from('advertiser_transactions')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .limit(1)
            .single()

          if (!existing) {
            const { data: newBalance, error: creditError } = await supabase.rpc(
              'credit_advertiser_balance',
              {
                p_advertiser_id: advertiserId,
                p_amount_cents: amountCents,
                p_description: `Deposit via Stripe PaymentElement (${paymentIntent.id})`,
                p_stripe_payment_intent_id: paymentIntent.id,
              }
            )

            if (creditError) throw creditError

            const previousAdvertiser = await getAdvertiserById(advertiserId)

            const { error: statusError } = await supabase
              .from('advertisers')
              .update({ status: 'active', subscription_status: 'active' })
              .eq('id', advertiserId)

            if (statusError) throw statusError

            const balanceCents = typeof newBalance === 'number' ? newBalance : 0
            sendDepositReceiptEmail(advertiserId, amountCents, balanceCents).catch(() => {})
            clearLowBalanceEmailFlag(advertiserId).catch(() => {})
            if (previousAdvertiser?.status === 'pending') {
              sendAdvertiserApprovedEmail(advertiserId).catch(() => {})
            }

            await logAudit({
              action: 'advertiser.deposit',
              targetType: 'advertiser',
              targetId: advertiserId,
              metadata: {
                amountCents,
                newBalance,
                stripeEventId: event.id,
                paymentIntentId: paymentIntent.id,
              },
            })
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const advertiserId = subscription.metadata?.advertiserId
        if (!advertiserId) break

        const status = subscription.status
        const newAdvertiserStatus =
          status === 'active' || status === 'trialing' ? 'active' : 'pending'
        const { error } = await supabase
          .from('advertisers')
          .update({
            subscription_status: status,
            status: newAdvertiserStatus,
          })
          .eq('id', advertiserId)

        if (error) throw error

        await logAudit({
          action: newAdvertiserStatus === 'active' ? 'advertiser.activate' : 'advertiser.deactivate',
          targetType: 'advertiser',
          targetId: advertiserId,
          metadata: {
            subscriptionStatus: status,
            stripeEventId: event.id,
          },
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const advertiserId =
          invoice.subscription_details?.metadata?.advertiserId ??
          invoice.lines?.data[0]?.metadata?.advertiserId
        if (!advertiserId) break

        const { error } = await supabase
          .from('advertisers')
          .update({ status: 'pending', subscription_status: 'past_due' })
          .eq('id', advertiserId)

        if (error) throw error

        await logAudit({
          action: 'advertiser.deactivate',
          targetType: 'advertiser',
          targetId: advertiserId,
          metadata: {
            reason: 'invoice.payment_failed',
            stripeEventId: event.id,
          },
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    // Do not delete the idempotency row on failure; Stripe will retry and
    // we need the next attempt to skip processing, then surface the error.
    return handleApiError(err)
  }
}
