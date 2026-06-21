import { createAdminClient } from '@/utils/supabase/admin'
import { stripe } from '@/lib/stripe'

const THROTTLE_MS = 60 * 60 * 1000 // at most one auto-recharge per hour

// If auto-recharge is enabled and the wallet has dropped below the threshold,
// charge the saved card off-session and credit the balance. Best-effort and
// self-throttling so a burst of low-balance impressions can't double-charge.
export async function maybeAutoRecharge(advertiserId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: a } = await supabase
    .from('advertisers')
    .select(
      'auto_recharge_enabled, auto_recharge_threshold_cents, auto_recharge_amount_cents, balance_cents, stripe_customer_id, default_payment_method_id, last_auto_recharge_at'
    )
    .eq('id', advertiserId)
    .single()

  if (!a || !a.auto_recharge_enabled) return
  if (!a.stripe_customer_id || !a.default_payment_method_id) return
  if ((a.balance_cents ?? 0) >= a.auto_recharge_threshold_cents) return
  if (a.last_auto_recharge_at && Date.now() - new Date(a.last_auto_recharge_at).getTime() < THROTTLE_MS) {
    return
  }

  // Claim the throttle window first so concurrent callers don't both charge.
  const cutoff = new Date(Date.now() - THROTTLE_MS).toISOString()
  const { data: claimed } = await supabase
    .from('advertisers')
    .update({ last_auto_recharge_at: new Date().toISOString() })
    .eq('id', advertiserId)
    .or(`last_auto_recharge_at.is.null,last_auto_recharge_at.lt.${cutoff}`)
    .select('id')
    .maybeSingle()
  if (!claimed) return

  try {
    const pi = await stripe.paymentIntents.create({
      amount: a.auto_recharge_amount_cents,
      currency: 'usd',
      customer: a.stripe_customer_id,
      payment_method: a.default_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: { advertiser_id: advertiserId, type: 'auto_recharge' },
    })
    if (pi.status === 'succeeded') {
      await supabase.rpc('credit_advertiser_balance', {
        p_advertiser_id: advertiserId,
        p_amount_cents: a.auto_recharge_amount_cents,
        p_description: 'Auto-recharge',
        p_stripe_payment_intent_id: pi.id,
      })
    }
  } catch (err) {
    // Off-session charges can fail (declined / authentication required). The
    // throttle stays set so we don't hammer the card; the low-balance and
    // out-of-funds alerts cover the manual path.
    console.error('Auto-recharge failed for advertiser', advertiserId, err)
  }
}
