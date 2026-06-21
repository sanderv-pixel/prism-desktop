import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

// Billing view: a unified ledger of top-ups (from advertiser_transactions) and ad
// spend (aggregated per day per campaign from campaign_daily_spend, since pay-as-you-go
// spend isn't written as per-impression rows). Each top-up is a receipt.
export async function GET() {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  try {
    const { data: advertiser, error: advErr } = await supabase
      .from('advertisers')
      .select('id, name, email, balance_cents, lifetime_deposits_cents')
      .eq('user_id', user.id)
      .single()
    if (advErr) {
      if (advErr.code === 'PGRST116') {
        return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
      }
      throw advErr
    }

    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, title, spent_cents')
      .eq('advertiser_id', advertiser.id)
    const campaignTitle = new Map((campaigns ?? []).map((c) => [c.id, c.title]))
    const campaignIds = (campaigns ?? []).map((c) => c.id)
    const lifetimeSpentCents = (campaigns ?? []).reduce((s, c) => s + (c.spent_cents ?? 0), 0)

    const [{ data: deposits }, { data: dailySpend }] = await Promise.all([
      supabase
        .from('advertiser_transactions')
        .select('id, type, amount_cents, balance_after_cents, description, stripe_payment_intent_id, created_at, is_test')
        .eq('advertiser_id', advertiser.id)
        .eq('type', 'deposit')
        .order('created_at', { ascending: false }),
      campaignIds.length > 0
        ? supabase
            .from('campaign_daily_spend')
            .select('campaign_id, spend_date, spent_cents, impressions')
            .in('campaign_id', campaignIds)
            .gt('spent_cents', 0)
            .order('spend_date', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ])

    const depositRows = (deposits ?? []).map((d) => ({
      id: d.id,
      kind: 'deposit' as const,
      date: d.created_at,
      description: d.description ?? 'Account top-up',
      amountCents: d.amount_cents, // positive
      isTest: d.is_test ?? false,
      receiptId: d.stripe_payment_intent_id ?? d.id,
    }))

    const spendRows = (dailySpend ?? []).map((r) => ({
      id: `spend-${r.campaign_id}-${r.spend_date}`,
      kind: 'spend' as const,
      date: `${r.spend_date}T23:59:59.000Z`,
      description: `Ad spend · ${campaignTitle.get(r.campaign_id) ?? 'Campaign'}`,
      amountCents: -(r.spent_cents ?? 0), // negative
      impressions: r.impressions ?? 0,
      isTest: false,
      receiptId: null as string | null,
    }))

    const transactions = [...depositRows, ...spendRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return NextResponse.json({
      advertiser: { name: advertiser.name, email: advertiser.email },
      summary: {
        balanceCents: advertiser.balance_cents ?? 0,
        lifetimeDepositsCents: advertiser.lifetime_deposits_cents ?? 0,
        lifetimeSpentCents,
      },
      transactions,
    })
  } catch (err) {
    console.error('GET /api/advertiser/billing error:', err)
    return NextResponse.json(
      { error: "We couldn't load your billing history right now.", code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
