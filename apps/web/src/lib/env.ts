/**
 * Production environment validation.
 *
 * This module is safe to import in both Node and Edge runtimes. It throws
 * early in production when a required secret or configuration value is missing,
 * so the app fails closed instead of running with insecure defaults.
 */

const isProduction = () => process.env.NODE_ENV === 'production'

function isBuildPhase(): boolean {
  // Next.js sets NEXT_PHASE=phase-*-build during static generation / builds.
  const phase = process.env.NEXT_PHASE ?? ''
  return phase.includes('build')
}

interface EnvRequirement {
  name: string
}

const REQUIRED: EnvRequirement[] = [
  { name: 'NEXT_PUBLIC_SITE_URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_URL' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY' },
  { name: 'PRISM_IMPRESSION_SECRET' },
  { name: 'PRISM_API_KEYS' },
  { name: 'PRISM_ADMIN_EMAILS' },
  { name: 'UPSTASH_REDIS_REST_URL' },
  { name: 'UPSTASH_REDIS_REST_TOKEN' },
  { name: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY' },
  { name: 'TURNSTILE_WORKER_URL' },
  // Money path: Stripe is always required to take payment. (Payout-provider keys
  // are checked separately below as "at least one configured", since Wise and
  // Payoneer are intentionally optional/either-or.)
  { name: 'STRIPE_SECRET_KEY' },
  { name: 'STRIPE_WEBHOOK_SECRET' },
  { name: 'STRIPE_PRICE_ID' },
]

function isTruthy(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function validateListVar(name: string, minItems: number): string | null {
  const raw = process.env[name]
  if (!isTruthy(raw)) return `${name} (empty)`
  const items = raw!.split(',').map((s) => s.trim()).filter(Boolean)
  if (items.length < minItems) return `${name} (need at least ${minItems})`
  return null
}

/**
 * Throws if any required production environment variable is missing or invalid.
 * Safe to call in Edge and Node runtimes. It is a no-op in development and
 * during the build/static-generation phase.
 */
export function validateProductionEnv(): void {
  if (!isProduction() || isBuildPhase()) return

  const failures: string[] = []

  for (const { name } of REQUIRED) {
    if (!isTruthy(process.env[name])) {
      failures.push(name)
    }
  }

  const apiKeyError = validateListVar('PRISM_API_KEYS', 1)
  if (apiKeyError) failures.push(apiKeyError)

  const adminError = validateListVar('PRISM_ADMIN_EMAILS', 1)
  if (adminError) failures.push(adminError)

  // Payouts: at least one provider should be fully configured. Warn rather than
  // throw, so a deploy that has not wired payouts yet still boots (non-breaking).
  const wiseReady = isTruthy(process.env.WISE_API_TOKEN) && isTruthy(process.env.WISE_PROFILE_ID)
  const payoneerReady =
    isTruthy(process.env.PAYONEER_CLIENT_ID) &&
    isTruthy(process.env.PAYONEER_CLIENT_SECRET) &&
    isTruthy(process.env.PAYONEER_PROGRAM_ID)
  if (!wiseReady && !payoneerReady) {
    console.warn(
      '[env] No payout provider fully configured (Wise or Payoneer). Creator payouts will fail until one is set.'
    )
  }

  // Test/live key parity. Only enforced when PRISM_ENV is explicitly set, so the
  // default (unset) keeps today's behavior. Refuses a mismatched Stripe key.
  const prismEnv = (process.env.PRISM_ENV || '').toLowerCase()
  const stripeKey = process.env.STRIPE_SECRET_KEY || ''
  if (prismEnv === 'production' && stripeKey.startsWith('sk_test_')) {
    failures.push('PRISM_ENV=production but STRIPE_SECRET_KEY is a test key (sk_test_)')
  } else if (prismEnv === 'test' && stripeKey.startsWith('sk_live_')) {
    failures.push('PRISM_ENV=test but STRIPE_SECRET_KEY is a live key (sk_live_)')
  }

  if (failures.length > 0) {
    throw new Error(
      `Production environment is not configured correctly. Missing or invalid variables: ${failures.join(', ')}`
    )
  }
}

// --- Anti-bot feature flags (read at call time so they can be flipped via env) ---
// All default to today's behavior. Heartbeat enforcement and PoH enforcement are
// OFF; heartbeat shadow logging is ON only while enforcement is off.

const flag = (name: string): boolean => (process.env[name] ?? '').toLowerCase() === 'true'

/** Gate payout on server-measured heartbeat dwell. Default false. */
export function isHeartbeatEnforced(): boolean {
  return flag('PRISM_HEARTBEAT_ENFORCED')
}

/**
 * Log what heartbeat enforcement *would* reject without affecting payouts.
 * Defaults to true while enforcement is off, false once enforcement is on
 * (no point shadowing what you already enforce). Can be forced with the env var.
 */
export function isHeartbeatShadow(): boolean {
  const raw = (process.env.PRISM_HEARTBEAT_SHADOW ?? '').toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  return !isHeartbeatEnforced()
}

/** Require a human proof (Turnstile or signed-in session) to mint a device key. Default false. */
export function isDevicePohEnforced(): boolean {
  return flag('PRISM_DEVICE_POH_ENFORCED')
}

/** Max earning-device keys per verified account. Default 5. */
export function maxDevicesPerAccount(): number {
  const n = Number.parseInt(process.env.MAX_DEVICES_PER_ACCOUNT ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : 5
}
