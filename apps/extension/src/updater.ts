import * as vscode from 'vscode'
import * as path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getConfig } from './config'

const execFileAsync = promisify(execFile)

interface UpdateManifest {
  version: string
  url: string
  releasedAt: string
}

const USER_AGENT = `Prism-Extension/${vscode.extensions.getExtension('prism.prism')?.packageJSON.version ?? '0.1.0'}`

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da < db) return -1
    if (da > db) return 1
  }
  return 0
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, */*',
        'User-Agent': USER_AGENT,
        ...(options.headers || {}),
      },
    })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchManifest(updateUrl: string): Promise<UpdateManifest | null> {
  try {
    const res = await fetchWithTimeout(updateUrl)
    if (!res.ok) {
      return null
    }
    return (await res.json()) as UpdateManifest
  } catch {
    return null
  }
}

async function downloadToGlobalStorage(
  context: vscode.ExtensionContext,
  url: string
): Promise<vscode.Uri | null> {
  try {
    const res = await fetchWithTimeout(url, { headers: { Accept: 'application/octet-stream' } })
    if (!res.ok) {
      return null
    }
    const buffer = new Uint8Array(await res.arrayBuffer())
    const fileUri = vscode.Uri.joinPath(context.globalStorageUri, 'prism-update.vsix')
    await vscode.workspace.fs.createDirectory(context.globalStorageUri)
    await vscode.workspace.fs.writeFile(fileUri, buffer)
    return fileUri
  } catch {
    return null
  }
}

function getCliPath(): string | undefined {
  const appRoot = vscode.env.appRoot
  if (!appRoot) {
    return undefined
  }
  const appName = vscode.env.appName.toLowerCase()
  const cliName = appName.includes('cursor') ? 'cursor' : 'code'
  return path.join(appRoot, 'bin', cliName)
}

async function installViaCli(vsixPath: string): Promise<boolean> {
  const cli = getCliPath()
  if (!cli) {
    return false
  }
  try {
    await execFileAsync(cli, ['--install-extension', vsixPath], { timeout: 60000 })
    return true
  } catch {
    return false
  }
}

async function installUpdate(
  vsixUri: vscode.Uri,
  log: (message: string) => void
): Promise<boolean> {
  // Try the built-in command first (works in VS Code).
  try {
    await vscode.commands.executeCommand('workbench.extensions.installExtension', vsixUri)
    log('Installed update via workbench.extensions.installExtension')
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log(`Install command failed: ${message}`)
  }

  // Some forks (Cursor) expose the command with a string argument.
  try {
    await vscode.commands.executeCommand('workbench.extensions.installExtension', vsixUri.toString())
    log('Installed update via workbench.extensions.installExtension (string)')
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log(`Install command (string) failed: ${message}`)
  }

  // Fall back to the editor CLI.
  try {
    const ok = await installViaCli(vsixUri.fsPath)
    if (ok) {
      log('Installed update via editor CLI')
      return true
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log(`CLI install failed: ${message}`)
  }

  return false
}

export async function checkForUpdates(
  context: vscode.ExtensionContext,
  log: (message: string) => void,
  silent = false
): Promise<void> {
  const cfg = getConfig()
  if (!cfg.autoUpdate) {
    log('Auto-update disabled')
    return
  }

  const currentVersion = context.extension.packageJSON.version as string
  const manifest = await fetchManifest(cfg.updateUrl)
  if (!manifest) {
    log(`Update check failed: could not fetch ${cfg.updateUrl}`)
    return
  }

  log(`Update check: current=${currentVersion}, latest=${manifest.version}`)

  if (compareVersions(currentVersion, manifest.version) >= 0) {
    return
  }

  log(`New version available: ${manifest.version}`)

  const vsixUri = await downloadToGlobalStorage(context, manifest.url)
  if (!vsixUri) {
    log('Update download failed')
    if (!silent) {
      vscode.window.showWarningMessage('Prism update download failed.')
    }
    return
  }

  const installed = await installUpdate(vsixUri, log)
  if (installed) {
    log(`Installed update ${manifest.version} from ${vsixUri.fsPath}`)

    const action = await vscode.window.showInformationMessage(
      `Prism ${manifest.version} is installed. Reload to apply the update.`,
      'Reload now',
      'Later'
    )
    if (action === 'Reload now') {
      await vscode.commands.executeCommand('workbench.action.reloadWindow')
    }
    return
  }

  log(`Update install failed for ${manifest.version}`)
  const action = await vscode.window.showErrorMessage(
    `Prism ${manifest.version} is available but could not be installed automatically.`,
    'Download .vsix',
    'Dismiss'
  )
  if (action === 'Download .vsix') {
    await vscode.env.openExternal(vscode.Uri.parse(manifest.url))
  }
}

export function startUpdateTimer(
  context: vscode.ExtensionContext,
  log: (message: string) => void
): void {
  const intervalMs = 5 * 60 * 1000 // 5 minutes
  const timer = setInterval(() => {
    checkForUpdates(context, log, true).catch(() => {})
  }, intervalMs)
  context.subscriptions.push({ dispose: () => clearInterval(timer) })
}
