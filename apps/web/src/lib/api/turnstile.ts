import { ApiError } from './errors'

export interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  hostname?: string
  challenge_ts?: string
  action?: string
}

export async function verifyTurnstile(token: string): Promise<boolean> {
  const workerUrl = process.env.TURNSTILE_WORKER_URL
  if (!workerUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(500, 'CAPTCHA worker not configured', 'CAPTCHA_NOT_CONFIGURED')
    }
    return true
  }

  const verifyRes = await fetch(workerUrl, {
    method: 'POST',
    body: JSON.stringify({ token }),
    headers: { 'Content-Type': 'application/json' },
  })

  const outcome = (await verifyRes.json()) as TurnstileVerifyResponse

  if (!outcome.success) {
    return false
  }

  const siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://goprism.dev').hostname
  if (outcome.hostname && outcome.hostname !== siteHost) {
    console.warn('Turnstile hostname mismatch:', outcome.hostname, 'expected', siteHost)
    return false
  }

  if (outcome.challenge_ts) {
    const issuedAt = new Date(outcome.challenge_ts).getTime()
    const now = Date.now()
    // Reject tokens older than 5 minutes or from the future.
    if (now - issuedAt > 5 * 60 * 1000 || issuedAt > now + 60 * 1000) {
      return false
    }
  }

  return true
}
