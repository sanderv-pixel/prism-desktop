import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { verifyTurnstile } from '@/lib/api/turnstile'

export const dynamic = 'force-dynamic'

const signUpRateLimiter = new RateLimiter(5, 60 * 60 * 1000)

const SignUpSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  captchaToken: z.string().min(1),
  redirect: z.string().max(512).optional(),
  acceptedTerms: z.boolean(),
  acceptedPrivacy: z.boolean(),
  honeypot: z.string().max(256).optional(),
  referralCode: z.string().max(32).optional(),
})

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)
  const rateLimitResult = await signUpRateLimiter.check(`signup:${clientIp}`)
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
  }

  try {
    const rawBody = await req.json()
    const parseResult = SignUpSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { email, password, captchaToken, redirect = '/', acceptedTerms, acceptedPrivacy, honeypot, referralCode } = parseResult.data

    if (honeypot) {
      // Honeypot caught a bot. Pretend success to avoid revealing the trap.
      return NextResponse.json({ success: true })
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      throw new ApiError(400, 'You must agree to the Terms of Service and Privacy Policy.', 'CONSENT_REQUIRED')
    }

    if (!(await verifyTurnstile(captchaToken))) {
      throw new ApiError(400, 'CAPTCHA verification failed', 'CAPTCHA_FAILED')
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://goprism.dev'
    const acceptedAt = new Date().toISOString()
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(redirect)}`,
        data: {
          accepted_terms_at: acceptedAt,
          accepted_privacy_at: acceptedAt,
        },
      },
    })

    if (error) {
      const message = error.message.includes('already registered')
        ? 'An account with this email already exists. Sign in instead.'
        : error.message
      throw new ApiError(400, message, 'SIGNUP_FAILED')
    }

    const newUserId = signUpData.user?.id
    if (newUserId && referralCode) {
      const { data: referrer } = await adminClient
        .from('referrals')
        .select('user_id')
        .eq('referral_code', referralCode.trim().toUpperCase())
        .maybeSingle()

      if (referrer && referrer.user_id !== newUserId) {
        // Set referred_by only once and only if it is currently null.
        await adminClient
          .from('referrals')
          .update({ referred_by: referrer.user_id })
          .eq('user_id', newUserId)
          .is('referred_by', null)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
