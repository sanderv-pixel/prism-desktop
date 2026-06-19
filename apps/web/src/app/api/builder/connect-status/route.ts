import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { stripe } from '@/lib/stripe'
import { handleApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

function kycStatusFromAccount(
  account: Stripe.Account
): {
  onboardingComplete: boolean
  payoutsEnabled: boolean
  chargesEnabled: boolean
  kycStatus: string
} {
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

  return { onboardingComplete, payoutsEnabled, chargesEnabled, kycStatus }
}

export async function GET() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await adminClient
      .from('builder_payout_settings')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!settings?.stripe_connect_account_id) {
      return NextResponse.json({
        onboardingComplete: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        kycStatus: 'unverified',
      })
    }

    const account = await stripe.accounts.retrieve(
      settings.stripe_connect_account_id
    )
    const status = kycStatusFromAccount(account)

    const needsUpdate =
      settings.onboarding_complete !== status.onboardingComplete ||
      settings.payouts_enabled !== status.payoutsEnabled ||
      settings.charges_enabled !== status.chargesEnabled ||
      settings.kyc_status !== status.kycStatus

    if (needsUpdate) {
      await adminClient
        .from('builder_payout_settings')
        .update({
          onboarding_complete: status.onboardingComplete,
          payouts_enabled: status.payoutsEnabled,
          charges_enabled: status.chargesEnabled,
          kyc_status: status.kycStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', user.id)
    }

    return NextResponse.json(status)
  } catch (err) {
    return handleApiError(err)
  }
}
