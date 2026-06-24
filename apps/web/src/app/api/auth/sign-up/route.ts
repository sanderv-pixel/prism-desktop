import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendSignupConfirmationEmail } from '@/lib/email/auth'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { verifyTurnstile } from '@/lib/api/turnstile'
import { TURNSTILE_ENABLED } from '@/lib/turnstile-config'

export const dynamic = 'force-dynamic'

const signUpRateLimiter = new RateLimiter(5, 60 * 60 * 1000)
// Captcha is best-effort: a widget that fails to load (ad blockers, privacy
// extensions, flaky networks) must not dead-end a real signup. Token-less signups
// are allowed but held to a much stricter per-IP limit; mandatory email confirmation
// remains the real backstop, so this bounds abuse without locking anyone out.
const noCaptchaSignUpRateLimiter = new RateLimiter(3, 24 * 60 * 60 * 1000)

const SignUpSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  captchaToken: z.string().min(1).optional(),
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

    if (TURNSTILE_ENABLED) {
      if (captchaToken) {
        if (!(await verifyTurnstile(captchaToken))) {
          throw new ApiError(400, 'CAPTCHA verification failed', 'CAPTCHA_FAILED')
        }
      } else {
        // Widget could not load for this client. Allow the signup, but under a much
        // stricter per-IP limit; email confirmation is still required downstream.
        const noCaptcha = await noCaptchaSignUpRateLimiter.check(`signup:nocaptcha:${clientIp}`)
        if (!noCaptcha.success) {
          return rateLimitResponse(noCaptcha.limit, noCaptcha.resetAt)
        }
      }
    }

    const adminClient = createAdminClient()
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://goprism.dev'
    const acceptedAt = new Date().toISOString()

    // Create the (unconfirmed) user and mint a token_hash confirmation link WITHOUT
    // triggering Supabase's built-in mailer, then send the branded email ourselves
    // via Resend (same provider + templating as our other transactional emails).
    const { data: linkData, error } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: {
          accepted_terms_at: acceptedAt,
          accepted_privacy_at: acceptedAt,
        },
        redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(redirect)}`,
      },
    })

    if (error) {
      const lower = error.message.toLowerCase()
      const message =
        lower.includes('already') || lower.includes('registered') || lower.includes('exists')
          ? 'An account with this email already exists. Sign in instead.'
          : error.message
      throw new ApiError(400, message, 'SIGNUP_FAILED')
    }

    const hashedToken = linkData.properties?.hashed_token
    if (hashedToken) {
      const confirmUrl = `${origin}/auth/confirm?token_hash=${hashedToken}&type=signup&next=${encodeURIComponent(redirect)}`
      await sendSignupConfirmationEmail(email, confirmUrl)
    }

    const newUserId = linkData.user?.id
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
