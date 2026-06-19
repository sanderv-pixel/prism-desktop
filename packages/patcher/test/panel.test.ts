import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { patchExtensionJs, buildAdInjectorScript, findClaudeCodeExtensions, restorePanel } from '../src/index'

describe('panel patcher', () => {
  let tmpDir: string
  let originalHome: string | undefined

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-panel-'))
    originalHome = process.env.HOME
    process.env.HOME = tmpDir
  })

  afterEach(() => {
    process.env.HOME = originalHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('finds Claude Code extensions with and without platform suffix', () => {
    const cursorDir = path.join(tmpDir, '.cursor', 'extensions')
    fs.mkdirSync(path.join(cursorDir, 'anthropic.claude-code-2.1.178'), { recursive: true })
    fs.mkdirSync(path.join(cursorDir, 'anthropic.claude-code-2.1.178-win32-x64'), { recursive: true })
    fs.mkdirSync(path.join(cursorDir, 'some.other-extension'), { recursive: true })

    const found = findClaudeCodeExtensions()
    assert.strictEqual(found.length, 2)
    assert.ok(found.some((p) => p.endsWith('anthropic.claude-code-2.1.178')))
    assert.ok(found.some((p) => p.endsWith('anthropic.claude-code-2.1.178-win32-x64')))
  })

  it('patches the dynamic CSP in extension.js', () => {
    const extDir = path.join(tmpDir, '.cursor', 'extensions', 'anthropic.claude-code-2.1.178')
    fs.mkdirSync(extDir, { recursive: true })
    const extensionJsPath = path.join(extDir, 'extension.js')

    const mock = `getHtmlForWebview(e,t,r,i,n,s){
      let o=yt.Uri.joinPath(this.extensionUri,"webview","index.js"),
          a=e.asWebviewUri(o),
          c=yt.Uri.joinPath(this.extensionUri,"webview","index.css"),
          l=e.asWebviewUri(c),
          u=js(),
          d=this.authManager.getAuthStatus(),
          p=\`style-src \${e.cspSource} 'unsafe-inline'\`,
          f=\`font-src \${e.cspSource}\`,
          m=\`img-src \${e.cspSource} data:\`,
          g=\`worker-src \${e.cspSource}\`,
          v=yt.workspace.getConfiguration("chat.editor");
      return \`<!DOCTYPE html>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; \${p}; \${f}; \${m}; script-src 'nonce-\${u}'; \${g};">
      \`
    }`

    fs.writeFileSync(extensionJsPath, mock)
    const result = patchExtensionJs(extensionJsPath, 'http://localhost:3004/api')

    assert.strictEqual(result, true)
    const patched = fs.readFileSync(extensionJsPath, 'utf-8')
    assert.ok(patched.includes('const prismApiOrigin="http://localhost:3004"'))
    assert.ok(patched.includes('/*prism-panel-csp*/'))
    assert.ok(patched.includes('img-src ${e.cspSource} data: https:'))
    assert.ok(patched.includes('connect-src ${prismApiOrigin} ${e.cspSource}'))
    assert.ok(patched.includes('${prismConnectSrc};'))
  })

  it('does not patch extension.js when the Prism marker is already present', () => {
    const extDir = path.join(tmpDir, '.cursor', 'extensions', 'anthropic.claude-code-2.1.178')
    fs.mkdirSync(extDir, { recursive: true })
    const extensionJsPath = path.join(extDir, 'extension.js')
    fs.writeFileSync(extensionJsPath, 'some code /*prism-panel-csp*/ more code')

    const result = patchExtensionJs(extensionJsPath, 'http://localhost:3004/api')
    assert.strictEqual(result, false)
  })

  it('rejects a malformed API URL to prevent CSP injection', () => {
    const extDir = path.join(tmpDir, '.cursor', 'extensions', 'anthropic.claude-code-2.1.178')
    fs.mkdirSync(extDir, { recursive: true })
    const extensionJsPath = path.join(extDir, 'extension.js')
    fs.writeFileSync(extensionJsPath, 'getHtmlForWebview(e,t,r,i,n,s){}')

    assert.throws(() => patchExtensionJs(extensionJsPath, 'http://evil.com; script-src \'unsafe-inline\''), /Invalid Prism API URL/)
  })

  it('builds a non-destructive injector script for the panel', () => {
    const script = buildAdInjectorScript([
      {
        id: 'camp-1',
        advertiserName: 'Railway',
        copy: 'Ship faster →',
        url: 'https://railway.app',
        iconUrl: 'https://railway.app/icon.png',
        iconHtml: '<svg></svg>',
      } as any,
    ])

    assert.ok(script.startsWith('/*prism-panel-ads*/'))
    assert.ok(script.includes('[class*="spinnerRow"]'))
    assert.ok(script.includes('function findSpinnerContext'))
    assert.ok(script.includes('function removeAd'))
    assert.ok(script.includes('data-prism-ad'))
    assert.ok(script.includes('try{'))
    assert.ok(script.includes("catch(e){console.error('[Prism] injector error',e);}"))
    assert.ok(!script.includes("innerHTML=''"))
    assert.ok(script.includes('function createIcon'))
    assert.ok(script.includes('function sanitizeUrl'))
  })

  it('creates icons via DOM instead of innerHTML to avoid Trusted Types violations', () => {
    const script = buildAdInjectorScript([
      {
        id: 'camp-2',
        advertiserName: 'Bad',
        copy: 'x',
        url: 'https://example.com',
        iconUrl: 'https://x/" onload="alert(1)',
        iconHtml: '<svg></svg>',
      } as any,
    ])

    // No raw innerHTML assignments should remain in the panel injector.
    assert.ok(!script.includes('innerHTML='))
    // Icons must be built with DOM APIs so Trusted Types do not block them.
    assert.ok(script.includes("document.createElement('img')"))
    assert.ok(script.includes('img.src='))
    assert.ok(script.includes("document.createElementNS('http://www.w3.org/2000/svg','svg')"))
    // Hrefs must be sanitized to http/https only.
    assert.ok(script.includes("sanitizeUrl(AD.url||AD.clickUrl||'#')"))
  })

  it('restores panel files from versioned backups', () => {
    const extDir = path.join(tmpDir, '.cursor', 'extensions', 'anthropic.claude-code-2.1.178')
    fs.mkdirSync(extDir, { recursive: true })
    const webviewPath = path.join(extDir, 'webview', 'index.js')
    const extensionJsPath = path.join(extDir, 'extension.js')
    const backupDir = path.join(tmpDir, '.prism', 'backups', 'anthropic.claude-code-2.1.178')

    fs.mkdirSync(path.dirname(webviewPath), { recursive: true })
    fs.writeFileSync(webviewPath, 'original webview')
    fs.writeFileSync(extensionJsPath, 'original extension')

    // Simulate a patch by creating backups and writing patched content.
    fs.mkdirSync(backupDir, { recursive: true })
    fs.copyFileSync(webviewPath, path.join(backupDir, 'index.js'))
    fs.copyFileSync(extensionJsPath, path.join(backupDir, 'extension.js'))
    fs.writeFileSync(webviewPath, '/*prism-panel-ads*/\npatched webview')
    fs.writeFileSync(extensionJsPath, '/*prism-panel-csp*/\npatched extension')

    const results = restorePanel()
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].patched, true)
    assert.strictEqual(fs.readFileSync(webviewPath, 'utf-8'), 'original webview')
    assert.strictEqual(fs.readFileSync(extensionJsPath, 'utf-8'), 'original extension')
    assert.ok(!fs.existsSync(backupDir) || fs.readdirSync(backupDir).length === 0)
  })
})
