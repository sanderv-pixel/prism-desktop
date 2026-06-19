import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const adminClient = createAdminClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://goprism.dev'

    const [{ data: ownReferral }, { count: referredCount }, { data: referralImpressions }] = await Promise.all([
      adminClient.from('referrals').select('referral_code').eq('user_id', user.id).maybeSingle(),
      adminClient.from('referrals').select('*', { count: 'exact', head: true }).eq('referred_by', user.id),
      adminClient
        .from('impressions')
        .select('referrer_payout_cents, validated, payout_hold')
        .eq('referrer_user_id', user.id),
    ])

    const referralEarningsCents = (referralImpressions ?? [])
      .filter((i) => i.validated && !i.payout_hold)
      .reduce((sum, i) => sum + i.referrer_payout_cents, 0)

    const referralCode = ownReferral?.referral_code ?? null
    const referralLink = referralCode ? `${siteUrl}/auth/sign-up?ref=${referralCode}` : null

    return NextResponse.json({
      referralCode,
      referralLink,
      referredCount: referredCount ?? 0,
      referralEarningsCents,
    })
  } catch (err) {
    console.error('GET /api/referrals error:', err)
    return NextResponse.json({ error: "We couldn't load your referral data right now. Please refresh or try again later.", code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
