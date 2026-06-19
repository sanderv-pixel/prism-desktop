import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { fetchAd, AdContext } from '@prism/shared'
import { detectAudience, detectIntent } from './detector'

const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json')
const BACKUP_PATH = path.join(CLAUDE_DIR, 'settings.json.prism-backup')
const DEFAULT_API_URL = process.env.PRISM_API_URL || 'http://localhost:3004/api'

interface SpinnerVerbsConfig {
  mode: 'append' | 'replace'
  verbs: string[]
}

interface StatusLineConfig {
  type: 'command'
  command: string
  padding?: number
  refreshInterval?: number
  hideVimModeIndicator?: boolean
}

interface ClaudeSettings {
  env?: Record<string, string>
  spinnerVerbs?: SpinnerVerbsConfig
  statusLine?: StatusLineConfig
  [key: string]: unknown
}

function readSettings(): ClaudeSettings {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return {}
  }
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
    return JSON.parse(raw) as ClaudeSettings
  } catch (err) {
    console.error('Failed to read Claude settings:', err)
    return {}
  }
}

function writeSettings(settings: ClaudeSettings): void {
  if (!fs.existsSync(CLAUDE_DIR)) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true })
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n')
}

function getStatusLinePath(): string {
  // Resolve the status-line wrapper path relative to this compiled file.
  // When compiled, this file is at out/claude.js and the wrapper is at ../bin/prism-claude-status-line
  return path.resolve(__dirname, '../bin/prism-claude-status-line')
}

function isPrismStatusLine(config?: StatusLineConfig | string): boolean {
  if (!config) return false
  if (typeof config === 'string') return config === getStatusLinePath()
  return config.type === 'command' && config.command === getStatusLinePath()
}

function getApiKey(): string | undefined {
  return process.env.PRISM_API_KEY || undefined
}

function getUserId(): string {
  const envId = process.env.PRISM_USER_ID
  if (envId) return envId
  const idFile = path.join(os.homedir(), '.prism-user-id')
  if (fs.existsSync(idFile)) {
    return fs.readFileSync(idFile, 'utf-8').trim()
  }
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'prism_cli_'
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  fs.writeFileSync(idFile, id)
  return id
}

interface AdInfo {
  text: string
  url?: string
}

const FALLBACK_AD: AdInfo = {
  text: 'Prism · contextual ads for AI wait states →',
  url: 'https://goprism.dev',
}

async function fetchAdInfo(): Promise<AdInfo> {
  const audience = detectAudience()
  const intent = detectIntent()
  const context: AdContext = {
    editor: 'claude',
    aiTool: 'claude-code',
    intent: intent ?? 'coding',
    audience,
    waitState: true,
  }

  try {
    const ad = await fetchAd(
      DEFAULT_API_URL,
      { context, userId: getUserId(), hiddenAdvertisers: [] },
      { apiKey: getApiKey() }
    )
    if (!ad) return FALLBACK_AD
    return {
      text: `${ad.advertiserName} · ${ad.copy}`,
      url: ad.clickUrl || ad.url,
    }
  } catch (err) {
    console.error('Failed to fetch ad:', err)
    return FALLBACK_AD
  }
}

function formatStatusLine(info: AdInfo): string {
  // Make the ad pop: prefix + bold + bright color.
  const prefix = '🪧 '
  // Most terminals (and xterm.js) auto-linkify a visible https:// URL, so
  // append the URL explicitly. We also keep an OSC 8 hyperlink for terminals
  // that support it.
  const body = info.url ? `${prefix}${info.text} ${info.url}` : `${prefix}${info.text}`
  // Bold black text on a bright yellow background for maximum visibility.
  const styled = `\x1b[1;30;103m ${body} \x1b[0m`
  if (!info.url) return styled
  const safeUri = info.url.replace(/\s/g, '')
  return `\x1b]8;;${safeUri}\x1b\\${styled}\x1b]8;;\x1b\\`
}

export async function install(): Promise<void> {
  const settings = readSettings()

  if (!fs.existsSync(BACKUP_PATH)) {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(settings, null, 2) + '\n')
  }

  const adInfo = await fetchAdInfo()

  settings.spinnerVerbs = {
    mode: 'replace',
    verbs: [adInfo.text],
  }
  settings.statusLine = {
    type: 'command',
    command: getStatusLinePath(),
    refreshInterval: 10,
  }

  writeSettings(settings)
  console.log('Prism Claude Code integration installed.')
  console.log('Start `claude` in your terminal to see ads in the spinner and status line.')
  console.log('Run `prism-claude refresh` to update the ad copy.')
}

export async function uninstall(): Promise<void> {
  const settings = readSettings()
  delete settings.spinnerVerbs
  delete settings.statusLine
  writeSettings(settings)

  if (fs.existsSync(BACKUP_PATH)) {
    fs.unlinkSync(BACKUP_PATH)
  }

  console.log('Prism Claude Code integration removed.')
}

export async function restore(): Promise<void> {
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error('No Prism backup found at', BACKUP_PATH)
    process.exit(1)
  }

  const raw = fs.readFileSync(BACKUP_PATH, 'utf-8')
  fs.writeFileSync(SETTINGS_PATH, raw)
  fs.unlinkSync(BACKUP_PATH)

  console.log('Claude settings restored from backup.')
}

export async function status(): Promise<void> {
  const adInfo = await fetchAdInfo()

  // Print the status line that Claude Code will display.
  console.log(formatStatusLine(adInfo))

  // Also refresh the spinner verb so the next Claude spinner shows the latest ad.
  try {
    const settings = readSettings()
    if (isPrismStatusLine(settings.statusLine) && settings.spinnerVerbs) {
      settings.spinnerVerbs.verbs = [adInfo.text]
      writeSettings(settings)
    }
  } catch {
    // Ignore refresh errors; the status line still printed.
  }
}

export async function refresh(): Promise<void> {
  const adInfo = await fetchAdInfo()
  const settings = readSettings()
  if (!settings.spinnerVerbs) {
    settings.spinnerVerbs = { mode: 'replace', verbs: [] }
  }
  settings.spinnerVerbs.mode = 'replace'
  settings.spinnerVerbs.verbs = [adInfo.text]
  writeSettings(settings)
  console.log('Refreshed Claude Code ad:', adInfo.text)
}
