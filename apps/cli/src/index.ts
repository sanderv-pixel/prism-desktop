#!/usr/bin/env node
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'
import { install, uninstall, restore, status, refresh } from './claude'
import { patchPanel, restorePanel, patchClaudeDesktopApp, restoreClaudeDesktopApp, buildClaudeDesktopTestPage } from '@prism/patcher'

const command = process.argv[2]

function getApiUrl(): string | undefined {
  return process.env.PRISM_API_URL || undefined
}

function getApiKey(): string | undefined {
  return process.env.PRISM_API_KEY || undefined
}

async function main() {
  switch (command) {
    case 'install':
      await install()
      break
    case 'uninstall':
      await uninstall()
      break
    case 'restore':
      await restore()
      break
    case 'status':
      await status()
      break
    case 'refresh':
      await refresh()
      break
    case 'patch-panel':
      {
        // Revert any previous patch first so the original spinner array is restored.
        restorePanel()
        const results = await patchPanel(getApiUrl(), getApiKey())
        for (const r of results) {
          if (r.patched) {
            console.log(`Patched: ${r.path}`)
          } else {
            console.log(`Skipped: ${r.path}${r.error ? ' - ' + r.error : ''}`)
          }
        }
        console.log('Reload VS Code/Cursor window to see changes.')
      }
      break
    case 'restore-panel':
      {
        const results = restorePanel()
        for (const r of results) {
          if (r.patched) {
            console.log(`Restored: ${r.path}`)
          } else {
            console.log(`Skipped: ${r.path}${r.error ? ' - ' + r.error : ''}`)
          }
        }
        console.log('Reload VS Code/Cursor window to see changes.')
      }
      break
    case 'patch-desktop':
      {
        const results = await patchClaudeDesktopApp(getApiUrl(), getApiKey())
        for (const r of results) {
          if (r.patched) {
            console.log(`Patched Claude desktop app: ${r.path}`)
            if (r.error) console.warn(`Warning: ${r.error}`)
          } else {
            console.log(`Skipped: ${r.path}${r.error ? ' - ' + r.error : ''}`)
          }
        }
        console.log('Restart Claude for Desktop to see changes.')
      }
      break
    case 'restore-desktop':
      {
        const results = restoreClaudeDesktopApp()
        for (const r of results) {
          if (r.patched) {
            console.log(`Restored Claude desktop app: ${r.path}`)
            if (r.error) console.warn(`Warning: ${r.error}`)
          } else {
            console.log(`Skipped: ${r.path}${r.error ? ' - ' + r.error : ''}`)
          }
        }
        console.log('Restart Claude for Desktop to finish.')
      }
      break
    case 'test-desktop':
      {
        const html = await buildClaudeDesktopTestPage(getApiUrl(), getApiKey())
        const testPath = path.join(os.tmpdir(), 'prism-desktop-test.html')
        fs.writeFileSync(testPath, html)
        console.log(`Test page written to: ${testPath}`)
        console.log('Open it in a browser, then click "Show thinking" to verify the ad appears.')
        try {
          if (process.platform === 'darwin') {
            execSync(`open "${testPath}"`)
          } else if (process.platform === 'win32') {
            execSync(`start "" "${testPath}"`)
          } else {
            execSync(`xdg-open "${testPath}"`)
          }
        } catch (err) {
          console.warn('Could not auto-open the browser:', err instanceof Error ? err.message : String(err))
        }
      }
      break
    default:
      console.log(`Prism CLI for AI coding assistants

Usage:
  prism-claude install           Inject Prism ads into Claude Code terminal UI
  prism-claude uninstall         Remove Prism config from Claude Code settings
  prism-claude restore           Restore original Claude Code settings from backup
  prism-claude status            Print the current ad status line
  prism-claude refresh           Fetch a new ad and update the spinner verb
  prism-claude patch-panel       Patch Claude Code panel in VS Code/Cursor
  prism-claude restore-panel     Restore Claude Code panel from backup
  prism-claude patch-desktop     Patch Claude for Desktop (Claude.app)
  prism-claude restore-desktop   Restore Claude for Desktop from backup
  prism-claude test-desktop      Open a test page to verify the desktop ad injector
`)
      process.exit(command ? 1 : 0)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
