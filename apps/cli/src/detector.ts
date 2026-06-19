import * as fs from 'fs'
import * as path from 'path'

const VIBE_TOOLS = new Set(['lovable', 'v0', 'bolt', 'replit'])
const DEV_FRAMEWORKS = new Set([
  'next',
  'react',
  'vue',
  'svelte',
  'angular',
  'nuxt',
  'remix',
  'astro',
  'django',
  'flask',
  'fastapi',
  'rails',
  'laravel',
  'electron',
])
const DEV_LIBRARIES = new Set([
  'prisma',
  'stripe',
  'supabase',
  'mongodb',
  'mongoose',
  'pg',
  'redis',
  'graphql',
  'trpc',
  'zod',
  'next-auth',
  '@auth/core',
  '@clerk/clerk-react',
  'langchain',
])

function readPackageJson(cwd: string): Record<string, string> | null {
  try {
    const raw = fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8')
    const pkg = JSON.parse(raw)
    return {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    }
  } catch {
    return null
  }
}

function readRequirementsTxt(cwd: string): Record<string, string> | null {
  try {
    const raw = fs.readFileSync(path.join(cwd, 'requirements.txt'), 'utf-8')
    const deps: Record<string, string> = {}
    for (const line of raw.split('\n')) {
      const name = line.split(/[=<>!~]/)[0].trim().toLowerCase()
      if (name) deps[name] = '*'
    }
    return deps
  } catch {
    return null
  }
}

const JOB_SEEKING_PATTERNS = [
  /resume/i,
  /cv/i,
  /cover.?letter/i,
  /portfolio/i,
  /job.?application/i,
  /linkedin/i,
]

const HIRING_PATTERNS = [
  /job.?description/i,
  /job.?req/i,
  /req-?\d/i,
  /hiring.?plan/i,
  /recruiting/i,
  /talent.?pipeline/i,
  /interview.?questions/i,
  /offer.?letter/i,
]

export function detectIntent(cwd = process.cwd()): string | undefined {
  try {
    const files = fs.readdirSync(cwd)
    for (const file of files) {
      if (HIRING_PATTERNS.some((p) => p.test(file))) return 'hiring'
      if (JOB_SEEKING_PATTERNS.some((p) => p.test(file))) return 'job-seeking'
    }
  } catch {
    // Ignore.
  }
  return undefined
}

export function detectAudience(cwd = process.cwd()): 'developers' | 'vibecoders' {
  const deps = readPackageJson(cwd) ?? readRequirementsTxt(cwd) ?? {}
  const names = Object.keys(deps).map((n) => n.toLowerCase())

  const hasVibeTool = names.some((n) => VIBE_TOOLS.has(n))
  const hasDevFramework = names.some((n) => DEV_FRAMEWORKS.has(n))
  const hasDevLibrary = names.some((n) => DEV_LIBRARIES.has(n))

  if (hasVibeTool && !hasDevFramework && !hasDevLibrary) {
    return 'vibecoders'
  }

  if (hasDevFramework || hasDevLibrary) {
    return 'developers'
  }

  return names.length <= 1 ? 'vibecoders' : 'developers'
}
