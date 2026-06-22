# Prism anti-bot defenses (feat/antibot-p0)

Two flag-gated defenses against bots farming fake validated impressions. With all
flags at their defaults, the impression and device-minting flows behave exactly as
before; new endpoints accept traffic but do not gate payout or minting.

## Feature flags (env, read at call time)

| Flag | Default | Effect when on |
|---|---|---|
| `PRISM_HEARTBEAT_ENFORCED` | `false` | Payout requires sufficient server-measured heartbeat dwell |
| `PRISM_HEARTBEAT_SHADOW` | `true` while enforcement is off | Logs `[hb-shadow]` for impressions that would be rejected; no payout effect |
| `PRISM_DEVICE_POH_ENFORCED` | `false` | Device minting requires human proof; unverified identities are payout-held |
| `MAX_DEVICES_PER_ACCOUNT` | `5` | Cap on verified-account device keys |

Helpers live in `src/lib/env.ts` (`isHeartbeatEnforced`, `isHeartbeatShadow`,
`isDevicePohEnforced`, `maxDevicesPerAccount`).

## Feature 1 - server-measured attention via signed heartbeats

The server measures dwell from heartbeat **arrival times on its own clock**. The
client's `durationMs` becomes advisory. A rolling, server-derived challenge forces
sequential live round-trips, so a bot must keep a real session open to earn.

### Token additions (additive, signed)
`createImpressionToken` (in `/api/ads`) now also signs:
- `hbIntervalMs` (1000), `hbMinBeats` (2), `hbChallenge` (random hex(16), the first
  challenge the client must echo; tamper-proof via the token HMAC).

Tokens that omit these are treated as before.

### `POST /api/impressions/heartbeat`
Auth: `X-Prism-Api-Key` (same as impressions).

Request: `{ impressionToken, beatNonce, prevChallengeResponse }`
Response: `{ ok: true, nextChallenge }`

Validation order:
1. Verify token HMAC; reject if older than `HB_TOKEN_TTL_SECONDS` (600s).
2. Device-key must match the token's `userId` (else `TOKEN_DEVICE_MISMATCH`).
3. `impressionId = token.nonce` (the id shared across serve, heartbeats, record).
4. Single-use `beatNonce` via `SET NX EX` (else `409 BEAT_REPLAY`).
5. Challenge: first beat must echo `token.hbChallenge`; later beats must echo the
   last server-issued challenge (else `403 BAD_CHALLENGE`).
6. Cadence (beats >= 2): `now - lastBeatTs` must be in `[hbIntervalMs*0.5, *3]`
   (else `400 BAD_CADENCE`).
7. `nextChallenge = HMAC(PRISM_IMPRESSION_SECRET, "{impressionId}|{beatIndex}|{prevChallenge}")`.
8. Persist state.

### Redis keys (TTL = `HB_TOKEN_TTL_SECONDS` = 600s)
- `hb:{nonce}` -> `{ firstBeatTs, lastBeatTs, beatCount, lastChallenge }`
- `hbn:{nonce}:{beatNonce}` -> `'1'` (single-use beat)

### Gating in `/api/impressions` (only when `PRISM_HEARTBEAT_ENFORCED`)
- `serverDwellMs = lastBeatTs - firstBeatTs`.
- Require `beatCount >= hbMinBeats` AND `serverDwellMs >= 800` (`MIN_ATTENTION_MS`).
- Insufficient/missing -> `validated=false` + `payout_hold` + flag `heartbeat_insufficient`,
  and a per-identity `heartbeat_coverage_low` anomaly past threshold.
- `durationMs` is advisory; a large `|durationMs - serverDwellMs|` adds the
  `client_server_dwell_mismatch` fraud signal.
- Flag off: today's behavior; heartbeats are still recorded.

### Shadow mode
While enforcement is off and shadow is on (default), the impressions route logs
`[hb-shadow] would-reject ...` for impressions that would fail the dwell gate, with
zero payout effect. Use this to measure real heartbeat coverage before enforcing.

## Feature 2 - proof-of-humanity on device minting

`/api/auth/register-device` now computes a `verified` tag for every mint:
- Verified if a signed-in Supabase session is present, or a valid Turnstile token
  (`turnstileToken` in the body) is supplied.
- When `PRISM_DEVICE_POH_ENFORCED` is on: no proof -> `403 PROOF_REQUIRED`; and a
  signed-in account is capped at `MAX_DEVICES_PER_ACCOUNT`.
- Flag off: anonymous minting still works, but rows are tagged `verified=false`.

A per-IP **daily** cap (50/day) is added on top of the existing 10/hr.

Impressions: when `PRISM_DEVICE_POH_ENFORCED` is on, an unverified (or keyless)
identity is held (`validated=false`, flag `unverified_identity`). DB column
`device_credentials.verified` (default false) carries the tag.

### Terminal earners
`prism-claude-status-line.sh` calls `/api/ads` with no device key, so terminal
earners are **keyless/anonymous** and read as unverified. They keep working while
the PoH flag is off; when it is on they become payout-hold candidates until the
terminal path mints a verified key. The current terminal flow is unchanged.

## Rollout plan
1. **Deploy with all flags off** (shadow on). New endpoint + token fields ship; no
   behavior change.
2. **Update clients** (overlay + terminal) to send heartbeats and, for minting, a
   Turnstile token or session. No current client sends heartbeats yet, so enforcing
   before clients are updated would hold all payouts.
3. **Measure** `[hb-shadow]` coverage until the vast majority of real impressions
   have sufficient heartbeats.
4. **Flip `PRISM_HEARTBEAT_ENFORCED`**, then `PRISM_DEVICE_POH_ENFORCED`, watching
   the new anomalies and fraud signals. Roll back by unsetting the flag.

## Tests
`src/lib/api/heartbeat.test.ts` (challenge accept/reject, replay, cadence, dwell
gate, deterministic challenge) and `src/lib/env-flags.test.ts` (flag defaults /
shadow defaulting / cap). Run: `npx tsx --test src/lib/api/heartbeat.test.ts src/lib/env-flags.test.ts`.
