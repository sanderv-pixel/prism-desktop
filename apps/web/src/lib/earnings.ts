import type { createAdminClient } from '@/utils/supabase/admin'
import { MIN_PAYOUT_CENTS, CREATOR_SHARE_PERCENT } from './payouts'

export interface OverlayEarnings {
  balanceCents: number
  earnedTodayCents: number
  payoutThresholdCents: number
  splitPercent: number
  /** Most recent eligible view's credit, or null if there is none yet. */
  perViewCents: number | null
}

type Admin = ReturnType<typeof createAdminClient>

/**
 * Earnings snapshot for the overlay panel. Reuses the exact sources the creator
 * dashboard uses: `creator_earnings_totals` for all-time own + referral earnings,
 * the payouts table for paid + in-flight, and a today-window impression sum.
 * Money is stored in millicents (1 cent = 1000 millicents), so cents = mc / 1000.
 *
 * `userIds` is the earner's id set (auth user id + linked anonymous device ids);
 * `referrerId` is the auth user id (used for referral earnings + payouts).
 */
export async function getOverlayEarnings(
  admin: Admin,
  userIds: string[],
  referrerId: string,
): Promise<OverlayEarnings> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const startOfDayIso = startOfDay.toISOString()

  // `.bind(admin)` is required: a bare `admin.rpc` reference loses its `this`.
  const rpc = admin.rpc.bind(admin) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown }>

  const [totalsRes, paidRes, inflightRes, todayOwnRes, todayRefRes, lastViewRes] = await Promise.all([
    rpc('creator_earnings_totals', { p_user_ids: userIds, p_referrer_id: referrerId }),
    admin.from('payouts').select('amount_cents').eq('user_id', referrerId).eq('status', 'paid'),
    admin.from('payouts').select('amount_cents').eq('user_id', referrerId).eq('status', 'pending_review'),
    admin
      .from('impressions')
      .select('payout_millicents')
      .in('user_id', userIds)
      .eq('validated', true)
      .eq('payout_hold', false)
      .gte('created_at', startOfDayIso),
    admin
      .from('impressions')
      .select('referrer_payout_millicents')
      .eq('referrer_user_id', referrerId)
      .eq('validated', true)
      .eq('payout_hold', false)
      .gte('created_at', startOfDayIso),
    admin
      .from('impressions')
      .select('payout_millicents')
      .in('user_id', userIds)
      .eq('validated', true)
      .eq('payout_hold', false)
      .gt('payout_millicents', 0)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const totals = ((totalsRes.data as { own_millicents?: number; referral_millicents?: number }[]) ?? [])[0] ?? {
    own_millicents: 0,
    referral_millicents: 0,
  }
  const totalEarningsCents = (Number(totals.own_millicents ?? 0) + Number(totals.referral_millicents ?? 0)) / 1000

  const sum = (rows: { amount_cents: number }[] | null) => (rows ?? []).reduce((s, p) => s + p.amount_cents, 0)
  const paidCents = sum(paidRes.data as { amount_cents: number }[] | null)
  const inflightCents = sum(inflightRes.data as { amount_cents: number }[] | null)
  const balanceCents = Math.max(0, totalEarningsCents - paidCents - inflightCents)

  const todayOwnMc = ((todayOwnRes.data as { payout_millicents: number }[]) ?? []).reduce(
    (s, i) => s + (i.payout_millicents ?? 0),
    0,
  )
  const todayRefMc = ((todayRefRes.data as { referrer_payout_millicents: number }[]) ?? []).reduce(
    (s, i) => s + (i.referrer_payout_millicents ?? 0),
    0,
  )
  const earnedTodayCents = (todayOwnMc + todayRefMc) / 1000

  const lastViewMc = ((lastViewRes.data as { payout_millicents: number }[]) ?? [])[0]?.payout_millicents
  const perViewCents = typeof lastViewMc === 'number' && lastViewMc > 0 ? lastViewMc / 1000 : null

  return {
    balanceCents,
    earnedTodayCents,
    payoutThresholdCents: MIN_PAYOUT_CENTS,
    splitPercent: CREATOR_SHARE_PERCENT,
    perViewCents,
  }
}
