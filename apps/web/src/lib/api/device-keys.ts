import { createAdminClient } from '@/utils/supabase/admin'
import { kvGet, kvSet } from '@/lib/redis'

const DEVICE_KEY_PREFIX = 'prism_live_'
const KEY_ENTROPY_BYTES = 32
const CACHE_TTL_SECONDS = 300

function generateRandomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateDeviceApiKey(): string {
  return `${DEVICE_KEY_PREFIX}${generateRandomString(KEY_ENTROPY_BYTES)}`
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(key))
  return Buffer.from(digest).toString('hex')
}

function normalizeFingerprint(input: unknown): string {
  if (input === null || input === undefined) return ''
  if (typeof input === 'string') return input.trim()
  return JSON.stringify(input)
}

export async function hashFingerprint(input: unknown): Promise<string> {
  const normalized = normalizeFingerprint(input)
  if (!normalized) return ''
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(normalized))
  return Buffer.from(digest).toString('hex')
}

export interface DeviceCredentialValidation {
  valid: boolean
  revoked: boolean
  anonymousUserId?: string
  fingerprintHash?: string | null
  verified?: boolean
}

interface DeviceCredentialRow {
  id: string
  anonymous_user_id: string
  api_key_hash: string
  fingerprint_hash: string | null
  revoked: boolean
  verified?: boolean
}

export async function registerDeviceCredential(input: {
  anonymousUserId: string
  apiKey: string
  fingerprint?: unknown
  ip?: string
  verified?: boolean
}): Promise<void> {
  const supabase = createAdminClient()
  const [apiKeyHash, fingerprintHash] = await Promise.all([
    hashApiKey(input.apiKey),
    input.fingerprint ? hashFingerprint(input.fingerprint) : Promise.resolve(null),
  ])

  // anonymous_user_id is UNIQUE (one credential per account). Re-pairing (a new
  // device, a reinstall, or after clearing the local key) must replace the
  // existing credential rather than throw a unique-violation 500 — so upsert and
  // un-revoke. The previous key's hash is overwritten, invalidating it.
  const { error } = await supabase.from('device_credentials').upsert(
    {
      anonymous_user_id: input.anonymousUserId,
      api_key_hash: apiKeyHash,
      fingerprint_hash: fingerprintHash,
      last_seen_ip: input.ip ?? null,
      revoked: false,
      verified: input.verified ?? false,
    },
    { onConflict: 'anonymous_user_id' }
  )

  if (error) throw error
}

export async function validateDeviceApiKey(
  apiKey: string
): Promise<DeviceCredentialValidation> {
  if (!apiKey.startsWith(DEVICE_KEY_PREFIX)) {
    return { valid: false, revoked: false }
  }

  const hash = await hashApiKey(apiKey)
  const cacheKey = `prism:device_key:${hash}`
  const cached: unknown = await kvGet(cacheKey)

  if (cached) {
    // Upstash auto-deserializes JSON, so a cached JSON string can come back as an
    // object; the in-memory dev store returns the raw string. Handle both, else the
    // cache never hits and every request does a DB key lookup.
    if (typeof cached === 'object') return cached as DeviceCredentialValidation
    try {
      return JSON.parse(String(cached)) as DeviceCredentialValidation
    } catch {
      // Ignore corrupt cache entry and fall through to DB.
    }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('device_credentials')
    .select('*')
    .eq('api_key_hash', hash)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    const result: DeviceCredentialValidation = { valid: false, revoked: false }
    return result
  }

  const row = data as DeviceCredentialRow
  const result: DeviceCredentialValidation = {
    valid: true,
    revoked: row.revoked,
    anonymousUserId: row.anonymous_user_id,
    fingerprintHash: row.fingerprint_hash,
    verified: row.verified ?? false,
  }

  await kvSet(cacheKey, JSON.stringify(result), { ex: CACHE_TTL_SECONDS })

  // Best-effort refresh of last-used metadata.
  supabase
    .from('device_credentials')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)
    .then(
      () => {},
      () => {}
    )

  return result
}

export async function getDeviceCredentialByUserId(
  anonymousUserId: string
): Promise<DeviceCredentialRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('device_credentials')
    .select('*')
    .eq('anonymous_user_id', anonymousUserId)
    .maybeSingle()

  if (error) throw error
  return (data as DeviceCredentialRow | null) ?? null
}

// Count earning-device credentials linked to a verified account (the auth user id
// plus any anonymous ids linked via builder_identities). Used to cap Sybil minting.
export async function countAccountDeviceCredentials(authUserId: string): Promise<number> {
  const supabase = createAdminClient()
  const { data: identities } = await supabase
    .from('builder_identities')
    .select('anonymous_user_id')
    .eq('auth_user_id', authUserId)
  const ids = [authUserId, ...(identities ?? []).map((i) => i.anonymous_user_id)]
  const { count } = await supabase
    .from('device_credentials')
    .select('id', { count: 'exact', head: true })
    .in('anonymous_user_id', ids)
    .eq('revoked', false)
  return count ?? 0
}

// Trust on first use: record the device fingerprint the first time one arrives,
// but only when none is established yet (the `is null` guard avoids overwriting a
// known device and is race-safe). Later impressions from a different device then
// mismatch and get caught.
export async function setDeviceFingerprintHash(
  anonymousUserId: string,
  fingerprintHash: string
): Promise<void> {
  if (!fingerprintHash) return
  const supabase = createAdminClient()
  await supabase
    .from('device_credentials')
    .update({ fingerprint_hash: fingerprintHash })
    .eq('anonymous_user_id', anonymousUserId)
    .is('fingerprint_hash', null)
}

export async function incrementFingerprintMismatchCount(
  anonymousUserId: string
): Promise<number> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('increment_fingerprint_mismatch', {
    p_anonymous_user_id: anonymousUserId,
  })

  if (error) throw error
  return (data as number | null) ?? 0
}
