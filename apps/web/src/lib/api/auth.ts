import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceApiKey } from './device-keys'
import { RateLimiter, rateLimitResponse } from './rate-limit'

const API_KEYS = new Set(
  (process.env.PRISM_API_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean)
)

// Allow a healthy volume of ad/impression/click/conversion calls per device/key.
const apiKeyRateLimiter = new RateLimiter(2000, 60 * 60 * 1000)

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function apiKeyRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'A valid Prism API key is required. Check your extension or device settings.',
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  )
}

export interface RequireApiKeyOptions {
  // Legacy global keys are only accepted for the device-registration bootstrap
  // endpoint. All other public API routes must use per-device keys in production.
  allowGlobalInProduction?: boolean
}

export async function requireApiKey(
  req: NextRequest,
  opts: RequireApiKeyOptions = {}
): Promise<NextResponse | null> {
  const key = req.headers.get('x-prism-api-key')

  // In production, extension API keys are mandatory. Fail closed.
  if (isProduction() && API_KEYS.size === 0) {
    if (!key) return apiKeyRequiredResponse()
  }

  // Non-production with no global keys configured: allow anonymous calls but
  // still validate and rate-limit any key that is provided.
  if (API_KEYS.size === 0) {
    if (!key) return null
    try {
      const device = await validateDeviceApiKey(key)
      if (!device.valid || device.revoked) return apiKeyRequiredResponse()
      const rate = await apiKeyRateLimiter.check(`device:${key}`)
      if (!rate.success) return rateLimitResponse(rate.limit, rate.resetAt)
      return null
    } catch {
      return apiKeyRequiredResponse()
    }
  }

  if (!key) return apiKeyRequiredResponse()

  // Legacy global keys are accepted only in non-production, or for bootstrapping
  // a per-device key via the register-device endpoint.
  if (API_KEYS.has(key)) {
    if (isProduction() && !opts.allowGlobalInProduction) {
      return NextResponse.json(
        {
          error: 'Global API keys are disabled in production. Use a per-device key.',
          code: 'GLOBAL_KEY_DISABLED',
        },
        { status: 403 }
      )
    }
    const rate = await apiKeyRateLimiter.check(`global:${key}`)
    if (!rate.success) return rateLimitResponse(rate.limit, rate.resetAt)
    return null
  }

  try {
    const device = await validateDeviceApiKey(key)
    if (!device.valid || device.revoked) return apiKeyRequiredResponse()
    const rate = await apiKeyRateLimiter.check(`device:${key}`)
    if (!rate.success) return rateLimitResponse(rate.limit, rate.resetAt)
    return null
  } catch {
    return apiKeyRequiredResponse()
  }
}

/**
 * The account id bound to the request's per-device API key, or null when the
 * request used a global/legacy key or no key. For device keys minted by a
 * signed-in user, `anonymous_user_id` equals their auth user id, so this is what
 * impressions must be attributed to for earnings to reach the creator dashboard.
 */
export async function getRequestDeviceUserId(
  req: NextRequest
): Promise<string | null> {
  const key = req.headers.get('x-prism-api-key')
  if (!key || API_KEYS.has(key)) return null
  try {
    const device = await validateDeviceApiKey(key)
    if (device.valid && !device.revoked && device.anonymousUserId) {
      return device.anonymousUserId
    }
  } catch {
    /* fall through to null */
  }
  return null
}

/**
 * Proof-of-humanity status of the request's device key.
 * - `true`  : a verified earning identity (minted with a human proof)
 * - `false` : an unverified device credential
 * - `null`  : no device key (global/legacy key or keyless/anon terminal earner)
 */
export async function getRequestDeviceVerified(
  req: NextRequest
): Promise<boolean | null> {
  const key = req.headers.get('x-prism-api-key')
  if (!key || API_KEYS.has(key)) return null
  try {
    const device = await validateDeviceApiKey(key)
    if (device.valid && !device.revoked) {
      return device.verified === true
    }
  } catch {
    /* fall through */
  }
  return null
}
