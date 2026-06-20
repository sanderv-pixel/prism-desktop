import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError, unauthorizedResponse } from '@/lib/api/errors'
import { httpUrl, iconUrl as iconUrlSchema } from '@/lib/api/validation'
import { logAudit } from '@/lib/audit'
import { validateIconDownload, validateIconDataUrl } from '@/lib/iconValidation'
import { sendCampaignStatusEmail, sendCampaignSubmittedEmail } from '@/lib/email/helpers'

export const dynamic = 'force-dynamic'

const updateCampaignRateLimiter = new RateLimiter(30, 60 * 60 * 1000)

const CampaignUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  copy: z.string().min(1).max(160).optional(),
  brand_name: z.string().max(40).optional().or(z.literal('')),
  url: httpUrl().optional(),
  icon_url: iconUrlSchema().optional().or(z.literal('')),
  max_bid_cpm: z.number().int().min(8).max(10000).optional(),
  budget_cents: z.number().int().min(1000).max(10000000).optional(),
  daily_budget_cents: z.number().int().min(0).max(10000000).optional(),
  start_date: z.string().datetime().optional().or(z.literal('')),
  end_date: z.string().datetime().optional().or(z.literal('')),
  frequency_cap: z.number().int().min(1).max(100).optional(),
  frequency_window_hours: z.number().int().min(1).max(168).optional(),
  contexts: z.array(z.string().min(1).max(50)).max(50).optional(),
  // Advertisers may only pause or request re-review. Approval/rejection is admin-only.
  status: z.enum(['paused', 'pending_review']).optional(),
})

async function getAdvertiserForUser(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: advertiser, error } = await supabase
    .from('advertisers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ApiError(404, 'Advertiser not found', 'ADVERTISER_NOT_FOUND')
    }
    throw error
  }

  return advertiser
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const advertiser = await getAdvertiserForUser(supabase, user.id)

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('advertiser_id', advertiser.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "We couldn't find that campaign. It may have been deleted or you may not have access to it.", code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json(campaign)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const clientIp = getClientIp(req)
    const rateLimitResult = await updateCampaignRateLimiter.check(`${user.id}:${clientIp}`)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const advertiser = await getAdvertiserForUser(supabase, user.id)

    const rawBody = await req.json()
    const parseResult = CampaignUpdateSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const data = parseResult.data

    if (data.icon_url) {
      const iconCheck = data.icon_url.startsWith('data:')
        ? validateIconDataUrl(data.icon_url)
        : await validateIconDownload(data.icon_url)
      if (!iconCheck.ok) {
        throw new ApiError(400, iconCheck.error ?? 'Invalid icon', 'INVALID_ICON')
      }
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, status, budget_cents, spent_cents')
      .eq('id', params.id)
      .eq('advertiser_id', advertiser.id)
      .single()

    if (campaignError) {
      if (campaignError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "We couldn't find that campaign. It may have been deleted or you may not have access to it.", code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      throw campaignError
    }

    if (typeof data.budget_cents === 'number') {
      // Budget changes move funds between wallet and campaign. Only allow when
      // the campaign is not actively serving to avoid races with spend.
      if (campaign.status === 'active') {
        throw new ApiError(
          409,
          'Pause the campaign before changing its budget.',
          'CAMPAIGN_ACTIVE'
        )
      }

      const diff = data.budget_cents - campaign.budget_cents
      if (diff > 0) {
        const { data: newBalance, error: increaseError } = await supabase.rpc(
          'increase_campaign_budget',
          {
            p_advertiser_id: advertiser.id,
            p_campaign_id: campaign.id,
            p_additional_cents: diff,
          }
        )
        if (increaseError) throw increaseError
        if (newBalance === null) {
          throw new ApiError(
            402,
            'Insufficient account balance for this budget increase. Top up first.',
            'INSUFFICIENT_BALANCE'
          )
        }
      } else if (diff < 0) {
        const { error: decreaseError } = await supabase.rpc('decrease_campaign_budget', {
          p_advertiser_id: advertiser.id,
          p_campaign_id: campaign.id,
          p_reduction_cents: Math.abs(diff),
        })
        if (decreaseError) throw decreaseError
      }
    }

    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'budget_cents') {
        updateData[key] = value === '' ? null : value
      }
    }

    const { data: updated, error } = await supabase
      .from('campaigns')
      .update(updateData as any)
      .eq('id', params.id)
      .eq('advertiser_id', advertiser.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      throw error
    }

    // Re-fetch so budget changes made via wallet RPC are reflected in the response.
    const { data: freshCampaign, error: freshError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('advertiser_id', advertiser.id)
      .single()

    if (freshError) throw freshError

    const changedFields = Object.keys(data)
    await logAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'campaign.update',
      targetType: 'campaign',
      targetId: updated.id,
      metadata: {
        changedFields,
        title: updated.title,
        advertiserId: updated.advertiser_id,
      },
      ipAddress: getClientIp(req),
    })

    if (typeof data.budget_cents === 'number') {
      await logAudit({
        actorId: user.id,
        actorEmail: user.email ?? undefined,
        action: data.budget_cents >= campaign.budget_cents ? 'campaign.budget_increase' : 'campaign.budget_decrease',
        targetType: 'campaign',
        targetId: updated.id,
        metadata: {
          previousBudgetCents: campaign.budget_cents,
          newBudgetCents: freshCampaign.budget_cents,
          requestedBudgetCents: data.budget_cents,
          title: updated.title,
        },
        ipAddress: getClientIp(req),
      })
    }

    if (typeof data.status === 'string') {
      await logAudit({
        actorId: user.id,
        actorEmail: user.email ?? undefined,
        action: 'campaign.status_change',
        targetType: 'campaign',
        targetId: updated.id,
        metadata: {
          newStatus: updated.status,
          title: updated.title,
        },
        ipAddress: getClientIp(req),
      })

      if (data.status === 'paused') {
        sendCampaignStatusEmail(params.id, 'paused').catch(() => {})
      } else if (data.status === 'pending_review') {
        sendCampaignSubmittedEmail(params.id).catch(() => {})
      }
    }

    return NextResponse.json(freshCampaign)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const advertiser = await getAdvertiserForUser(supabase, user.id)

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title')
      .eq('id', params.id)
      .eq('advertiser_id', advertiser.id)
      .single()

    if (campaignError) {
      if (campaignError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "We couldn't find that campaign. It may have been deleted or you may not have access to it.", code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      throw campaignError
    }

    const { error: releaseError } = await supabase.rpc('release_campaign_budget', {
      p_advertiser_id: advertiser.id,
      p_campaign_id: campaign.id,
    })
    if (releaseError) throw releaseError

    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', params.id)
      .eq('advertiser_id', advertiser.id)

    if (deleteError) throw deleteError

    await logAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'campaign.delete',
      targetType: 'campaign',
      targetId: campaign.id,
      metadata: {
        title: campaign.title,
        advertiserId: advertiser.id,
      },
      ipAddress: getClientIp(req),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}

