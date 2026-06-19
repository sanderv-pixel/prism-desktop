import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'
import {
  sendAdvertiserOnboardingSubmittedEmail,
  sendAdminAdvertiserPendingEmail,
} from '@/lib/email/helpers'

export const dynamic = 'force-dynamic'

const createAdvertiserRateLimiter = new RateLimiter(10, 60 * 60 * 1000)

const AdvertiserSchema = z.object({
  name: z.string().min(1).max(120),
  website: z.string().url().max(500).optional().or(z.literal('')),
  acceptedTerms: z.boolean(),
  acceptedPrivacy: z.boolean(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const clientIp = getClientIp(req)
    const rateLimitResult = await createAdvertiserRateLimiter.check(`${user.id}:${clientIp}`)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const rawBody = await req.json()
    const parseResult = AdvertiserSchema.safeParse(rawBody)
    if (!parseResult.success) {
      throw new ApiError(400, 'Invalid request body', 'INVALID_BODY')
    }

    const { name, website, acceptedTerms, acceptedPrivacy } = parseResult.data

    if (!acceptedTerms || !acceptedPrivacy) {
      throw new ApiError(
        400,
        'You must agree to the Terms of Service and Privacy Policy.',
        'CONSENT_REQUIRED'
      )
    }

    const { data: existing } = await supabase
      .from('advertisers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('advertiser_id', existing.id)
        .order('created_at', { ascending: false })
      return NextResponse.json({ ...existing, campaigns: campaigns ?? [] }, { status: 200 })
    }

    const acceptedAt = new Date().toISOString()
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        advertiser_accepted_terms_at: acceptedAt,
        advertiser_accepted_privacy_at: acceptedAt,
      },
    })
    if (metadataError) {
      console.error('Failed to store advertiser consent metadata:', metadataError)
    }

    const { data, error } = await supabase
      .from('advertisers')
      .insert({
        user_id: user.id,
        email: user.email ?? '',
        name,
        website: website || null,
        status: 'pending',
        subscription_status: 'inactive',
      })
      .select()
      .single()

    if (error) throw error

    sendAdvertiserOnboardingSubmittedEmail(data.id).catch(() => {})
    sendAdminAdvertiserPendingEmail(data.id).catch(() => {})

    return NextResponse.json({ ...data, campaigns: [] }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: advertiser, error } = await supabase
      .from('advertisers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      throw error
    }

    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('advertiser_id', advertiser.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ ...advertiser, campaigns: campaigns ?? [] })
  } catch (err) {
    return handleApiError(err)
  }
}

