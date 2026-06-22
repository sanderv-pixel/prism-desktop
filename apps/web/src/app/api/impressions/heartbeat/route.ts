import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiKey, getRequestDeviceUserId } from '@/lib/api/auth'
import { verifyImpressionToken } from '@/lib/api/tokens'
import { handleApiError, ApiError } from '@/lib/api/errors'
import {
  HB_INTERVAL_MS,
  HB_TOKEN_TTL_SECONDS,
  claimBeatNonce,
  deriveChallenge,
  evaluateBeat,
  loadHbState,
  saveHbState,
  type HbState,
} from '@/lib/api/heartbeat'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  impressionToken: z.string().min(1),
  beatNonce: z.string().min(1).max(128),
  prevChallengeResponse: z.string().min(1).max(256),
})

// POST /api/impressions/heartbeat - records one server-timed heartbeat for an
// in-flight impression. Accepts traffic regardless of the enforcement flag (so we
// can shadow-measure coverage); enforcement happens in the impressions route.
export async function POST(req: NextRequest) {
  try {
    const apiAuthResponse = await requireApiKey(req)
    if (apiAuthResponse) return apiAuthResponse

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid heartbeat body', 'INVALID_BODY')
    }
    const { impressionToken, beatNonce, prevChallengeResponse } = parsed.data

    const tokenPayload = await verifyImpressionToken(impressionToken)
    if (!tokenPayload) {
      throw new ApiError(401, 'Invalid impression token', 'INVALID_TOKEN')
    }
    // Token age cap (also the Redis TTL for the session).
    if (Date.now() - tokenPayload.issuedAt > HB_TOKEN_TTL_SECONDS * 1000) {
      throw new ApiError(401, 'Impression token expired', 'TOKEN_EXPIRED')
    }
    // Device-key may only beat for its own account (same rule as impressions).
    const deviceUserId = await getRequestDeviceUserId(req)
    if (deviceUserId && tokenPayload.userId !== deviceUserId) {
      throw new ApiError(401, 'Heartbeat device mismatch', 'TOKEN_DEVICE_MISMATCH')
    }

    const impressionId = tokenPayload.nonce
    const hbIntervalMs = tokenPayload.hbIntervalMs ?? HB_INTERVAL_MS
    const tokenChallenge = tokenPayload.hbChallenge ?? ''

    // Single-use beat nonce.
    if (!(await claimBeatNonce(impressionId, beatNonce))) {
      throw new ApiError(409, 'Heartbeat already recorded', 'BEAT_REPLAY')
    }

    const state = await loadHbState(impressionId)
    const now = Date.now()

    const decision = evaluateBeat({
      state,
      tokenChallenge,
      prevChallengeResponse,
      now,
      hbIntervalMs,
    })
    if (!decision.ok) {
      const status = decision.code === 'BAD_CADENCE' ? 400 : 403
      throw new ApiError(status, 'Heartbeat rejected', decision.code)
    }

    const beatIndex = (state?.beatCount ?? 0) + 1
    const nextChallenge = await deriveChallenge(impressionId, beatIndex, prevChallengeResponse)
    const nextState: HbState = {
      firstBeatTs: state?.firstBeatTs ?? now,
      lastBeatTs: now,
      beatCount: beatIndex,
      lastChallenge: nextChallenge,
    }
    await saveHbState(impressionId, nextState)

    return NextResponse.json({ ok: true, nextChallenge })
  } catch (err) {
    return handleApiError(err)
  }
}
