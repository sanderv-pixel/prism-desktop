import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  findClaudeDesktopApp,
  buildClaudeDesktopInjectorScript,
  injectClaudeDesktopAd,
  buildClaudeDesktopTestPage,
  patchClaudeDesktopApp,
  restoreClaudeDesktopApp,
} from '../src/index'

describe('Claude desktop patcher', () => {
  let tmpDir: string
  let realHome: string | undefined

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-claude-desktop-'))
    realHome = process.env.HOME
    process.env.HOME = tmpDir
  })

  afterEach(() => {
    if (realHome !== undefined) {
      process.env.HOME = realHome
    }
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('finds the desktop app from custom paths', () => {
    const appDir = path.join(tmpDir, 'Claude.app', 'Contents', 'Resources', 'ion-dist')
    fs.mkdirSync(appDir, { recursive: true })
    fs.writeFileSync(path.join(appDir, 'index.html'), '<html><head></head><body></body></html>')

    const found = findClaudeDesktopApp([path.join(tmpDir, 'Claude.app')])
    assert.strictEqual(found, path.join(tmpDir, 'Claude.app'))
  })

  it('returns undefined when the desktop app is missing', () => {
    const found = findClaudeDesktopApp([path.join(tmpDir, 'Claude.app')])
    assert.strictEqual(found, undefined)
  })

  it('builds an injector script containing the ad payload', () => {
    const ad = {
      id: 'camp-1',
      advertiserName: 'Railway',
      copy: 'Ship faster →',
      url: 'https://railway.app',
      iconHtml: '<svg></svg>',
      impressionToken: 'tok',
      sessionId: 'sess',
      reportUrl: 'http://localhost:3004/api/impressions',
      apiKey: 'key',
    }
    const script = buildClaudeDesktopInjectorScript(ad as any)
    assert.ok(script.includes('window.__prismAd'))
    assert.ok(script.includes('Railway'))
    assert.ok(script.includes('Ship faster'))
    assert.ok(script.includes('https://railway.app'))
    assert.ok(script.includes('tok'))
    assert.ok(script.includes('role="status"'))
    assert.ok(/Thinking|Sifting/.test(script))
  })

  it('injects the ad script into index.html without adding a CSP', () => {
    const html = '<html><head><title>Claude</title></head><body></body></html>'
    const ad = {
      id: 'camp-1',
      advertiserName: 'Railway',
      copy: 'Ship faster →',
      url: 'https://railway.app',
      iconHtml: '<svg></svg>',
    }
    const patched = injectClaudeDesktopAd(html, ad as any)
    assert.ok(!patched.includes('Content-Security-Policy'))
    assert.ok(patched.includes('window.__prismAd'))
    assert.ok(patched.includes('<script>'))
    assert.ok(patched.indexOf('<script>') < patched.indexOf('</head>'))
  })

  it('throws when index.html has no </head>', () => {
    assert.throws(() => injectClaudeDesktopAd('<html></html>', {} as any), /Could not find/)
  })

  it('throws when already patched', () => {
    const html = '<html><head><script>window.__prismAd={}</script></head><body></body></html>'
    assert.throws(() => injectClaudeDesktopAd(html, {} as any), /already patched/)
  })

  it('builds a test page with a thinking element and the injector script', async () => {
    const html = await buildClaudeDesktopTestPage('http://localhost:3004/api', 'test-key')
    assert.ok(html.includes('role="status"'))
    assert.ok(html.includes('Thinking…'))
    assert.ok(html.includes('window.__prismAd'))
    assert.ok(html.includes('Show thinking'))
    assert.ok(html.includes('Hide thinking'))
  })

  it('patches and restores a mock Claude desktop app', async () => {
    const appDir = path.join(tmpDir, 'Claude.app')
    const indexDir = path.join(appDir, 'Contents', 'Resources', 'ion-dist')
    fs.mkdirSync(indexDir, { recursive: true })
    const originalHtml =
      '<!doctype html><html><head><title>Claude</title></head><body></body></html>'
    fs.writeFileSync(path.join(indexDir, 'index.html'), originalHtml)

    const patchResults = await patchClaudeDesktopApp(
      'http://localhost:3004/api',
      'test-key',
      [appDir]
    )
    assert.strictEqual(patchResults.length, 1)
    assert.strictEqual(patchResults[0].path, appDir)
    assert.strictEqual(patchResults[0].patched, true)

    const patchedHtml = fs.readFileSync(path.join(indexDir, 'index.html'), 'utf-8')
    assert.ok(patchedHtml.includes('window.__prismAd'))

    const restoreResults = restoreClaudeDesktopApp([appDir])
    assert.strictEqual(restoreResults.length, 1)
    assert.strictEqual(restoreResults[0].patched, true)

    const restoredHtml = fs.readFileSync(path.join(indexDir, 'index.html'), 'utf-8')
    assert.strictEqual(restoredHtml, originalHtml)
  })
})
