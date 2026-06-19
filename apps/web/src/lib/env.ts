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

  if (failures.length > 0) {
    throw new Error(
      `Production environment is not configured correctly. Missing or invalid variables: ${failures.join(', ')}`
    )
  }
}
