async function sendMessage<T>(message: unknown): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve)
  })
}

async function refreshUI() {
  const status = await sendMessage<{ enabled: boolean; userId: string; apiUrl: string }>({
    type: 'prism:getStatus',
  })

  const dot = document.getElementById('statusDot')!
  const text = document.getElementById('statusText')!
  const toggleBtn = document.getElementById('toggleBtn')!
  const userIdEl = document.getElementById('userId')!

  if (status.enabled) {
    dot.classList.remove('paused')
    text.textContent = 'Prism is active'
    toggleBtn.textContent = 'Pause Prism'
  } else {
    dot.classList.add('paused')
    text.textContent = 'Prism is paused'
    toggleBtn.textContent = 'Enable Prism'
  }

  userIdEl.textContent = status.userId ?? '-'
}

document.getElementById('toggleBtn')?.addEventListener('click', async () => {
  const result = await sendMessage<{ enabled: boolean }>({ type: 'prism:toggle' })
  await refreshUI()
  if (result.enabled) {
    window.close()
  }
})

document.getElementById('optionsBtn')?.addEventListener('click', () => {
  sendMessage({ type: 'prism:openOptions' })
  window.close()
})

refreshUI().catch(console.error)
