import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'

export const dynamic = 'force-dynamic'

const DEMO_EMAIL = 'demo@goprism.dev'
const DEMO_PASSWORD = 'demopassword123'

const demoAuthRateLimiter = new RateLimiter(10, 60 * 60 * 1000)

function isDemoAuthEnabled(): boolean {
  const value = process.env.DEMO_AUTH_ENABLED
  return value === 'true' || value === '1'
}

export async function POST(req: NextRequest) {
  // Demo auth must never be available in production builds.
  if (process.env.NODE_ENV === 'production' || !isDemoAuthEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const rateLimitResult = await demoAuthRateLimiter.check(getClientIp(req))
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
  }

  const secret = req.headers.get('x-demo-auth-secret') ?? ''
  const expectedSecret = process.env.DEMO_AUTH_SECRET

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Service not configured', code: 'CONFIGURATION_ERROR' },
      { status: 500 }
    )
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    let demoUser = existingUsers?.users.find((u) => u.email === DEMO_EMAIL)

    if (demoUser) {
      if (!demoUser.email_confirmed_at) {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          demoUser.id,
          { email_confirm: true }
        )
        if (updateError) throw updateError
      }
    } else {
      const { data: created, error: createError } =
        await adminClient.auth.admin.createUser({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          email_confirm: true,
        })
      if (createError) throw createError
      demoUser = created.user
    }

    if (!demoUser) {
      throw new Error('Could not create or find demo user')
    }

    const demoAdvertisers = [
      {
        name: 'Railway',
        website: 'https://railway.app',
        campaign: {
          title: 'Railway Launch Week',
          copy: 'Ship faster on Railway →',
          url: 'https://railway.app',
          icon_url: 'https://placehold.co/64x64.png?text=R',
          max_bid_cpm: 1200,
          budget_cents: 25000,
          spent_cents: 4200,
          contexts: [
            'chatgpt',
            'claude',
            'general',
            'productivity',
            'business',
            'saas',
            'developers',
            'cursor',
            'vscode',
            'nextjs',
            'react',
            'typescript',
          ],
        },
      },
      {
        name: 'Supabase',
        website: 'https://supabase.com',
        campaign: {
          title: 'Supabase Launch Week',
          copy: 'Open source Firebase alternative →',
          url: 'https://supabase.com',
          icon_url: 'https://placehold.co/64x64.png?text=S',
          max_bid_cpm: 1500,
          budget_cents: 50000,
          spent_cents: 8900,
          contexts: [
            'chatgpt',
            'general',
            'productivity',
            'business',
            'developers',
            'typescript',
            'postgresql',
            'cursor',
            'nextjs',
            'react',
            'prisma',
            'supabase',
          ],
        },
      },
      {
        name: 'Lovable',
        website: 'https://lovable.dev',
        campaign: {
          title: 'Lovable Launch Week',
          copy: 'Build apps with AI, no code needed →',
          url: 'https://lovable.dev',
          icon_url: 'https://placehold.co/64x64.png?text=L',
          max_bid_cpm: 1300,
          budget_cents: 30000,
          spent_cents: 2100,
          contexts: [
            'chatgpt',
            'claude',
            'general',
            'productivity',
            'business',
            'vibecoders',
            'lovable',
            'v0',
            'bolt',
            'replit',
          ],
        },
      },
      {
        name: 'Hired',
        website: 'https://hired.com',
        campaign: {
          title: 'Tech Jobs Board',
          copy: 'Hired by top startups in 48h →',
          url: 'https://hired.com',
          icon_url: 'https://placehold.co/64x64.png?text=H',
          max_bid_cpm: 1600,
          budget_cents: 40000,
          spent_cents: 1500,
          contexts: [
            'job-seeking',
            'developers',
            'chatgpt',
            'claude',
            'general',
            'business',
            'cursor',
            'vscode',
          ],
        },
      },
      {
        name: 'Atlas Digital',
        website: 'https://example.com/portfolio',
        campaign: {
          title: 'Senior Full-Stack Engineer',
          copy: 'Available full-stack engineer · hire me →',
          url: 'https://example.com/portfolio',
          icon_url: 'https://placehold.co/64x64.png?text=E',
          max_bid_cpm: 1400,
          budget_cents: 20000,
          spent_cents: 800,
          contexts: [
            'hiring',
            'recruiters',
            'hiring-managers',
            'founders',
            'business',
            'chatgpt',
            'claude',
            'cursor',
            'vscode',
          ],
        },
      },
    ]

    let firstAdvertiserId: string | null = null

    for (const { name, website, campaign: campaignSeed } of demoAdvertisers) {
      const { data: existingAdvertiser } = await adminClient
        .from('advertisers')
        .select('id')
        .eq('user_id', demoUser.id)
        .eq('name', name)
        .maybeSingle()

      let advertiserId = existingAdvertiser?.id
      if (!advertiserId) {
        const { data: advertiser, error: advertiserError } = await adminClient
          .from('advertisers')
          .insert({
            user_id: demoUser.id,
            email: `demo+${name.toLowerCase().replace(/\s+/g, '-')}@goprism.dev`,
            name,
            website,
            status: 'active',
            subscription_status: 'active',
            stripe_customer_id: 'cus_demo',
            stripe_subscription_id: 'sub_demo',
            balance_cents: 100000,
            lifetime_deposits_cents: 100000,
          })
          .select('id')
          .single()
        if (advertiserError) throw advertiserError
        advertiserId = advertiser.id
      } else {
        await adminClient
          .from('advertisers')
          .update({
            status: 'active',
            subscription_status: 'active',
            balance_cents: 100000,
            lifetime_deposits_cents: 100000,
          })
          .eq('id', advertiserId)
      }

      if (!firstAdvertiserId) {
        firstAdvertiserId = advertiserId
      }

      const campaign = {
        advertiser_id: advertiserId,
        ...campaignSeed,
        objective: 'awareness',
        bid_type: 'cpm',
        status: 'active',
      }

      const { data: existingCampaign } = await adminClient
        .from('campaigns')
        .select('id')
        .eq('advertiser_id', advertiserId)
        .eq('title', campaign.title)
        .maybeSingle()

      if (existingCampaign?.id) {
        const { error: updateError } = await adminClient
          .from('campaigns')
          .update({
            contexts: campaign.contexts,
            objective: campaign.objective,
            bid_type: campaign.bid_type,
            max_bid_cpm: campaign.max_bid_cpm,
            budget_cents: campaign.budget_cents,
            spent_cents: campaign.spent_cents,
            status: campaign.status,
            icon_url: campaign.icon_url,
            daily_budget_cents: campaign.budget_cents / 10,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            frequency_cap: 3,
            frequency_window_hours: 24,
          })
          .eq('id', existingCampaign.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await adminClient
          .from('campaigns')
          .insert(campaign)
        if (insertError) throw insertError
      }
    }

    const advertiserId = firstAdvertiserId

    // Seed published CPM floors.
    const floorContexts = new Set<string>()
    demoAdvertisers.forEach((a) => a.campaign.contexts.forEach((ctx) => floorContexts.add(ctx)))
    const floorRows = Array.from(floorContexts).map((context) => ({
      context,
      floor_cpm: 800,
    }))
    await adminClient.from('market_floors').upsert(floorRows, { onConflict: 'context' })

    const { count: impressionCount } = await adminClient
      .from('impressions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', demoUser.id)

    if ((impressionCount ?? 0) === 0) {
      const daysAgo = (n: number) => {
        const d = new Date()
        d.setDate(d.getDate() - n)
        return d.toISOString()
      }

      const { data: campaign } = await adminClient
        .from('campaigns')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single()

      const campaignId = campaign?.id ?? advertiserId

      await adminClient.from('impressions').insert([
        {
          user_id: demoUser.id,
          session_id: 'demo-session-1',
          campaign_id: campaignId,
          context: JSON.stringify({ editor: 'cursor', aiTool: 'cursor' }),
          validated: true,
          duration_ms: 1200,
          auction_price_cpm: 1200,
          currency: 'usd',
          payout_cents: 1,
          payout_millicents: 1000,
          created_at: daysAgo(0),
        },
        {
          user_id: demoUser.id,
          session_id: 'demo-session-2',
          campaign_id: campaignId,
          context: JSON.stringify({ editor: 'vscode', aiTool: 'copilot' }),
          validated: true,
          duration_ms: 950,
          auction_price_cpm: 1200,
          currency: 'usd',
          payout_cents: 1,
          payout_millicents: 1000,
          created_at: daysAgo(1),
        },
        {
          user_id: demoUser.id,
          session_id: 'demo-session-3',
          campaign_id: campaignId,
          context: JSON.stringify({ editor: 'cursor', aiTool: 'cursor' }),
          validated: true,
          duration_ms: 1500,
          auction_price_cpm: 1200,
          currency: 'usd',
          payout_cents: 2,
          payout_millicents: 2000,
          created_at: daysAgo(2),
        },
      ])

      const { count: clickCount } = await adminClient
        .from('clicks')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)

      if ((clickCount ?? 0) === 0) {
        await adminClient.from('clicks').insert([
          {
            campaign_id: campaignId,
            user_id: demoUser.id,
            session_id: 'demo-session-1',
            url: 'https://railway.app',
            redirected: true,
            created_at: daysAgo(0),
          },
          {
            campaign_id: campaignId,
            user_id: demoUser.id,
            session_id: 'demo-session-2',
            url: 'https://supabase.com',
            redirected: true,
            created_at: daysAgo(1),
          },
        ])
      }

      const { count: conversionCount } = await adminClient
        .from('conversions')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)

      if ((conversionCount ?? 0) === 0) {
        await adminClient.from('conversions').insert({
          campaign_id: campaignId,
          user_id: demoUser.id,
          event_name: 'purchase',
          value_cents: 4999,
          created_at: daysAgo(0),
        })
      }

      await adminClient.from('payouts').insert({
        user_id: demoUser.id,
        amount_cents: 500,
        status: 'paid',
        created_at: daysAgo(10),
        paid_at: daysAgo(9),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Demo auth setup error:', err)
    return NextResponse.json(
      { error: "Demo setup failed. Please try again or contact support if the problem continues.", code: 'DEMO_SETUP_FAILED' },
      { status: 500 }
    )
  }
}

