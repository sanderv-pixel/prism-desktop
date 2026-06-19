export interface PageContext {
  platform: 'chatgpt' | 'claude' | 'perplexity' | 'unknown'
  url: string
  title: string
  waitState: boolean
  topic?: string
  intent?: string
}

const PLATFORM_PATTERNS = [
  { platform: 'chatgpt' as const, hosts: ['chat.openai.com', 'chatgpt.com'] },
  { platform: 'claude' as const, hosts: ['claude.ai'] },
  { platform: 'perplexity' as const, hosts: ['www.perplexity.ai', 'perplexity.ai'] },
]

export function detectPlatform(url: string): PageContext['platform'] {
  const hostname = new URL(url).hostname.toLowerCase()
  for (const p of PLATFORM_PATTERNS) {
    if (p.hosts.includes(hostname)) return p.platform
  }
  return 'unknown'
}

export function detectWaitState(platform: PageContext['platform']): boolean {
  // Detect common AI-generating indicators without reading message content.
  const selectors: Record<string, string[]> = {
    chatgpt: ['[data-testid*="stop"]', '.animate-pulse', '[aria-label*="Stop"]', '[data-testid*="streaming"]', '.result-streaming'],
    claude: ['[data-testid*="stop"]', '.animate-pulse', '[aria-label*="Stop generating"]', '.streaming'],
    perplexity: ['.animate-pulse', '[data-testid*="loading"]', '.loading'],
  }

  if (platform === 'unknown') return false
  const tests = selectors[platform] ?? []
  return tests.some((selector) => document.querySelector(selector) !== null)
}

export function detectTopic(platform: PageContext['platform']): string | undefined {
  // Coarse topic detection from page title only.
  // We intentionally do not scan chat message content in the default build.
  const title = document.title.toLowerCase()

  if (platform === 'chatgpt' || platform === 'claude') {
    if (title.includes('code') || title.includes('debug')) return 'coding'
    if (title.includes('write') || title.includes('essay') || title.includes('email')) return 'writing'
    if (title.includes('learn') || title.includes('explain')) return 'learning'
    return 'general'
  }

  if (platform === 'perplexity') {
    if (title.includes('code') || title.includes('programming')) return 'coding'
    return 'research'
  }

  return undefined
}

const JOB_SEEKING_PATTERNS = [
  /resume/i,
  /cv/i,
  /cover.?letter/i,
  /portfolio/i,
  /job.?application/i,
  /linkedin\.com\/jobs/i,
  /indeed\.com/i,
  /glassdoor\.com/i,
  /angel\.co\/jobs/i,
  /wellfound\.com\/jobs/i,
]

const HIRING_PATTERNS = [
  /careers/i,
  /we'?re.?hiring/i,
  /join.?our.?team/i,
  /open.?positions/i,
  /job.?description/i,
  /ats\./i,
  /greenhouse\.io/i,
  /lever\.co/i,
  /workday\.com/i,
  /apply/i,
]

export function detectIntent(url: string, title: string): string | undefined {
  const combined = `${url} ${title}`.toLowerCase()
  if (HIRING_PATTERNS.some((p) => p.test(combined))) {
    return 'hiring'
  }
  if (JOB_SEEKING_PATTERNS.some((p) => p.test(combined))) {
    return 'job-seeking'
  }
  return undefined
}

export function detectPageContext(): PageContext {
  const url = location.href
  const platform = detectPlatform(url)
  const title = document.title
  return {
    platform,
    url,
    title,
    waitState: detectWaitState(platform),
    topic: detectTopic(platform),
    intent: detectIntent(url, title),
  }
}
