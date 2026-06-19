import * as vscode from 'vscode'
import { PRISM_API_DEFAULT_URL } from '@prism/shared'

export const CONFIG_SECTION = 'prism'

export interface PrismConfig {
  enabled: boolean
  apiUrl: string
  userId: string
  apiKey: string
  deviceApiKey: string
  showAdsWhenNoWait: boolean
  minimumWaitMs: number
  autoUpdate: boolean
  updateUrl: string
}

export function getConfig(): PrismConfig {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION)
  return {
    enabled: cfg.get<boolean>('enabled', true),
    apiUrl: cfg.get<string>('apiUrl', PRISM_API_DEFAULT_URL),
    userId: cfg.get<string>('userId', generateAnonymousUserId()),
    apiKey: cfg.get<string>('apiKey', ''),
    deviceApiKey: cfg.get<string>('deviceApiKey', ''),
    showAdsWhenNoWait: cfg.get<boolean>('showAdsWhenNoWait', false),
    minimumWaitMs: cfg.get<number>('minimumWaitMs', 1500),
    autoUpdate: cfg.get<boolean>('autoUpdate', true),
    updateUrl: cfg.get<string>('updateUrl', 'https://goprism.dev/extension/latest.json'),
  }
}

export function updateConfig(key: string, value: unknown): Thenable<void> {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).update(key, value, true)
}

export function ensureUserId(): string {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION)
  let userId = cfg.get<string>('userId')
  if (!userId) {
    userId = generateAnonymousUserId()
    cfg.update('userId', userId, true)
  }
  return userId
}

function generateAnonymousUserId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'prism_'
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

export function isCursor(): boolean {
  // Cursor reports its own app name in the vscode.env object when available.
  const appName = (vscode.env as unknown as Record<string, string | undefined>).appName
  if (appName && /cursor/i.test(appName)) return true

  // Cursor historically uses a distinct extension host identifier.
  const appHost = (vscode.env as unknown as Record<string, string | undefined>).appHost
  if (appHost && /cursor/i.test(appHost)) return true

  return false
}
