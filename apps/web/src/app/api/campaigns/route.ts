import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError, unauthorizedResponse } from '@/lib/api/errors'
import { httpUrl, iconUrl as iconUrlSchema } from '@/lib/api/validation'
import { logAudit } from '@/lib/audit'
import { validateIconDownload, validateIconDataUrl } from '@/lib/iconValidation'
import { sendCampaignLiveEmail, sendCampaignSubmittedEmail } from '@/lib/email/helpers'

export const dynamic = 'force-dynamic'

const createCampaignRateLimiter = new RateLimiter(20, 60 * 60 * 1000)

const CampaignSchema = z.object({
  title: z.string().min(1).max(120),
  copy: z.string().min(1).max(40), // CTA — one short action, per ad-unit guidelines
  brandName: z.string().max(14).optional(), // brand name only, per ad-unit guidelines
  url: httpUrl(),
  iconUrl: iconUrlSchema().optional().or(z.literal('')),
  objective: z.enum(['awareness', 'performance']).default('awareness'),
  bidType: z.enum(['cpm', 'cpc', 'cpa']).default('cpm'),
  maxBidCpm: z.number().int().min(8).max(10000),
  budgetCents: z.number().int().min(1000).max(10000000),
  dailyBudgetCents: z.number().int().min(0).max(10000000).optional(),
  startDate: z.string().datetime().optional().or(z.literal('')),
  endDate: z.string().datetime().optional().or(z.literal('')),
  frequencyCap: z.number().int().min(1).max(100).optional(),
  frequencyWindowHours: z.number().int().min(1).max(168).optional(),
  contexts: z.array(z.string().min(1).max(50)).max(50).optional(),
  targetSources: z.array(z.enum(['claude', 'cursor', 'codex', 'terminal'])).max(4).optional(),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const { data: advertiser, error: advertiserError } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (advertiserError) {
      if (advertiserError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No advertiser profile linked to your account. Complete onboarding first.', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      throw advertiserError
    }

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('advertiser_id', advertiser.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(campaigns ?? [])
  } catch (err) {
    console.error('GET /api/campaigns error:', err)
    return NextResponse.json(
      { error: "We couldn't load your campaigns right now. Please refresh or try again later.", code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const clientIp = getClientIp(req)
    const rateLimitResult = await createCampaignRateLimiter.check(`${user.id}:${clientIp}`)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const { data: advertiser, error: advertiserError } = await supabase
      .from('advertisers')
      .select('id, status, balance_cents')
      .eq('user_id', user.id)
      .single()

    if (advertiserError) {
      if (advertiserError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
      }
      throw advertiserError
    }

    if (advertiser.status !== 'active') {
      return NextResponse.json(
        { error: 'Advertiser account is not active. Top up your balance to activate it.' },
        { status: 403 }
      )
    }

    const rawBody = await req.json()
    const parseResult = CampaignSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const {
      title,
      copy,
      brandName,
      url,
      iconUrl,
      objective,
      bidType,
      maxBidCpm,
      budgetCents,
      dailyBudgetCents,
      startDate,
      endDate,
      frequencyCap,
      frequencyWindowHours,
      contexts,
      targetSources,
    } = parseResult.data

    if (iconUrl) {
      const iconCheck = iconUrl.startsWith('data:')
        ? validateIconDataUrl(iconUrl)
        : await validateIconDownload(iconUrl)
      if (!iconCheck.ok) {
        throw new ApiError(400, iconCheck.error ?? 'Invalid icon', 'INVALID_ICON')
      }
    }

    // Performance campaigns need conversion tracking; keep them pending for now.
    const initialStatus = objective === 'performance' ? 'pending_review' : 'active'

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        advertiser_id: advertiser.id,
        title,
        copy,
        brand_name: brandName?.trim() || null,
        url,
        icon_url: iconUrl || null,
        objective,
        bid_type: bidType,
        max_bid_cpm: maxBidCpm,
        budget_cents: budgetCents,
        daily_budget_cents: dailyBudgetCents || null,
        start_date: startDate || null,
        end_date: endDate || null,
        frequency_cap: frequencyCap || null,
        frequency_window_hours: frequencyWindowHours || null,
        contexts: contexts ?? [],
        target_sources: targetSources && targetSources.length > 0 ? targetSources : null,
        status: initialStatus,
      })
      .select()
      .single()

    if (error) throw error

    // Pay-as-you-go: the budget is a per-campaign spend cap, not an upfront charge.
    // Nothing is taken from the wallet on creation; each delivered impression draws
    // its cost from the advertiser's balance, and delivery pauses when the wallet
    // empties (see increment_campaign_spent_mc and the ads eligibility filter).

    await logAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'campaign.create',
      targetType: 'campaign',
      targetId: data.id,
      metadata: {
        title: data.title,
        advertiserId: data.advertiser_id,
        budgetCents: data.budget_cents,
      },
      ipAddress: getClientIp(req),
    })

    if (initialStatus === 'active') {
      sendCampaignLiveEmail(data.id).catch(() => {})
    } else {
      sendCampaignSubmittedEmail(data.id).catch(() => {})
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}

