import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { stripe } from '@/lib/stripe'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'

export const dynamic = 'force-dynamic'

const connectRateLimiter = new RateLimiter(5, 60 * 60 * 1000)

const ConnectSchema = z.object({
  country: z.string().length(2).default('US'),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientIp = getClientIp(req)
    const rateLimitResult = await connectRateLimiter.check(
      `connect-account:${user.id}:${clientIp}`
    )
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const parseResult = ConnectSchema.safeParse(await req.json())
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { country } = parseResult.data

    let { data: settings } = await adminClient
      .from('builder_payout_settings')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    let accountId = settings?.stripe_connect_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          prismUserId: user.id,
        },
      })

      accountId = account.id

      const { error: insertError } = await adminClient
        .from('builder_payout_settings')
        .insert({
          auth_user_id: user.id,
          stripe_connect_account_id: accountId,
          country,
          currency: 'usd',
        })

      if (insertError) throw insertError

      await logAudit({
        actorId: user.id,
        actorEmail: user.email ?? undefined,
        action: 'builder.connect.created',
        targetType: 'builder_payout_settings',
        targetId: user.id,
        metadata: {
          stripeAccountId: accountId,
          country,
        },
        ipAddress: clientIp,
      })
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://goprism.dev'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?connect=refresh`,
      return_url: `${origin}/dashboard?connect=success`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    return handleApiError(err)
  }
}
