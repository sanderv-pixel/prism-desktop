// Contextual targeting for Prism campaigns.
//
// Tags are grouped by the axis of the request signal they match against
// (see getSignals in /api/ads): surface = editor/aiTool, audience = audience/intent,
// stack = language/frameworks/libraries/projectType. Matching is OR within an axis
// and AND across the axes an advertiser targets, so adding tags in a NEW group
// narrows reach (the intuitive direction) while adding tags in the SAME group widens
// it. An empty selection means broad reach (serve everywhere).
//
// Keep values lowercase and hyphen-free so they string-match the on-device signals.

export type ContextAxis = 'surface' | 'audience' | 'stack'

export interface ContextGroup {
  id: ContextAxis
  label: string
  help: string
  /** Connector used when describing a match, e.g. "Shows on cursor", "for founders". */
  verb: string
  options: string[]
}

export const CONTEXT_GROUPS: ContextGroup[] = [
  {
    id: 'surface',
    label: 'Surfaces & AI tools',
    help: 'Where the ad can appear: the AI assistant, editor, or builder in use.',
    verb: 'on',
    options: [
      'chatgpt', 'claude', 'gemini', 'perplexity', 'copilot', 'general-ai',
      'cursor', 'vscode', 'windsurf', 'devtools',
      'lovable', 'v0', 'bolt', 'replit',
    ],
  },
  {
    id: 'audience',
    label: 'Audience & intent',
    help: 'Who is on the other side and what they are trying to do.',
    verb: 'for',
    options: [
      'developers', 'vibecoders', 'founders', 'recruiters', 'hiring-managers',
      'students', 'educators', 'designers', 'writers', 'researchers', 'marketers',
      'general', 'productivity', 'writing', 'research', 'learning', 'education',
      'business', 'professional', 'marketing', 'creative', 'lifestyle',
      'entertainment', 'job-seeking', 'hiring',
    ],
  },
  {
    id: 'stack',
    label: 'Tech stack',
    help: 'The languages, frameworks, libraries, and verticals in the project.',
    verb: 'using',
    options: [
      'typescript', 'javascript', 'python', 'go', 'rust',
      'nextjs', 'react', 'vue', 'svelte', 'angular', 'nuxt', 'remix', 'astro',
      'django', 'flask', 'fastapi', 'rails', 'laravel',
      'flutter', 'electron', 'react-native', 'expo',
      'prisma', 'stripe', 'supabase', 'firebase', 'mongodb', 'postgres', 'redis',
      'graphql', 'trpc', 'tailwind', 'shadcn', 'zod', 'authjs', 'clerk',
      'openai', 'anthropic', 'langchain',
      'saas', 'cloud', 'design', 'devops', 'infrastructure', 'data', 'security',
    ],
  },
]

// Flat list of every tag, kept for backward-compatible imports.
export const CONTEXT_OPTIONS: string[] = CONTEXT_GROUPS.flatMap((g) => g.options)

// Reverse lookup: tag -> axis.
export const TAG_AXIS: Record<string, ContextAxis> = Object.fromEntries(
  CONTEXT_GROUPS.flatMap((g) => g.options.map((o) => [o, g.id] as const))
)

// Presets seed a sensible multi-axis selection. They no longer rely on a magic
// "serve everywhere" tag; broad reach is now an explicit, separate choice.
export const PRESETS: Record<string, string[]> = {
  'AI assistants': ['chatgpt', 'claude', 'gemini', 'perplexity', 'copilot'],
  'AI creators': ['chatgpt', 'claude', 'writing', 'creative', 'marketing'],
  'AI learners': ['chatgpt', 'claude', 'perplexity', 'learning', 'research'],
  SaaS: ['cursor', 'vscode', 'typescript', 'saas', 'founders'],
  Cloud: ['vscode', 'python', 'go', 'cloud', 'devops'],
  Design: ['v0', 'lovable', 'bolt', 'design', 'designers'],
  'Next.js / React': ['cursor', 'vscode', 'nextjs', 'react', 'typescript'],
  'Python / AI': ['cursor', 'vscode', 'python', 'fastapi', 'openai', 'anthropic'],
  'Full-stack': ['cursor', 'nextjs', 'react', 'prisma', 'supabase', 'stripe'],
  Vibecoders: ['lovable', 'v0', 'bolt', 'replit', 'vibecoders'],
  'Job seekers': ['chatgpt', 'claude', 'job-seeking', 'developers'],
  'Hiring companies': ['recruiters', 'hiring-managers', 'hiring', 'founders'],
}

/** Split a flat tag list into its axes. Unknown/legacy tags fall under `stack`. */
export function groupContexts(contexts: string[]): Record<ContextAxis, string[]> {
  const out: Record<ContextAxis, string[]> = { surface: [], audience: [], stack: [] }
  for (const tag of contexts) {
    const axis = TAG_AXIS[tag] ?? 'stack'
    out[axis].push(tag)
  }
  return out
}

/**
 * Eligibility test used by ad serving. A request matches when, for every axis the
 * advertiser targeted, at least one of that axis's tags is present in the request
 * signals (OR within an axis, AND across axes). An empty selection serves everywhere.
 */
export function matchesContexts(signals: string[], contexts: string[]): boolean {
  if (!contexts || contexts.length === 0) return true
  const sig = new Set(signals.map((s) => s.toLowerCase()))
  const grouped = groupContexts(contexts)
  for (const axis of Object.keys(grouped) as ContextAxis[]) {
    const tags = grouped[axis]
    if (tags.length === 0) continue
    if (!tags.some((t) => sig.has(t.toLowerCase()))) return false
  }
  return true
}

/** Plain-language description of when a campaign with these tags will show. */
export function describeMatch(contexts: string[]): string {
  if (!contexts || contexts.length === 0) return 'Shows everywhere (broad reach).'
  const grouped = groupContexts(contexts)
  const parts: string[] = []
  for (const g of CONTEXT_GROUPS) {
    const tags = grouped[g.id]
    if (tags.length > 0) parts.push(`${g.verb} ${tags.join(' or ')}`)
  }
  return parts.length > 0 ? `Shows ${parts.join(', ')}.` : 'Shows everywhere (broad reach).'
}
