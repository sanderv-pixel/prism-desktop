import { getSettings, saveSettings } from './storage'

const enabledInput = document.getElementById('enabled') as HTMLInputElement
const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement
const userIdInput = document.getElementById('userId') as HTMLInputElement
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement
const saveBtn = document.getElementById('saveBtn')!
const savedEl = document.getElementById('saved')!

async function load() {
  const settings = await getSettings()
  enabledInput.checked = settings.enabled
  apiUrlInput.value = settings.apiUrl
  userIdInput.value = settings.userId
  apiKeyInput.value = settings.apiKey
}

saveBtn.addEventListener('click', async () => {
  const enabled = enabledInput.checked
  await saveSettings({
    enabled,
    apiUrl: apiUrlInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
    consentGivenAt: enabled ? new Date().toISOString() : undefined,
  })

  savedEl.style.opacity = '1'
  setTimeout(() => {
    savedEl.style.opacity = '0'
  }, 2000)

  // Notify content scripts.
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'prism:refresh' }).catch(() => {})
    }
  }
})

load().catch(console.error)
