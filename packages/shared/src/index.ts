export const PRISM_API_DEFAULT_URL = 'https://goprism.dev/api'

export const PRISM_API_VERSION = 'v1'

export const PRISM_USER_AGENT = 'PrismExtension/0.1.0'

export interface AdPayload {
  id: string
  copy: string
  url: string
  clickUrl?: string
  iconUrl?: string
  advertiserName: string
  cta?: string
  impressionToken?: string
  conversionToken?: string
  userId?: string
  sessionId?: string
}

export interface ImpressionEvent {
  userId: string
  campaignId: string
  impressionToken: string
  sessionId?: string
  context: string
  durationMs: number
  timestamp: string
  fingerprint?: string | Record<string, string>
}

export interface AdContext {
  editor?: string
  language?: string
  projectType?: string
  frameworks?: string[]
  libraries?: string[]
  aiTool?: string
  intent?: string
  audience?: string
  waitState: boolean
}

export interface AdRequest {
  context: AdContext
  userId?: string
  sessionId?: string
  hiddenAdvertisers?: string[]
  fingerprint?: string | Record<string, string>
}


export interface ApiError {
  error: string
  code?: string
}

export function buildApiUrl(baseUrl: string, path: string): string {
  const normalized = baseUrl.replace(/\/$/, '')
  const normalizedPath = path.replace(/^\//, '')
  return `${normalized}/${normalizedPath}`
}

export async function fetchAd(
  apiUrl: string,
  request: AdRequest,
  options: { timeoutMs?: number; apiKey?: string } = {}
): Promise<AdPayload | null> {
  const timeoutMs = options.timeoutMs ?? 3000

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Prism-Client': PRISM_USER_AGENT,
    }
    if (options.apiKey) {
      headers['X-Prism-Api-Key'] = options.apiKey
    }

    const res = await fetch(buildApiUrl(apiUrl, '/ads'), {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    if (!res.ok) {
      return null
    }

    const data = (await res.json()) as AdPayload
    return isValidAdPayload(data) ? data : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function reportImpression(
  apiUrl: string,
  event: ImpressionEvent,
  options: { timeoutMs?: number; apiKey?: string } = {}
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 5000

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Prism-Client': PRISM_USER_AGENT,
    }
    if (options.apiKey) {
      headers['X-Prism-Api-Key'] = options.apiKey
    }

    const res = await fetch(buildApiUrl(apiUrl, '/impressions'), {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      signal: controller.signal,
    })

    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export function isValidAdPayload(value: unknown): value is AdPayload {
  if (typeof value !== 'object' || value === null) return false
  const ad = value as Partial<AdPayload>
  return (
    typeof ad.id === 'string' &&
    ad.id.length > 0 &&
    typeof ad.copy === 'string' &&
    ad.copy.length > 0 &&
    typeof ad.url === 'string' &&
    ad.url.length > 0 &&
    typeof ad.advertiserName === 'string' &&
    ad.advertiserName.length > 0
  )
}


