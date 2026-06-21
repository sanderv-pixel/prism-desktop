import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  RateLimiter,
  getClientIp,
  rateLimitResponse,
} from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { requireApiKey, getRequestDeviceUserId } from '@/lib/api/auth'
import { isTrustedUserId } from '@/lib/api/trusted'
import { createImpressionToken, createConversionToken } from '@/lib/api/tokens'
import { kvGet, kvSet } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Prism-Api-Key',
  }
}

const adsRateLimiter = new RateLimiter(60, 60 * 1000)

const FALLBACK_FLOOR_CPM = 800 // $8.00 CPM

const ContextSchema = z.object({
  editor: z.string().optional(),
  language: z.string().optional(),
  projectType: z.string().optional(),
  frameworks: z.array(z.string()).optional(),
  libraries: z.array(z.string()).optional(),
  aiTool: z.string().optional(),
  intent: z.string().optional(),
  audience: z.string().optional(),
  waitState: z.boolean().optional(),
})

const RequestSchema = z.object({
  context: ContextSchema.optional(),
  userId: z.string().min(1).max(128).optional(),
  sessionId: z.string().min(1).max(128).optional(),
  hiddenAdvertisers: z.array(z.string()).optional(),
  // The surface the ad would be shown on (claude/cursor/codex/terminal), for
  // surface targeting. Optional; older clients omit it.
  source: z.enum(['claude', 'cursor', 'codex', 'terminal', 'unknown']).optional(),
})

function getIconUrl(url: string, iconUrl: string | null | undefined): string {
  if (iconUrl) return iconUrl
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return `https://logo.clearbit.com/${hostname}`
  } catch {
    return ''
  }
}

function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const SESSION_LAST_ADVERTISER_TTL_SECONDS = 60
const TOP_N_FOR_ROTATION = 3

function weightedRandomByBid(candidates: any[]): any {
  const totalWeight = candidates.reduce((sum, c) => sum + c.max_bid_cpm, 0)
  let roll = Math.random() * totalWeight
  for (const c of candidates) {
    roll -= c.max_bid_cpm
    if (roll <= 0) return c
  }
  return candidates[candidates.length - 1]
}

async function filterByFrequencyCap(
  supabase: ReturnType<typeof createAdminClient>,
  campaigns: any[],
  userId: string
): Promise<any[]> {
  if (!userId || campaigns.length === 0) return campaigns

  const maxWindowHours = Math.max(
    ...campaigns.map((c) => c.frequency_window_hours ?? 24)
  )
  const since = new Date(
    Date.now() - maxWindowHours * 60 * 60 * 1000
  ).toISOString()
  const campaignIds = campaigns.map((c) => c.id)

  const { data, error } = await supabase
    .from('impressions')
    .select('campaign_id, created_at')
    .eq('user_id', userId)
    .eq('validated', true)
    .in('campaign_id', campaignIds)
    .gte('created_at', since)

  if (error) throw error

  const rows = (data ?? []) as Array<{ campaign_id: string; created_at: string }>

  return campaigns.filter((c) => {
    const cap = c.frequency_cap ?? 3
    const windowHours = c.frequency_window_hours ?? 24
    const windowStart = Date.now() - windowHours * 60 * 60 * 1000
    const count = rows.filter(
      (r) =>
        r.campaign_id === c.id &&
        new Date(r.created_at).getTime() >= windowStart
    ).length
    return count < cap
  })
}

async function getLastAdvertiserForSession(sessionId: string): Promise<string | null> {
  return kvGet(`prism:session:${sessionId}:last-advertiser`)
}

async function setLastAdvertiserForSession(sessionId: string, advertiserName: string): Promise<void> {
  await kvSet(
    `prism:session:${sessionId}:last-advertiser`,
    advertiserName,
    { ex: SESSION_LAST_ADVERTISER_TTL_SECONDS }
  )
}

