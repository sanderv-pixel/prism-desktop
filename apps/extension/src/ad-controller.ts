import * as vscode from 'vscode'
import {
  AdContext,
  AdPayload,
  AdRequest,
  fetchAd,
  ImpressionEvent,
  reportImpression,
} from '@prism/shared'
import { getConfig, isCursor, PrismConfig } from './config'
import { WaitState } from './ai-detector'
import { detectProjectContext } from './context-detector'
import { getEffectiveApiKey, getFingerprintForRequest } from './device-auth'

const HIDDEN_ADVERTISERS_KEY = 'prism.hiddenAdvertisers'

// Minimum time an ad must remain visible before it can be replaced by the next one.
const MIN_AD_DWELL_MS = 5000

const ADVERTISER_ICONS = [
  '●',
  '■',
  '▲',
  '◆',
  '★',
  '♦',
  '⬟',
  '⬢',
  '◉',
  '▣',
  '✦',
  '✶',
]

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getAdvertiserIcon(ad: AdPayload): string {
  if (ad.iconUrl) {
    // VS Code status bars cannot render arbitrary remote images. Fall back to a
    // deterministic colored emoji marker keyed by advertiser name.
  }
  const name = (ad.advertiserName || 'Prism').trim()
  return ADVERTISER_ICONS[hashName(name) % ADVERTISER_ICONS.length]
}

function formatAdStatus(ad: AdPayload): string {
  return `${getAdvertiserIcon(ad)}  ${ad.copy}`
}

