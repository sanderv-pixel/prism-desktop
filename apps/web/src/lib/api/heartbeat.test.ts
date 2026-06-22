import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  HB_INTERVAL_MS,
  HB_MIN_BEATS,
  claimBeatNonce,
  deriveChallenge,
  dwellSatisfied,
  evaluateBeat,
  serverDwellMs,
  type HbState,
} from './heartbeat'

// No Redis env in tests -> redis.ts uses its in-memory store, so claimBeatNonce
// exercises real SET NX semantics without mocks.

describe('evaluateBeat — rolling challenge + cadence', () => {
  const tokenChallenge = 'seed-abc'

  it('accepts the first beat that echoes the token challenge', () => {
    const d = evaluateBeat({
      state: null,
      tokenChallenge,
      prevChallengeResponse: tokenChallenge,
      now: 1_000_000,
      hbIntervalMs: HB_INTERVAL_MS,
    })
    assert.deepEqual(d, { ok: true })
  })

  it('rejects a first beat with the wrong/forged challenge', () => {
    const d = evaluateBeat({
      state: null,
      tokenChallenge,
      prevChallengeResponse: 'forged',
      now: 1_000_000,
      hbIntervalMs: HB_INTERVAL_MS,
    })
    assert.deepEqual(d, { ok: false, code: 'BAD_CHALLENGE' })
  })

  it('rejects a stale challenge on a later beat', () => {
    const state: HbState = { firstBeatTs: 0, lastBeatTs: 1000, beatCount: 1, lastChallenge: 'next-1' }
    const d = evaluateBeat({
      state,
      tokenChallenge,
      prevChallengeResponse: 'next-0-old',
      now: 2000,
      hbIntervalMs: HB_INTERVAL_MS,
    })
    assert.deepEqual(d, { ok: false, code: 'BAD_CHALLENGE' })
  })

  it('accepts an in-cadence later beat that echoes the last challenge', () => {
    const state: HbState = { firstBeatTs: 0, lastBeatTs: 1000, beatCount: 1, lastChallenge: 'next-1' }
    const d = evaluateBeat({
      state,
      tokenChallenge,
      prevChallengeResponse: 'next-1',
      now: 2000, // +1000ms, within [500,3000]
      hbIntervalMs: HB_INTERVAL_MS,
    })
    assert.deepEqual(d, { ok: true })
  })

  it('rejects a too-fast beat', () => {
    const state: HbState = { firstBeatTs: 0, lastBeatTs: 1000, beatCount: 1, lastChallenge: 'next-1' }
    const d = evaluateBeat({
      state,
      tokenChallenge,
      prevChallengeResponse: 'next-1',
      now: 1200, // +200ms < 500
      hbIntervalMs: HB_INTERVAL_MS,
    })
    assert.deepEqual(d, { ok: false, code: 'BAD_CADENCE' })
  })

  it('rejects a too-slow beat', () => {
    const state: HbState = { firstBeatTs: 0, lastBeatTs: 1000, beatCount: 1, lastChallenge: 'next-1' }
    const d = evaluateBeat({
      state,
      tokenChallenge,
      prevChallengeResponse: 'next-1',
      now: 5000, // +4000ms > 3000
      hbIntervalMs: HB_INTERVAL_MS,
    })
    assert.deepEqual(d, { ok: false, code: 'BAD_CADENCE' })
  })
})

describe('claimBeatNonce — single use', () => {
  it('accepts a nonce once and rejects the replay', async () => {
    const id = `imp-${Math.random().toString(16).slice(2)}`
    assert.equal(await claimBeatNonce(id, 'beat-1'), true)
    assert.equal(await claimBeatNonce(id, 'beat-1'), false)
    // a different nonce on the same impression is still fine
    assert.equal(await claimBeatNonce(id, 'beat-2'), true)
  })
})

describe('deriveChallenge — deterministic + chaining', () => {
  it('is deterministic for the same inputs and differs across beats', async () => {
    const a = await deriveChallenge('imp-x', 1, 'seed')
    const b = await deriveChallenge('imp-x', 1, 'seed')
    const c = await deriveChallenge('imp-x', 2, a)
    assert.equal(a, b)
    assert.notEqual(a, c)
  })
})

describe('dwellSatisfied — payout gate', () => {
  it('fails with no state', () => {
    assert.equal(dwellSatisfied(null, HB_MIN_BEATS), false)
  })
  it('fails when dwell is under the 800ms minimum', () => {
    const state: HbState = { firstBeatTs: 0, lastBeatTs: 500, beatCount: 2, lastChallenge: 'x' }
    assert.equal(serverDwellMs(state), 500)
    assert.equal(dwellSatisfied(state, HB_MIN_BEATS), false)
  })
  it('passes with 2 beats spanning >= 800ms', () => {
    const state: HbState = { firstBeatTs: 0, lastBeatTs: 1000, beatCount: 2, lastChallenge: 'x' }
    assert.equal(dwellSatisfied(state, HB_MIN_BEATS), true)
  })
  it('fails when beat count is below the minimum', () => {
    const state: HbState = { firstBeatTs: 0, lastBeatTs: 1000, beatCount: 1, lastChallenge: 'x' }
    assert.equal(dwellSatisfied(state, 2), false)
  })
})
