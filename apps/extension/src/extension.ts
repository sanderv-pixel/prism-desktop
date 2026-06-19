import * as vscode from 'vscode'
import {
  patchPanel,
  restorePanel,
  patchCodexPanel,
  restoreCodexPanel,
  patchClaudeDesktopApp,
  restoreClaudeDesktopApp,
} from '@prism/patcher'
import { AdController } from './ad-controller'
import { AIDetector } from './ai-detector'
import { ensureUserId, getConfig, updateConfig } from './config'
import { ensureDeviceApiKey, getEffectiveApiKey } from './device-auth'
import { checkForUpdates, startUpdateTimer } from './updater'

let detector: AIDetector | undefined
let controller: AdController | undefined
let outputChannel: vscode.OutputChannel | undefined

async function runPatchPanel(apiUrl: string, apiKey: string, silent = false): Promise<boolean> {
  try {
    const results = await patchPanel(apiUrl, apiKey)
    const patched = results.filter((r) => r.patched)
    const errors = results.filter((r) => !r.patched && r.error)

    if (patched.length > 0) {
      log(`Patched Claude Code panel: ${patched.map((r) => r.path).join(', ')}`)
      if (!silent) {
        const action = await vscode.window.showInformationMessage(
          'Prism patched the Claude Code panel. Reload the window to see panel ads.',
          'Reload now',
          'Later'
        )
        if (action === 'Reload now') {
          await vscode.commands.executeCommand('workbench.action.reloadWindow')
        }
      }
      return true
    } else if (errors.length > 0) {
      log(`Panel patch skipped: ${errors.map((r) => r.error).join('; ')}`)
    } else {
      log('Claude Code panel already patched or not found')
    }
  } catch (err) {
    log(`Panel patch error: ${err instanceof Error ? err.message : String(err)}`)
    if (!silent) {
      vscode.window.showWarningMessage(
        `Prism could not patch the Claude Code panel: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
  return false
}

async function runPatchCodex(apiUrl: string, apiKey: string, silent = false): Promise<boolean> {
  try {
    const results = await patchCodexPanel(apiUrl, apiKey)
    const patched = results.filter((r) => r.patched)
    const errors = results.filter((r) => !r.patched && r.error)

    if (patched.length > 0) {
      log(`Patched Codex panel: ${patched.map((r) => r.path).join(', ')}`)
      if (!silent) {
        const action = await vscode.window.showInformationMessage(
          'Prism patched the OpenAI Codex panel. Reload the window to see panel ads.',
          'Reload now',
          'Later'
        )
        if (action === 'Reload now') {
          await vscode.commands.executeCommand('workbench.action.reloadWindow')
        }
      }
      return true
    } else if (errors.length > 0) {
      log(`Codex panel patch skipped: ${errors.map((r) => r.error).join('; ')}`)
    } else {
      log('Codex panel already patched or not found')
    }
  } catch (err) {
    log(`Codex panel patch error: ${err instanceof Error ? err.message : String(err)}`)
    if (!silent) {
      vscode.window.showWarningMessage(
        `Prism could not patch the OpenAI Codex panel: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
  return false
}

async function runPatchClaudeDesktop(apiUrl: string, apiKey: string): Promise<void> {
  try {
    const results = await patchClaudeDesktopApp(apiUrl, apiKey)
    const patched = results.filter((r) => r.patched)
    const errors = results.filter((r) => !r.patched && r.error)

    if (patched.length > 0) {
      log(`Patched Claude for Desktop: ${patched.map((r) => r.path).join(', ')}`)
      const warnings = patched.filter((r) => r.error).map((r) => r.error)
      const message =
        'Prism patched Claude for Desktop. Restart Claude to see panel ads.' +
        (warnings.length ? ` Warning: ${warnings.join('; ')}` : '')
      const action = await vscode.window.showInformationMessage(message, 'Restart later')
      if (action === 'Restart later') return
    } else if (errors.length > 0) {
      log(`Claude desktop patch skipped: ${errors.map((r) => r.error).join('; ')}`)
      vscode.window.showWarningMessage(`Claude desktop patch skipped: ${errors.map((r) => r.error).join('; ')}`)
    } else {
      log('Claude for Desktop already patched or not found')
      vscode.window.showInformationMessage('Claude for Desktop already patched or not found.')
    }
  } catch (err) {
    log(`Claude desktop patch error: ${err instanceof Error ? err.message : String(err)}`)
    vscode.window.showWarningMessage(
      `Prism could not patch Claude for Desktop: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export function log(message: string): void {
  outputChannel?.appendLine(`[${new Date().toISOString()}] ${message}`)
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('Prism')
  context.subscriptions.push(outputChannel)
  const version = context.extension.packageJSON.version as string
  log(`Prism extension v${version} activating...`)

  // Register commands first so diagnostics still work even if init fails.
  const testCmd = vscode.commands.registerCommand('prism.test', async () => {
    log('Manual test command triggered')
    if (!controller) {
      vscode.window.showErrorMessage('Prism controller not initialized. Check the Prism output channel for errors.')
      return
    }
    await controller.testAd()
  })

  const enableCmd = vscode.commands.registerCommand('prism.enable', async () => {
    await updateConfig('enabled', true)
    const state = detector?.state ?? {
      waiting: false,
      tool: 'other',
      reason: 'none',
    }
    await controller?.onWaitStateChanged(state)
  })

  const disableCmd = vscode.commands.registerCommand('prism.disable', async () => {
    await updateConfig('enabled', false)
    controller?.updateStatus('paused')
  })

  const hideCmd = vscode.commands.registerCommand('prism.hideAdvertiser', () => {
    controller?.hideCurrentAdvertiser()
  })

  const openCmd = vscode.commands.registerCommand('prism.openAd', () => {
    controller?.openCurrentAd()
  })

  const refreshCmd = vscode.commands.registerCommand('prism.refresh', () => {
    detector?.evaluate()
  })

  const patchPanelCmd = vscode.commands.registerCommand('prism.patchPanel', async () => {
    const cfg = getConfig()
    const apiKey = await getEffectiveApiKey()
    await runPatchPanel(cfg.apiUrl, apiKey)
  })

  const checkUpdatesCmd = vscode.commands.registerCommand('prism.checkForUpdates', async () => {
    await checkForUpdates(context, log, false)
  })

  const versionCmd = vscode.commands.registerCommand('prism.version', async () => {
    const version = context.extension.packageJSON.version as string
    const updateUrl = getConfig().updateUrl
    const action = await vscode.window.showInformationMessage(
      `Prism ${version}`,
      'Check for updates',
      'Copy version'
    )
    if (action === 'Check for updates') {
      await vscode.commands.executeCommand('prism.checkForUpdates')
    } else if (action === 'Copy version') {
      await vscode.env.clipboard.writeText(version)
      vscode.window.showInformationMessage(`Copied Prism ${version} to clipboard.`)
    }
    log(`Version command: Prism ${version}, update URL: ${updateUrl}`)
  })

  const openDashboardCmd = vscode.commands.registerCommand('prism.openDashboard', async () => {
    const cfg = getConfig()
    const baseUrl = cfg.apiUrl.replace(/\/api$/, '')
    const url = `${baseUrl}/dashboard/connect?userId=${encodeURIComponent(cfg.userId)}`
    await vscode.env.openExternal(vscode.Uri.parse(url))
  })

  const restorePanelCmd = vscode.commands.registerCommand('prism.restorePanel', async () => {
    try {
      const results = await restorePanel()
      const restored = results.filter((r) => r.patched)
      if (restored.length > 0) {
        vscode.window.showInformationMessage('Prism restored the Claude Code panel. Reload the window to finish.', 'Reload now', 'Later').then((action) => {
          if (action === 'Reload now') {
            vscode.commands.executeCommand('workbench.action.reloadWindow')
          }
        })
      } else {
        vscode.window.showInformationMessage('No Claude Code panel patch to restore.')
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  const patchCodexCmd = vscode.commands.registerCommand('prism.patchCodex', async () => {
    const cfg = getConfig()
    const apiKey = await getEffectiveApiKey()
    await runPatchCodex(cfg.apiUrl, apiKey)
  })

  const restoreCodexCmd = vscode.commands.registerCommand('prism.restoreCodex', async () => {
    try {
      const results = await restoreCodexPanel()
      const restored = results.filter((r) => r.patched)
      if (restored.length > 0) {
        vscode.window
          .showInformationMessage('Prism restored the OpenAI Codex panel. Reload the window to finish.', 'Reload now', 'Later')
          .then((action) => {
            if (action === 'Reload now') {
              vscode.commands.executeCommand('workbench.action.reloadWindow')
            }
          })
      } else {
        vscode.window.showInformationMessage('No OpenAI Codex panel patch to restore.')
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  const patchClaudeDesktopCmd = vscode.commands.registerCommand('prism.patchClaudeDesktop', async () => {
    const cfg = getConfig()
    const apiKey = await getEffectiveApiKey()
    await runPatchClaudeDesktop(cfg.apiUrl, apiKey)
  })

  const restoreClaudeDesktopCmd = vscode.commands.registerCommand('prism.restoreClaudeDesktop', async () => {
    try {
      const results = await restoreClaudeDesktopApp()
      const restored = results.filter((r) => r.patched)
      if (restored.length > 0) {
        const warnings = restored.filter((r) => r.error).map((r) => r.error)
        const message =
          'Prism restored Claude for Desktop. Restart Claude to finish.' +
          (warnings.length ? ` Warning: ${warnings.join('; ')}` : '')
        vscode.window.showInformationMessage(message)
      } else {
        vscode.window.showInformationMessage('No Claude for Desktop patch to restore.')
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  context.subscriptions.push(
    testCmd,
    enableCmd,
    disableCmd,
    hideCmd,
    openCmd,
    refreshCmd,
    patchPanelCmd,
    checkUpdatesCmd,
    versionCmd,
    openDashboardCmd,
    restorePanelCmd,
    patchCodexCmd,
    restoreCodexCmd,
    patchClaudeDesktopCmd,
    restoreClaudeDesktopCmd
  )

  try {
    ensureUserId()
    await ensureDeviceApiKey(log)
    log(`User ID: ${getConfig().userId}`)
    log(`API URL: ${getConfig().apiUrl}`)
    log(`Enabled: ${getConfig().enabled}`)

    controller = new AdController(context, log)
    detector = new AIDetector(log)

    const waitSubscription = detector.onWaitStateChanged((state) => {
      log(`Wait state changed: ${JSON.stringify(state)}`)
      controller?.onWaitStateChanged(state)
    })

    context.subscriptions.push(controller, detector, waitSubscription)

    // Check for extension updates on startup and periodically.
    startUpdateTimer(context, log)
    checkForUpdates(context, log, true).catch(() => {})
    // Some environments need a few seconds for network to be ready after startup.
    const startupCheck = setTimeout(() => {
      checkForUpdates(context, log, true).catch(() => {})
    }, 15000)
    context.subscriptions.push({ dispose: () => clearTimeout(startupCheck) })
    // Also check when the window regains focus (throttled).
    let lastFocusCheck = 0
    const focusSubscription = vscode.window.onDidChangeWindowState((state) => {
      if (!state.focused) return
      const now = Date.now()
      if (now - lastFocusCheck < 5 * 60 * 1000) return
      lastFocusCheck = now
      checkForUpdates(context, log, true).catch(() => {})
    })
    context.subscriptions.push(focusSubscription)

    // Initial render based on current config.
    const config = getConfig()
    if (!config.enabled) {
      controller.updateStatus('paused')
    } else {
      detector.evaluate()
    }

    // Auto-patch the Claude Code panel so panel ads work without running the CLI.
    // If we patched files that are already loaded by the extension host, reload
    // the window automatically so the patched versions take effect.
    const patchPanelEnabled = vscode.workspace.getConfiguration('prism').get<boolean>('patchPanel', true)
    if (patchPanelEnabled) {
      const deviceApiKey = await getEffectiveApiKey()
      const didPatchClaude = await runPatchPanel(config.apiUrl, deviceApiKey, true)
      const didPatchCodex = await runPatchCodex(config.apiUrl, deviceApiKey, true)
      if (didPatchClaude || didPatchCodex) {
        log('Prism patched panel extensions; reloading window to apply changes')
        await vscode.commands.executeCommand('workbench.action.reloadWindow')
      }
    }

    log('Prism extension activated successfully')
  } catch (err) {
    log(`Activation error: ${err instanceof Error ? err.message : String(err)}`)
    if (err instanceof Error && err.stack) {
      log(err.stack)
    }
    vscode.window.showErrorMessage(
      `Prism activation failed: ${err instanceof Error ? err.message : String(err)}. Check the Prism output channel.`
    )
  }
}

export function deactivate(): void {
  log('Prism extension deactivating...')
  detector?.dispose()
  controller?.dispose()
}
