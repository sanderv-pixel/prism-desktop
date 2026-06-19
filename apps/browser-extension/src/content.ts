import { AdContext, AdPayload, fetchAd, reportImpression, ImpressionEvent } from '@prism/shared'
import { detectPageContext, PageContext } from './detector'
import {
  ensureUserId,
  getSettings,
  ensureDeviceApiKey,
  getEffectiveApiKey,
  getBrowserFingerprint,
} from './storage'

const AD_CONTAINER_ID = 'prism-ad-container'
const HIDDEN_ADVERTISERS_KEY = 'prism:hiddenAdvertisers'

function hashColor(name: string): string {
  const colors = [
    '#7c3aed',
    '#0891b2',
    '#059669',
    '#d97706',
    '#dc2626',
    '#db2777',
    '#4f46e5',
    '#0ea5e9',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
}

let currentAd: AdPayload | null = null
let waitStartMs = 0
let observationTimer: number | null = null
const sessionId = generateSessionId()

function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getHiddenAdvertisers(): Promise<string[]> {
  const result = await chrome.storage.sync.get(HIDDEN_ADVERTISERS_KEY)
  return Array.isArray(result[HIDDEN_ADVERTISERS_KEY]) ? result[HIDDEN_ADVERTISERS_KEY] : []
}

async function hideAdvertiser(name: string) {
  const hidden = await getHiddenAdvertisers()
  if (!hidden.includes(name)) {
    hidden.push(name)
    await chrome.storage.sync.set({ [HIDDEN_ADVERTISERS_KEY]: hidden })
  }
  removeAdContainer()
}

function buildAdContext(ctx: PageContext): AdContext {
  return {
    editor: 'browser',
    language: ctx.platform,
    projectType: ctx.platform,
    aiTool: ctx.platform,
    intent: ctx.intent ?? ctx.topic ?? 'general',
    audience: 'general-ai',
    waitState: ctx.waitState,
  }
}

async function fetchAdForContext(ctx: PageContext): Promise<AdPayload | null> {
  const settings = await getSettings()
  if (!settings.enabled) return null

  const userId = await ensureUserId()
  const hidden = await getHiddenAdvertisers()
  const apiKey = await ensureDeviceApiKey()

  return fetchAd(
    settings.apiUrl,
    {
      context: buildAdContext(ctx),
      userId,
      sessionId,
      hiddenAdvertisers: hidden,
      fingerprint: getBrowserFingerprint(),
    },
    { apiKey }
  )
}

function getContainer(): HTMLElement | null {
  return document.getElementById(AD_CONTAINER_ID)
}

function removeAdContainer() {
  const el = getContainer()
  if (el) {
    el.remove()
  }
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function createAdContainer(ad: AdPayload): HTMLElement {
  removeAdContainer()

  const container = document.createElement('div')
  container.id = AD_CONTAINER_ID
  container.setAttribute('role', 'complementary')
  container.setAttribute('aria-label', 'Prism contextual ad')

  const icon = document.createElement('div')
  icon.className = 'prism-ad-icon'
  if (ad.iconUrl) {
    const img = document.createElement('img')
    img.src = ad.iconUrl
    img.alt = ''
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.objectFit = 'contain'
    img.style.borderRadius = '6px'
    img.onerror = () => {
      // Replace failed image with a deterministic colored initial.
      icon.innerHTML = ''
      icon.textContent = (ad.advertiserName || 'P')[0].toUpperCase()
      icon.style.background = hashColor(ad.advertiserName || 'Prism')
    }
    icon.appendChild(img)
  } else {
    icon.textContent = (ad.advertiserName || 'P')[0].toUpperCase()
    icon.style.background = hashColor(ad.advertiserName || 'Prism')
  }

  const body = document.createElement('div')
  body.className = 'prism-ad-body'

  const label = document.createElement('span')
  label.className = 'prism-ad-label'
  label.textContent = 'Ad'

  const copy = document.createElement('a')
  copy.className = 'prism-ad-copy'
  const clickTarget = ad.clickUrl && isSafeUrl(ad.clickUrl) ? ad.clickUrl : ad.url
  copy.href = isSafeUrl(clickTarget) ? clickTarget : '#'
  copy.target = '_blank'
  copy.rel = 'noopener noreferrer sponsored'
  copy.textContent = ad.copy

  const advertiser = document.createElement('span')
  advertiser.className = 'prism-ad-advertiser'
  advertiser.textContent = ad.advertiserName

  body.appendChild(label)
  body.appendChild(copy)
  body.appendChild(advertiser)

  const actions = document.createElement('div')
  actions.className = 'prism-ad-actions'

  const hideBtn = document.createElement('button')
  hideBtn.className = 'prism-ad-hide'
  hideBtn.title = 'Hide this advertiser'
  hideBtn.textContent = '×'
  hideBtn.addEventListener('click', (e) => {
    e.preventDefault()
    hideAdvertiser(ad.advertiserName)
  })

  actions.appendChild(hideBtn)

  container.appendChild(icon)
  container.appendChild(body)
  container.appendChild(actions)

  return container
}

function mountAd(ad: AdPayload) {
  const container = createAdContainer(ad)
  const target = findMountTarget()
  if (target) {
    target.appendChild(container)
  } else {
    document.body.appendChild(container)
  }
}

function findMountTarget(): Element | null {
  // Platform-specific insertion points, best-effort.
  const selectors: Record<string, string> = {
    chatgpt: 'main',
    claude: 'main',
    perplexity: 'main',
  }
  const platform = detectPageContext().platform
  const selector = selectors[platform]
  if (!selector) return null
  const main = document.querySelector(selector)
  return main ?? document.body
}

async function reportCurrentImpression(clicked = false) {
  if (!currentAd?.impressionToken) return

  const settings = await getSettings()
  const durationMs = waitStartMs > 0 ? Date.now() - waitStartMs : 0
  const event: ImpressionEvent = {
    userId: await ensureUserId(),
    campaignId: currentAd.id,
    impressionToken: currentAd.impressionToken,
    context: JSON.stringify({
      platform: detectPageContext().platform,
      topic: detectPageContext().topic,
      intent: detectPageContext().intent,
      clicked,
    }),
    durationMs,
    timestamp: new Date().toISOString(),
    fingerprint: getBrowserFingerprint(),
  }

  reportImpression(settings.apiUrl, event, {
    apiKey: await getEffectiveApiKey(),
  }).catch(() => {})
}

async function onContextChanged(ctx: PageContext) {
  const settings = await getSettings()
  if (!settings.enabled) {
    removeAdContainer()
    return
  }

  if (ctx.waitState) {
    if (!currentAd) {
      const ad = await fetchAdForContext(ctx)
      if (ad) {
        currentAd = ad
        waitStartMs = Date.now()
        mountAd(ad)
      }
    }
  } else {
    if (currentAd) {
      await reportCurrentImpression(false)
      currentAd = null
      waitStartMs = 0
      removeAdContainer()
    }
  }
}

function startObservation() {
  if (observationTimer) return
  observationTimer = window.setInterval(async () => {
    const ctx = detectPageContext()
    await onContextChanged(ctx)
  }, 1000)
}

function stopObservation() {
  if (observationTimer) {
    clearInterval(observationTimer)
    observationTimer = null
  }
}

async function init() {
  const settings = await getSettings()
  if (!settings.enabled) {
    // Still listen for enable messages from popup/options.
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'prism:refresh') {
        getSettings().then((s) => {
          if (s.enabled) startObservation()
          else stopObservation()
        })
      }
    })
    return
  }

  startObservation()
}

init().catch(console.error)
