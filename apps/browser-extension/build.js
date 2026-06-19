const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')

const watch = process.argv.includes('--watch')

const copyFiles = [
  ['public/manifest.json', 'manifest.json'],
  ['public/popup.html', 'popup.html'],
  ['public/options.html', 'options.html'],
  ['public/ad-frame.html', 'ad-frame.html'],
  ['src/ad.css', 'ad.css'],
]

async function build() {
  const ctx = await esbuild.context({
    entryPoints: [
      'src/background.ts',
      'src/content.ts',
      'src/popup.ts',
      'src/options.ts',
      'src/ad-frame.ts',
    ],
    bundle: true,
    outdir: 'dist',
    platform: 'browser',
    target: 'chrome120',
    format: 'esm',
    sourcemap: true,
    splitting: true,
    chunkNames: 'chunks/[name]-[hash]',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    external: [],
  })

  if (watch) {
    await ctx.watch()
    console.log('Watching for changes...')
  } else {
    await ctx.rebuild()
    await ctx.dispose()
  }

  // Copy static files
  if (!fs.existsSync('dist')) fs.mkdirSync('dist', { recursive: true })
  for (const [src, dest] of copyFiles) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join('dist', dest))
    }
  }

  // Copy icons if they exist
  if (fs.existsSync('icons')) {
    const iconDest = path.join('dist', 'icons')
    if (!fs.existsSync(iconDest)) fs.mkdirSync(iconDest, { recursive: true })
    for (const file of fs.readdirSync('icons')) {
      fs.copyFileSync(path.join('icons', file), path.join(iconDest, file))
    }
  }

  console.log('Build complete.')
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
