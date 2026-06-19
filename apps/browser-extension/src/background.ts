import { getSettings, saveSettings } from './storage'

async function ensureConsentOnInstall() {
  const settings = await getSettings()
  if (settings.consentGivenAt) return
  // Default to disabled until the user opts in via options page.
  await saveSettings({ enabled: false })
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage()
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureConsentOnInstall().catch(console.error)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'prism:getStatus') {
    getSettings().then((settings) => {
      sendResponse({
        enabled: settings.enabled,
        userId: settings.userId,
        apiUrl: settings.apiUrl,
      })
    })
    return true
  }

  if (message.type === 'prism:toggle') {
    getSettings().then(async (settings) => {
      const enabled = !settings.enabled
      const consentGivenAt = enabled ? new Date().toISOString() : settings.consentGivenAt
      await saveSettings({ enabled, consentGivenAt })
      sendResponse({ enabled })
      // Notify all tabs to refresh.
      const tabs = await chrome.tabs.query({})
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'prism:refresh' }).catch(() => {})
        }
      }
    })
    return true
  }

  if (message.type === 'prism:openOptions') {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage()
    }
    sendResponse({ ok: true })
    return true
  }

  return false
})
