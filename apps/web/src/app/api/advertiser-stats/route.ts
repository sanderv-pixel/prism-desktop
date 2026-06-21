import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { computeAdvertiserStats } from '@/lib/advertiserStats'

export const dynamic = 'force-dynamic'

function parseRange(searchParams: URLSearchParams): number | 'all' {
  const raw = searchParams.get('range')
  if (raw === 'all') return 'all'
  const n = parseInt(raw ?? '', 10)
  if ([7, 30, 90].includes(n)) return n
  return 30
}

export async function GET(req: NextRequest) {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin client is safe here because we filter to the authenticated user's advertiser.
  const supabase = createAdminClient()

  try {
    const { data: advertiser, error: advertiserError } = await supabase
      .from('advertisers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (advertiserError) {
      if (advertiserError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
      }
      throw advertiserError
    }

    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('advertiser_id', advertiser.id)

    if (campaignsError) throw campaignsError

    const typedCampaigns = (campaigns ?? []) as any[]
    const campaignIds = typedCampaigns.map((c) => c.id)

    const range = parseRange(req.nextUrl.searchParams)
    const days = range === 'all' ? 365 : range
    const startIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Parallel query impressions, clicks, and conversions.
    const [impressionsResult, clicksResult, conversionsResult, dailySpendResult] =
      campaignIds.length > 0
        ? await Promise.all([
            supabase
              .from('impressions')
              .select('campaign_id, auction_price_cpm, session_id, context, source, created_at')
              .in('campaign_id', campaignIds)
              .gte('created_at', startIso),
            supabase
              .from('clicks')
              .select('campaign_id, created_at')
              .in('campaign_id', campaignIds)
              .gte('created_at', startIso),
            supabase
              .from('conversions')
              .select('campaign_id, value_cents, created_at')
              .in('campaign_id', campaignIds)
              .gte('created_at', startIso),
            supabase
              .from('campaign_daily_spend')
              .select('campaign_id, spend_date, spent_cents, impressions')
              .in('campaign_id', campaignIds)
              .gte('spend_date', startIso.slice(0, 10)),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ]

    const result = computeAdvertiserStats(
      advertiser,
      typedCampaigns,
      impressionsResult.data ?? [],
      clicksResult.data ?? [],
      conversionsResult.data ?? [],
      range,
      undefined,
      dailySpendResult.data ?? []
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/advertiser-stats error:', err)
    return NextResponse.json(
      { error: "We couldn't load your stats right now. Please refresh or try again later.", code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
