// Contextual targeting tags for Prism campaigns.
// These are matched on-device against editor, language, AI tool, and intent signals.
// Keep values lowercase and hyphen-free for easy matching.

export const CONTEXT_OPTIONS = [
  // AI assistants (broad, non-dev audiences)
  'chatgpt',
  'claude',
  'gemini',
  'perplexity',
  'copilot',
  'general-ai',

  // Audience / intent (non-dev)
  'general',
  'productivity',
  'writing',
  'research',
  'learning',
  'education',
  'business',
  'professional',
  'marketing',
  'creative',
  'lifestyle',
  'entertainment',
  'job-seeking',
  'hiring',

  // Roles
  'developers',
  'vibecoders',
  'founders',
  'recruiters',
  'hiring-managers',
  'students',
  'educators',
  'designers',
  'writers',
  'researchers',
  'marketers',

  // Coding / dev tools
  'cursor',
  'vscode',
  'windsurf',
  'devtools',

  // Languages
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',

  // Frameworks
  'nextjs',
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
  'flutter',
  'electron',
  'react-native',
  'expo',

  // Libraries / services
  'prisma',
  'stripe',
  'supabase',
  'firebase',
  'mongodb',
  'postgres',
  'redis',
  'graphql',
  'trpc',
  'tailwind',
  'shadcn',
  'zod',
  'authjs',
  'clerk',
  'openai',
  'anthropic',
  'langchain',

  // AI builders / no-code
  'lovable',
  'v0',
  'bolt',
  'replit',

  // Verticals
  'saas',
  'cloud',
  'design',
  'devops',
  'infrastructure',
  'data',
  'security',
]

export const PRESETS: Record<string, string[]> = {
  'Ai general': ['chatgpt', 'claude', 'gemini', 'general-ai', 'general', 'productivity'],
  'Ai creators': ['chatgpt', 'claude', 'writing', 'creative', 'design', 'marketing'],
  'Ai learners': ['chatgpt', 'claude', 'perplexity', 'learning', 'education', 'research'],
  SaaS: ['typescript', 'saas', 'cursor', 'vscode', 'business', 'professional', 'founders'],
  Cloud: ['python', 'go', 'cloud', 'vscode', 'devops', 'infrastructure', 'developers'],
  Design: ['design', 'v0', 'lovable', 'bolt', 'creative', 'designers'],
  'Next.js / React': ['nextjs', 'react', 'typescript', 'javascript', 'cursor', 'vscode'],
  'Python / Ai': ['python', 'fastapi', 'django', 'openai', 'anthropic', 'langchain'],
  'Full-stack': ['nextjs', 'react', 'prisma', 'supabase', 'stripe', 'tailwind', 'typescript'],
  Vibecoders: ['vibecoders', 'lovable', 'v0', 'bolt', 'replit', 'chatgpt', 'claude', 'general-ai'],
  'Job seekers': ['job-seeking', 'developers', 'chatgpt', 'claude', 'general', 'business'],
  'Hiring companies': ['hiring', 'recruiters', 'hiring-managers', 'founders', 'business', 'general'],
}
