import * as vscode from 'vscode'
import { buildApiUrl, PRISM_USER_AGENT } from '@prism/shared'
import { getConfig, updateConfig } from './config'

function getDeviceFingerprint(): Record<string, string> {
  const env = vscode.env as unknown as Record<string, string | undefined>
  return {
    machineId: env.machineId ?? 'unknown',
    sessionId: env.sessionId ?? 'unknown',
    appName: env.appName ?? 'unknown',
    appHost: env.appHost ?? 'unknown',
    uiKind: String(env.uiKind ?? 'unknown'),
    version: vscode.version,
    platform: process.platform,
  }
}

export async function getEffectiveApiKey(): Promise<string> {
  const cfg = getConfig()
  return cfg.deviceApiKey || cfg.apiKey
}

export async function ensureDeviceApiKey(
  log: (message: string) => void
): Promise<string> {
  const cfg = getConfig()
  if (cfg.deviceApiKey) return cfg.deviceApiKey
  if (!cfg.apiKey) {
    log('No legacy API key configured; skipping device registration')
    return ''
  }

  try {
    const url = buildApiUrl(cfg.apiUrl, '/auth/register-device')
    const body = {
      anonymousUserId: cfg.userId,
      fingerprint: getDeviceFingerprint(),
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Prism-Api-Key': cfg.apiKey,
        'X-Prism-Client': PRISM_USER_AGENT,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      log(`Device registration failed: HTTP ${res.status}`)
      return cfg.apiKey
    }

    const data = (await res.json()) as { apiKey?: string }
    if (data.apiKey) {
      await updateConfig('deviceApiKey', data.apiKey)
      log('Per-install device API key registered and stored')
      return data.apiKey
    }
  } catch (err) {
    log(`Device registration error: ${err instanceof Error ? err.message : String(err)}`)
  }

  return cfg.apiKey
}

export function getFingerprintForRequest(): Record<string, string> {
  return getDeviceFingerprint()
}
