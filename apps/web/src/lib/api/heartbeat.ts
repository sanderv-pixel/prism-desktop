import { kvGet, kvSet } from '@/lib/redis'

// Server-measured attention via signed heartbeats. The server measures dwell from
// heartbeat arrival times (its own clock); the client's durationMs becomes advisory.
// A rolling, server-derived challenge forces sequential live round-trips, defeating
// precomputed/batched beats.

export const HB_INTERVAL_MS = 1000
export const HB_MIN_BEATS = 2
export const HB_MIN_VIEW_MS = 800 // mirrors impressions MIN_ATTENTION_MS
export const HB_TOKEN_TTL_SECONDS = 600 // ~10 min max session; also the Redis TTL
const CADENCE_MIN_FACTOR = 0.5
const CADENCE_MAX_FACTOR = 3

export interface HbState {
  firstBeatTs: number
  lastBeatTs: number
  beatCount: number
  lastChallenge: string
}

// --- challenge HMAC (same secret + primitive as the impression token) ---
const rawSecret =
  process.env.PRISM_IMPRESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
if (!rawSecret && process.env.NODE_ENV === 'production') {
  throw new Error('PRISM_IMPRESSION_SECRET is required in production')
}
let cachedKey: CryptoKey | null = null
async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  cachedKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(rawSecret ?? 'dev-insecure-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return cachedKey
}

/** nextChallenge = HMAC(secret, impressionId|beatIndex|prevChallenge). */
export async function deriveChallenge(
  impressionId: string,
  beatIndex: number,
  prevChallenge: string
): Promise<string> {
  const key = await getKey()
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${impressionId}|${beatIndex}|${prevChallenge}`)
  )
  return Buffer.from(sig).toString('base64url')
}

/** Random initial challenge embedded in (and protected by) the signed token. */
export function generateInitialChallenge(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export type BeatDecision = { ok: true } | { ok: false; code: 'BAD_CHALLENGE' | 'BAD_CADENCE' }

/**
 * Pure decision for a single beat (no I/O), so it is trivially testable.
 * - First beat (state === null) must echo the token's initial challenge.
 * - Later beats must echo the last server-issued challenge, and arrive within the
 *   cadence window [interval*0.5, interval*3] since the previous beat.
 */
export function evaluateBeat(params: {
  state: HbState | null
  tokenChallenge: string
  prevChallengeResponse: string
  now: number
  hbIntervalMs: number
}): BeatDecision {
  const { state, tokenChallenge, prevChallengeResponse, now, hbIntervalMs } = params
  const expected = state ? state.lastChallenge : tokenChallenge
  if (!prevChallengeResponse || prevChallengeResponse !== expected) {
    return { ok: false, code: 'BAD_CHALLENGE' }
  }
  if (state) {
    const delta = now - state.lastBeatTs
    if (delta < hbIntervalMs * CADENCE_MIN_FACTOR || delta > hbIntervalMs * CADENCE_MAX_FACTOR) {
      return { ok: false, code: 'BAD_CADENCE' }
    }
  }
  return { ok: true }
}

const stateKey = (impressionId: string) => `hb:${impressionId}`
const nonceKey = (impressionId: string, beatNonce: string) => `hbn:${impressionId}:${beatNonce}`

export async function loadHbState(impressionId: string): Promise<HbState | null> {
  const raw: unknown = await kvGet(stateKey(impressionId))
  if (raw == null) return null
  // Upstash auto-deserializes JSON values, so a stored JSON string can come back as
  // an object; the in-memory dev store returns the raw string. Handle both.
  if (typeof raw === 'object') return raw as HbState
  try {
    return JSON.parse(String(raw)) as HbState
  } catch {
    return null
  }
}

export async function saveHbState(impressionId: string, state: HbState): Promise<void> {
  await kvSet(stateKey(impressionId), JSON.stringify(state), { ex: HB_TOKEN_TTL_SECONDS })
}

/** Single-use beat nonce via SET NX EX. Returns false if the nonce was already used. */
export async function claimBeatNonce(impressionId: string, beatNonce: string): Promise<boolean> {
  const res = await kvSet(nonceKey(impressionId, beatNonce), '1', {
    nx: true,
    ex: HB_TOKEN_TTL_SECONDS,
  })
  return res === 'OK'
}

export function serverDwellMs(state: HbState | null): number {
  return state ? state.lastBeatTs - state.firstBeatTs : 0
}

/** Whether recorded heartbeat state satisfies the dwell gate. */
export function dwellSatisfied(state: HbState | null, minBeats: number): boolean {
  if (!state) return false
  return state.beatCount >= Math.max(1, minBeats) && serverDwellMs(state) >= HB_MIN_VIEW_MS
}
