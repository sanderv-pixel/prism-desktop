const STORAGE_KEY = 'prism:settings'

export interface PrismBrowserSettings {
  enabled: boolean
  apiUrl: string
  userId: string
  apiKey: string
  deviceApiKey: string
  consentGivenAt?: string
}

const DEFAULTS: PrismBrowserSettings = {
  enabled: false,
  apiUrl: 'http://localhost:3004/api',
  userId: generateAnonymousUserId(),
  apiKey: '',
  deviceApiKey: '',
}

function generateAnonymousUserId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'prism_browser_'
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

export async function getSettings(): Promise<PrismBrowserSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY)
  const stored = result[STORAGE_KEY] ?? {}
  return {
    ...DEFAULTS,
    ...stored,
  }
}

export async function saveSettings(settings: Partial<PrismBrowserSettings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.sync.set({
    [STORAGE_KEY]: {
      ...current,
      ...settings,
    },
  })
}

export async function ensureUserId(): Promise<string> {
  const settings = await getSettings()
  if (!settings.userId) {
    const userId = generateAnonymousUserId()
    await saveSettings({ userId })
    return userId
  }
  return settings.userId
}

export function getBrowserFingerprint(): Record<string, string> {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  }
}

export async function getEffectiveApiKey(): Promise<string> {
  const settings = await getSettings()
  return settings.deviceApiKey || settings.apiKey
}

export async function ensureDeviceApiKey(): Promise<string> {
  const settings = await getSettings()
  if (settings.deviceApiKey) return settings.deviceApiKey
  if (!settings.apiKey) return ''

  try {
    const url = `${settings.apiUrl.replace(/\/$/, '')}/auth/register-device`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Prism-Api-Key': settings.apiKey,
        'X-Prism-Client': 'PrismBrowser/0.1.0',
      },
      body: JSON.stringify({
        anonymousUserId: settings.userId,
        fingerprint: getBrowserFingerprint(),
      }),
    })

    if (!res.ok) return settings.apiKey

    const data = (await res.json()) as { apiKey?: string }
    if (data.apiKey) {
      await saveSettings({ deviceApiKey: data.apiKey })
      return data.apiKey
    }
  } catch {
    // ignore
  }

  return settings.apiKey
}