function getSignals(context: z.infer<typeof ContextSchema>): string[] {
  const signals = [
    context.editor,
    context.language,
    context.projectType,
    context.aiTool,
    context.intent,
    context.audience,
    ...(context.frameworks ?? []),
    ...(context.libraries ?? []),
  ].filter(Boolean) as string[]
  return signals
}

async function getFloorCpm(supabase: ReturnType<typeof createAdminClient>, contexts: string[]): Promise<number> {
  if (contexts.length === 0) return FALLBACK_FLOOR_CPM
  const { data } = await supabase
    .from('market_floors')
    .select('floor_cpm')
    .in('context', contexts)
    .order('floor_cpm', { ascending: false })
    .limit(1)
  return data && data.length > 0 ? data[0].floor_cpm : FALLBACK_FLOOR_CPM
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  try {
    const apiAuthResponse = await requireApiKey(req)
    if (apiAuthResponse) {
      return apiAuthResponse
    }

    const clientIp = getClientIp(req)
    const rateLimitResult = await adsRateLimiter.check(clientIp)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const rawBody = await req.json()
    const parseResult = RequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { context = {}, userId = '', sessionId, hiddenAdvertisers = [], source } = parseResult.data
    const reqSource = source ?? 'unknown'
    const signals = getSignals(context)

    // Active awareness/CPM campaigns.
    const now = new Date()
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .eq('objective', 'awareness')
      .eq('bid_type', 'cpm')
      .gt('budget_cents', 0)
    if (error) throw error

    const campaigns = (data as any[]) ?? []

    if (campaigns.length === 0) {
      return new NextResponse(null, { status: 204, headers: corsHeaders() })
    }

    const advertiserIds = Array.from(new Set(campaigns.map((c) => c.advertiser_id)))
    const { data: advertisers } = await supabase
      .from('advertisers')
      .select('id, name, status, balance_cents')
      .in('id', advertiserIds)

    const advertiserMap = new Map(
      ((advertisers as any[]) ?? []).map((a) => [
        a.id,
        { name: a.name, status: a.status, balanceCents: a.balance_cents ?? 0 },
      ])
    )

    const eligible = campaigns.filter((c) => {
      if (c.spent_cents >= c.budget_cents) return false
      if (c.start_date && new Date(c.start_date) > now) return false
      if (c.end_date && new Date(c.end_date) < now) return false
      const advertiser = advertiserMap.get(c.advertiser_id)
      if (!advertiser || advertiser.status !== 'active') return false
      // Pay-as-you-go: don't serve an advertiser whose wallet is empty. Delivery
      // resumes automatically once they top up.
      if (advertiser.balanceCents <= 0) return false
      if (advertiser.name && hiddenAdvertisers.includes(advertiser.name)) return false
      // Surface targeting: if the campaign restricts surfaces, the request's surface
      // must be one of them. Untargeted (null/empty) campaigns serve everywhere.
      const targetSources: string[] = c.target_sources ?? []
      if (targetSources.length > 0 && !targetSources.includes(reqSource)) return false
      const contexts = c.contexts ?? []
      if (contexts.length === 0) return true
      if (contexts.includes('general') || contexts.includes('general-ai')) return true
      return signals.some((s) => contexts.includes(s))
    })

    if (eligible.length === 0) {
      return new NextResponse(null, { status: 204, headers: corsHeaders() })
    }

    const session = sessionId || generateSessionId()
    // Attribute to the connected account (the device key's anonymous_user_id,
    // which equals the auth user id) so earnings reach the creator dashboard.
    // Fall back to the client-supplied id only for non-device-key callers.
    const deviceUserId = await getRequestDeviceUserId(req)
    const resolvedUserId = deviceUserId || userId || session

    // Frequency-cap filter: do not serve the same campaign to the same device
    // more than the configured number of times per window. Trusted accounts (our
    // own test devices) are exempt so testing never runs dry.
    const eligibleByFrequency = isTrustedUserId(resolvedUserId)
      ? eligible
      : await filterByFrequencyCap(supabase, eligible, resolvedUserId)
    if (eligibleByFrequency.length === 0) {
      return new NextResponse(null, { status: 204, headers: corsHeaders() })
    }

    // Determine context floor and filter out bids below it.
    const contextTags = [...signals, context.waitState ? 'wait-state' : '']
      .filter(Boolean)
      .map((s) => s.toLowerCase())
    const floorCpm = await getFloorCpm(supabase, contextTags)

    const eligibleByFloor = eligibleByFrequency.filter(
      (c) => c.max_bid_cpm >= floorCpm
    )
    if (eligibleByFloor.length === 0) {
      return new NextResponse(null, { status: 204, headers: corsHeaders() })
    }

    // Rotate advertisers within a session so consecutive thinking states show
    // different sponsors when possible. Exclude the last shown advertiser, then
    // pick from the top N bidders using a bid-weighted random draw.
    const lastAdvertiserName = await getLastAdvertiserForSession(session)
    let candidates = eligibleByFloor
    if (lastAdvertiserName) {
      const withoutLast = eligibleByFloor.filter(
        (c) => advertiserMap.get(c.advertiser_id)?.name !== lastAdvertiserName
      )
      if (withoutLast.length > 0) {
        candidates = withoutLast
      }
    }

    const sorted = eligibleByFloor.sort((a, b) => b.max_bid_cpm - a.max_bid_cpm)
    const topCandidates = candidates
      .sort((a, b) => b.max_bid_cpm - a.max_bid_cpm)
      .slice(0, TOP_N_FOR_ROTATION)
    const winner = weightedRandomByBid(topCandidates)

    // Second-price auction: winner pays max(floor, second-highest bid).
    const secondPrice = sorted.length > 1 ? sorted[1].max_bid_cpm : floorCpm
    const clearingPrice = Math.max(secondPrice, floorCpm)

    const winnerAdvertiserName = advertiserMap.get(winner.advertiser_id)?.name ?? 'Prism'
    await setLastAdvertiserForSession(session, winnerAdvertiserName)

    // A/B rotation: serve the winner's active creative with the fewest impressions
    // so variants split evenly. Fall back to the campaign's own fields if none exist.
    const { data: creatives } = await supabase
      .from('campaign_creatives')
      .select('id, copy, brand_name, url, icon_url')
      .eq('campaign_id', winner.id)
      .eq('status', 'active')
      .order('impression_count', { ascending: true })
      .limit(1)
    const creative = creatives?.[0] ?? null
    const adCopy = creative?.copy ?? winner.copy
    const adUrl = creative?.url ?? winner.url
    const adIconUrl = creative ? creative.icon_url : winner.icon_url
    const adBrand = creative ? creative.brand_name : winner.brand_name

    // The name shown in the ad is advertiser-controlled (creative/campaign brand_name).
    // Empty means show no name — the internal account name is never exposed.
    const displayName = typeof adBrand === 'string' && adBrand.trim() ? adBrand.trim() : ''

    const impressionToken = await createImpressionToken({
      campaignId: winner.id,
      userId: resolvedUserId,
      sessionId: session,
      auctionPriceCpm: clearingPrice,
      creativeId: creative?.id ?? null,
    })

    const conversionToken = await createConversionToken({
      campaignId: winner.id,
      sessionId: session,
    })

    const clickUrl = `${req.nextUrl.origin}/api/clicks?t=${encodeURIComponent(impressionToken)}`

    return NextResponse.json(
      {
        id: winner.id,
        copy: adCopy,
        url: adUrl,
        clickUrl,
        iconUrl: getIconUrl(adUrl, adIconUrl),
        advertiserName: displayName,
        impressionToken,
        conversionToken,
        userId: resolvedUserId,
        sessionId: session,
      },
      { headers: corsHeaders() }
    )
  } catch (err) {
    return handleApiError(err)
  }
}
