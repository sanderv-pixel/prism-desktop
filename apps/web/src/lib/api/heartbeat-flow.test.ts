import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createImpressionToken, verifyImpressionToken } from './tokens'
import {
  claimBeatNonce,
  deriveChallenge,
  dwellSatisfied,
  evaluateBeat,
  generateInitialChallenge,
  loadHbState,
  saveHbState,
  serverDwellMs,
  type HbState,
} from './heartbeat'

// End-to-end exercise of the heartbeat protocol using the exact library functions
// the /api/impressions/heartbeat route orchestrates. No Redis env -> in-memory KV.

// Mirror of the route's per-beat handling, with an injected clock for determinism.
async function processBeat(params: {
  impressionId: string
  tokenChallenge: string
  beatNonce: string
  prevChallengeResponse: string
  now: number
  hbIntervalMs: number
}): Promise<{ status: string; nextChallenge?: string }> {
  const { impressionId, tokenChallenge, beatNonce, prevChallengeResponse, now, hbIntervalMs } = params
  if (!(await claimBeatNonce(impressionId, beatNonce))) return { status: 'BEAT_REPLAY' }
  const state = await loadHbState(impressionId)
  const decision = evaluateBeat({ state, tokenChallenge, prevChallengeResponse, now, hbIntervalMs })
  if (!decision.ok) return { status: decision.code }
  const beatIndex = (state?.beatCount ?? 0) + 1
  const nextChallenge = await deriveChallenge(impressionId, beatIndex, prevChallengeResponse)
  const next: HbState = {
    firstBeatTs: state?.firstBeatTs ?? now,
    lastBeatTs: now,
    beatCount: beatIndex,
    lastChallenge: nextChallenge,
  }
  await saveHbState(impressionId, next)
  return { status: 'ok', nextChallenge }
}

describe('heartbeat protocol — end to end', () => {
  it('signs hb fields into the token and reads them back', async () => {
    const seed = generateInitialChallenge()
    const token = await createImpressionToken({
      campaignId: 'c1',
      userId: 'u1',
      sessionId: 's1',
      auctionPriceCpm: 4000,
      hbIntervalMs: 1000,
      hbMinBeats: 2,
      hbChallenge: seed,
    })
    const payload = await verifyImpressionToken(token)
    assert.ok(payload)
    assert.equal(payload!.hbChallenge, seed)
    assert.equal(payload!.hbIntervalMs, 1000)
    assert.equal(payload!.hbMinBeats, 2)
  })

  it('a real 5-beat live session accrues server dwell and passes the gate', async () => {
    const impressionId = `flow-${Math.random().toString(16).slice(2)}`
    const tokenChallenge = generateInitialChallenge()
    let prev = tokenChallenge
    let t = 1_000_000
    for (let i = 0; i < 5; i++) {
      const r = await processBeat({
        impressionId,
        tokenChallenge,
        beatNonce: `beat-${i}`,
        prevChallengeResponse: prev,
        now: t,
        hbIntervalMs: 1000,
      })
      assert.equal(r.status, 'ok', `beat ${i} should accept`)
      prev = r.nextChallenge!
      t += 1000
    }
    const state = await loadHbState(impressionId)
    assert.equal(state!.beatCount, 5)
    assert.equal(serverDwellMs(state), 4000) // 4 gaps of 1000ms
    assert.equal(dwellSatisfied(state, 2), true)
  })

  it('rejects a replayed beat nonce even with a valid challenge', async () => {
    const impressionId = `replay-${Math.random().toString(16).slice(2)}`
    const tokenChallenge = generateInitialChallenge()
    const first = await processBeat({
      impressionId,
      tokenChallenge,
      beatNonce: 'dup',
      prevChallengeResponse: tokenChallenge,
      now: 1000,
      hbIntervalMs: 1000,
    })
    assert.equal(first.status, 'ok')
    const replay = await processBeat({
      impressionId,
      tokenChallenge,
      beatNonce: 'dup', // reused
      prevChallengeResponse: first.nextChallenge!,
      now: 2000,
      hbIntervalMs: 1000,
    })
    assert.equal(replay.status, 'BEAT_REPLAY')
  })

  it('rejects a forged first-beat challenge', async () => {
    const impressionId = `forge-${Math.random().toString(16).slice(2)}`
    const r = await processBeat({
      impressionId,
      tokenChallenge: generateInitialChallenge(),
      beatNonce: 'b0',
      prevChallengeResponse: 'attacker-guess',
      now: 1000,
      hbIntervalMs: 1000,
    })
    assert.equal(r.status, 'BAD_CHALLENGE')
  })

  it('rejects batched (too-fast) beats', async () => {
    const impressionId = `fast-${Math.random().toString(16).slice(2)}`
    const tokenChallenge = generateInitialChallenge()
    const b1 = await processBeat({
      impressionId,
      tokenChallenge,
      beatNonce: 'f0',
      prevChallengeResponse: tokenChallenge,
      now: 1000,
      hbIntervalMs: 1000,
    })
    assert.equal(b1.status, 'ok')
    const b2 = await processBeat({
      impressionId,
      tokenChallenge,
      beatNonce: 'f1',
      prevChallengeResponse: b1.nextChallenge!,
      now: 1200, // +200ms, far under the 500ms floor
      hbIntervalMs: 1000,
    })
    assert.equal(b2.status, 'BAD_CADENCE')
  })

  it('a bot that fetches a token but never beats fails the dwell gate', async () => {
    const impressionId = `nobeat-${Math.random().toString(16).slice(2)}`
    const state = await loadHbState(impressionId)
    assert.equal(state, null)
    assert.equal(dwellSatisfied(state, 2), false) // -> impression held when enforced
  })
})
