import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const identityRateLimiter = new RateLimiter(20, 60 * 1000)

const IdentitySchema = z.object({
  anonymousUserId: z.string().min(1).max(128),
})

const MAX_IDENTITIES_PER_USER = 20
const LINKING_ACTIVITY_WINDOW_DAYS = 7

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const clientIp = getClientIp(req)
    const rateLimitResult = await identityRateLimiter.check(`identity:${user.id}:${clientIp}`)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const rawBody = await req.json()
    const parseResult = IdentitySchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { anonymousUserId } = parseResult.data

    // Prevent linking an identity that already belongs to another authenticated user.
    const { data: existingLink } = await adminClient
      .from('builder_identities')
      .select('auth_user_id')
      .eq('anonymous_user_id', anonymousUserId)
      .maybeSingle()

    if (existingLink && existingLink.auth_user_id !== user.id) {
      throw new ApiError(409, 'Identity is already linked to another account', 'IDENTITY_CONFLICT')
    }

    // Require proof of recent verified activity from this anonymous ID.
    const since = new Date()
    since.setDate(since.getDate() - LINKING_ACTIVITY_WINDOW_DAYS)
    const { data: recentImpression } = await adminClient
      .from('impressions')
      .select('id')
      .eq('user_id', anonymousUserId)
      .eq('validated', true)
      .gte('created_at', since.toISOString())
      .limit(1)
      .maybeSingle()

    if (!recentImpression) {
      throw new ApiError(
        403,
        'Identity cannot be linked without recent verified activity',
        'IDENTITY_UNVERIFIED'
      )
    }

    // Cap the number of linked identities to limit account-pooling abuse.
    const { count } = await adminClient
      .from('builder_identities')
      .select('*', { count: 'exact', head: true })
      .eq('auth_user_id', user.id)

    if ((count ?? 0) >= MAX_IDENTITIES_PER_USER) {
      throw new ApiError(400, 'Maximum number of linked identities reached', 'IDENTITY_LIMIT')
    }

    const { error } = await supabase
      .from('builder_identities')
      .upsert(
        {
          auth_user_id: user.id,
          anonymous_user_id: anonymousUserId,
        },
        { onConflict: 'auth_user_id, anonymous_user_id' }
      )

    if (error) throw error

    return NextResponse.json({ ok: true })
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
    const { data, error } = await supabase
      .from('builder_identities')
      .select('anonymous_user_id')
      .eq('auth_user_id', user.id)

    if (error) throw error

    return NextResponse.json({ identities: data?.map((d) => d.anonymous_user_id) ?? [] })
  } catch (err) {
    return handleApiError(err)
  }
}
