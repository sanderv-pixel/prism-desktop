import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../../..')
const extensionDir = path.join(root, 'apps/extension')
const webPublicDir = path.join(root, 'apps/web/public/extension')
const vsixName = 'prism-cursor.vsix'
const vsixSource = path.join(extensionDir, vsixName)
const manifestPath = path.join(webPublicDir, 'latest.json')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getExtensionVersion() {
  const pkgPath = path.join(extensionDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  return pkg.version
}

function main() {
  if (!fs.existsSync(vsixSource)) {
    console.warn(`[sync-extension] ${vsixName} not found. Skipping extension sync.`)
    return
  }

  ensureDir(webPublicDir)

  const version = getExtensionVersion()
  const vsixDest = path.join(webPublicDir, vsixName)
  fs.copyFileSync(vsixSource, vsixDest)

  const manifest = {
    version,
    url: `https://goprism.dev/extension/${vsixName}`,
    releasedAt: new Date().toISOString(),
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  console.log(`[sync-extension] Synced v${version} to ${path.relative(root, webPublicDir)}`)
}

main()