export class AdController implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem
  private currentAd: AdPayload | null = null
  private currentWaitStart = 0
  private sessionId: string
  private lastReason?: string
  private lastLanguage?: string
  private lastAudience?: string
  private lastUserId?: string
  private idleTimeout?: NodeJS.Timeout
  private wasWaiting = false
  private log: (message: string) => void

  constructor(
    private readonly context: vscode.ExtensionContext,
    log?: (message: string) => void
  ) {
    this.log = log ?? (() => {})
    this.sessionId = this.generateSessionId()
    // Place the ad at the inside edge of the right status bar so it sits close to
    // editor/AI status indicators without being buried among far-right icons.
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      1000
    )
    this.statusBarItem.command = 'prism.openAd'
    this.statusBarItem.tooltip = 'Prism contextual ad for AI builders'
    this.statusBarItem.hide()
    this.log('AdController created')
    this.updateStatus('idle')
  }

  updateStatus(state: 'idle' | 'waiting' | 'paused' | 'hidden'): void {
    this.log(`updateStatus: ${state}`)

    switch (state) {
      case 'paused':
        this.statusBarItem.text = 'Prism · paused'
        this.statusBarItem.command = 'prism.enable'
        this.statusBarItem.tooltip = 'Prism is paused. Click to enable.'
        this.statusBarItem.show()
        break
      case 'hidden':
        this.statusBarItem.text = 'Prism · hidden'
        this.statusBarItem.command = 'prism.enable'
        this.statusBarItem.tooltip = 'Advertiser hidden. Click to enable Prism.'
        this.statusBarItem.show()
        break
      case 'waiting':
        if (this.currentAd) {
          this.statusBarItem.text = formatAdStatus(this.currentAd)
          this.statusBarItem.command = 'prism.openAd'
          this.statusBarItem.tooltip = `Sponsored by ${this.currentAd.advertiserName}. Click to visit.`
          this.statusBarItem.show()
        }
        break
      case 'idle':
      default:
        this.statusBarItem.text = 'Prism'
        this.statusBarItem.command = 'prism.openAd'
        this.statusBarItem.tooltip = 'Prism contextual ads for AI builders'
        this.statusBarItem.show()
        break
    }
  }

  async onWaitStateChanged(state: WaitState): Promise<void> {
    const config = getConfig()
    this.log(
      `onWaitStateChanged: waiting=${state.waiting}, reason=${state.reason}, enabled=${config.enabled}`
    )

    if (!config.enabled) {
      this.clearIdleTimeout()
      this.currentAd = null
      this.currentWaitStart = 0
      this.wasWaiting = false
      this.updateStatus('paused')
      return
    }

    const shouldShow =
      state.waiting || (config.showAdsWhenNoWait && state.reason === 'none')

    // A fresh wait state (thinking burst) should fetch a new ad so users see
    // rotation without reloading the editor. Keep the existing ad only while
    // the same wait burst is still active.
    const isFreshWait = state.waiting && !this.wasWaiting

    if (shouldShow) {
      this.clearIdleTimeout()

      if (isFreshWait && this.currentAd) {
        // Report the previous ad's impression before replacing it.
        const durationMs = Date.now() - this.currentWaitStart
        this.sendImpression(config, this.currentAd, Math.max(durationMs, 0))
        this.currentAd = null
        this.currentWaitStart = 0
      }

      // Keep the existing ad while the thinking/wait state is active. Do not
      // refetch or flicker the UI every time the detector re-evaluates.
      if (this.currentAd && state.waiting) {
        this.updateStatus('waiting')
        this.wasWaiting = state.waiting
        return
      }

      // Demo mode: avoid refetching when there is no real wait state.
      if (this.currentAd && !state.waiting && config.showAdsWhenNoWait) {
        this.wasWaiting = state.waiting
        return
      }

      this.currentWaitStart = Date.now()
      const ad = await this.resolveAd(config, state)
      if (ad) {
        this.currentAd = ad
        this.lastReason = state.reason
        this.lastLanguage = state.language
        this.updateStatus('waiting')
      }
    } else {
      // Wait a short grace period before clearing the ad so a momentary pause
      // during AI streaming doesn't make it disappear.
      if (this.currentAd) {
        this.scheduleIdleClear(config)
      } else {
        this.updateStatus('idle')
      }
    }

    this.wasWaiting = state.waiting
  }

  async testAd(): Promise<void> {
    this.log('testAd called')
    const config = getConfig()
    if (!config.enabled) {
      vscode.window.showInformationMessage(
        'Prism is disabled. Run Prism: Enable first.'
      )
      return
    }

    this.clearIdleTimeout()
    const state: WaitState = {
      waiting: true,
      tool: 'cursor-tab',
      language: 'typescript',
      reason: 'ai-panel-visible',
    }

    this.currentWaitStart = Date.now()
    const ad = await this.resolveAd(config, state)
    if (ad) {
      this.currentAd = ad
      this.lastReason = state.reason
      this.lastLanguage = state.language
      this.updateStatus('waiting')
      vscode.window.showInformationMessage(`Prism test ad: ${ad.copy}`)
    } else {
      vscode.window.showWarningMessage(
        'Prism test ad returned no ad. Check API URL and dev server.'
      )
    }
  }

  hideCurrentAdvertiser(): void {
    if (!this.currentAd) return
    const name = this.currentAd.advertiserName
    const hidden = this.getHiddenAdvertisers()
    if (!hidden.includes(name)) {
      hidden.push(name)
      this.context.globalState.update(HIDDEN_ADVERTISERS_KEY, hidden)
    }
    this.currentAd = null
    this.clearIdleTimeout()
    this.updateStatus('hidden')
    vscode.window.showInformationMessage(
      `${name} hidden. Use Prism: Enable to reset.`
    )
  }

  openCurrentAd(): void {
    const url = this.currentAd?.clickUrl || this.currentAd?.url
    if (url) {
      vscode.env.openExternal(vscode.Uri.parse(url))
    }
  }

  getHiddenAdvertisers(): string[] {
    return this.context.globalState.get<string[]>(HIDDEN_ADVERTISERS_KEY, [])
  }

  private async resolveAd(
    config: PrismConfig,
    state: WaitState
  ): Promise<AdPayload | null> {
    const hidden = this.getHiddenAdvertisers()

    const project = await detectProjectContext()

    const context: AdContext = {
      editor: isCursor() ? 'cursor' : 'vscode',
      language: state.language,
      projectType: project.projectType,
      frameworks: project.frameworks,
      libraries: project.libraries,
      aiTool: state.tool,
      intent: project.intent ?? inferIntent(state.language),
      audience: project.audience,
      waitState: state.waiting,
    }

    this.log(`Resolving ad with context: ${JSON.stringify(context)}`)

    const request: AdRequest = {
      context,
      userId: config.userId,
      sessionId: this.sessionId,
      hiddenAdvertisers: hidden,
      fingerprint: getFingerprintForRequest(),
    }

    this.lastAudience = project.audience
    this.lastUserId = config.userId

    const adUrl = `${config.apiUrl.replace(/\/$/, '')}/ads`
    this.log(`Ad request URL: ${adUrl}`)
    this.log(`Ad request body: ${JSON.stringify(request)}`)
    this.log(`Hidden advertisers: ${JSON.stringify(hidden)}`)

    let ad: AdPayload | null = null
    try {
      ad = await fetchAd(config.apiUrl, request, {
        timeoutMs: 3000,
        apiKey: await getEffectiveApiKey(),
      })
    } catch (err) {
      this.log(`fetchAd threw: ${err instanceof Error ? err.message : String(err)}`)
    }

    this.log(
      `fetchAd result: ${ad ? ad.advertiserName + ' - ' + ad.copy : 'null'}`
    )

    if (ad && !hidden.includes(ad.advertiserName)) {
      return ad
    }

    return null
  }

  private async sendImpression(
    config: PrismConfig,
    ad: AdPayload,
    durationMs: number
  ): Promise<void> {
    if (!ad.impressionToken) return

    const event: ImpressionEvent = {
      userId: config.userId,
      sessionId: this.sessionId,
      campaignId: ad.id,
      impressionToken: ad.impressionToken,
      context: JSON.stringify({
        editor: isCursor() ? 'cursor' : 'vscode',
        reason: this.lastReason,
        intent: inferIntent(this.lastLanguage),
        audience: this.lastAudience ?? 'developers',
      }),
      durationMs,
      timestamp: new Date().toISOString(),
      fingerprint: getFingerprintForRequest(),
    }

    // Fire-and-forget with best-effort logging.
    reportImpression(config.apiUrl, event, {
      apiKey: await getEffectiveApiKey(),
    }).catch(() => {
      // Silently ignore network errors to avoid disrupting the editor.
    })
  }

  private scheduleIdleClear(config: PrismConfig): void {
    this.clearIdleTimeout()

    // Keep the ad on screen for at least MIN_AD_DWELL_MS before clearing it,
    // even if the AI wait state momentarily pauses or ends.
    const elapsed = this.currentWaitStart ? Date.now() - this.currentWaitStart : 0
    const delay = Math.max(MIN_AD_DWELL_MS - elapsed, 0)

    this.idleTimeout = setTimeout(() => {
      if (!this.currentAd || this.currentWaitStart === 0) {
        this.updateStatus('idle')
        return
      }
      const durationMs = Date.now() - this.currentWaitStart
      const config = getConfig()
      this.sendImpression(config, this.currentAd, durationMs)
      this.currentAd = null
      this.currentWaitStart = 0
      this.lastReason = undefined
      this.updateStatus('idle')
    }, delay)
  }

  private clearIdleTimeout(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout)
      this.idleTimeout = undefined
    }
  }

  private generateSessionId(): string {
    const bytes = new Uint8Array(16)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  dispose(): void {
    this.clearIdleTimeout()
    this.statusBarItem.dispose()
  }
}

function inferIntent(language?: string): string {
  if (!language) return 'general'
  const codeLangs = new Set([
    'typescript',
    'javascript',
    'python',
    'go',
    'rust',
    'java',
    'c',
    'cpp',
    'csharp',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'sql',
  ])
  const writingLangs = new Set([
    'markdown',
    'plaintext',
    'latex',
    'asciidoc',
    'restructuredtext',
  ])
  if (codeLangs.has(language)) return 'coding'
  if (writingLangs.has(language)) return 'writing'
  return 'general'
}
