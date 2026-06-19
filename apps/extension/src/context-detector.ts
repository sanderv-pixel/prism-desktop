import * as vscode from 'vscode'
import * as path from 'path'

export interface ProjectContext {
  projectType?: string
  frameworks: string[]
  libraries: string[]
  audience: 'developers' | 'vibecoders'
  intent?: string
}

const FRAMEWORK_PATTERNS: Record<string, string[]> = {
  nextjs: ['next', 'nextjs'],
  react: ['react'],
  vue: ['vue'],
  svelte: ['svelte'],
  angular: ['@angular/core'],
  nuxt: ['nuxt'],
  remix: ['@remix-run/react'],
  astro: ['astro'],
  django: ['django'],
  flask: ['flask'],
  fastapi: ['fastapi'],
  rails: ['rails'],
  laravel: ['laravel'],
  flutter: ['flutter'],
  electron: ['electron'],
  'react-native': ['react-native'],
  expo: ['expo'],
}

const LIBRARY_PATTERNS: Record<string, string[]> = {
  prisma: ['@prisma/client', 'prisma'],
  stripe: ['stripe'],
  supabase: ['@supabase/supabase-js'],
  firebase: ['firebase'],
  mongodb: ['mongodb', 'mongoose'],
  postgres: ['pg'],
  redis: ['redis'],
  graphql: ['graphql', '@apollo/client'],
  trpc: ['@trpc/client', '@trpc/server'],
  tailwind: ['tailwindcss'],
  shadcn: ['shadcn-ui'],
  zod: ['zod'],
  authjs: ['next-auth', '@auth/core'],
  clerk: ['@clerk/clerk-react'],
  openai: ['openai'],
  anthropic: ['@anthropic-ai/sdk'],
  langchain: ['langchain'],
}

function detectFromDependencies(
  dependencies: Record<string, string> | undefined,
  patterns: Record<string, string[]>
): string[] {
  if (!dependencies) return []
  const found: string[] = []
  for (const [name, aliases] of Object.entries(patterns)) {
    if (aliases.some((alias) => dependencies[alias] !== undefined)) {
      found.push(name)
    }
  }
  return found
}

async function readJsonFile(uri: vscode.Uri): Promise<unknown> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri)
    const text = new TextDecoder().decode(bytes)
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function readTextFile(uri: vscode.Uri): Promise<string> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri)
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

function mergeDependencies(pkg: any): Record<string, string> {
  return {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  }
}

export async function detectProjectContext(): Promise<ProjectContext> {
  const frameworks: string[] = []
  const libraries: string[] = []
  let projectType: string | undefined

  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) {
    return { frameworks, libraries, audience: 'developers' }
  }

  const root = folders[0].uri

  // Try package.json (Node/Bun/Deno projects)
  const packageJson = await readJsonFile(vscode.Uri.joinPath(root, 'package.json'))
  if (packageJson && typeof packageJson === 'object') {
    const deps = mergeDependencies(packageJson)
    frameworks.push(...detectFromDependencies(deps, FRAMEWORK_PATTERNS))
    libraries.push(...detectFromDependencies(deps, LIBRARY_PATTERNS))
    projectType = frameworks.length > 0 ? 'javascript' : 'node'
  }

  // Try requirements.txt (Python)
  const requirements = await readTextFile(vscode.Uri.joinPath(root, 'requirements.txt'))
  if (requirements) {
    const deps: Record<string, string> = {}
    for (const line of requirements.split('\n')) {
      const name = line.split(/[=<>!~]/)[0].trim().toLowerCase()
      if (name) deps[name] = '*'
    }
    const pyFrameworks = detectFromDependencies(deps, FRAMEWORK_PATTERNS)
    const pyLibraries = detectFromDependencies(deps, LIBRARY_PATTERNS)
    frameworks.push(...pyFrameworks)
    libraries.push(...pyLibraries)
    if (!projectType) projectType = 'python'
  }

  // Try Cargo.toml (Rust)
  const cargo = await readTextFile(vscode.Uri.joinPath(root, 'Cargo.toml'))
  if (cargo && cargo.includes('[dependencies]')) {
    projectType = 'rust'
  }

  // Try go.mod (Go)
  const goMod = await readTextFile(vscode.Uri.joinPath(root, 'go.mod'))
  if (goMod && goMod.startsWith('module ')) {
    projectType = 'go'
  }

  // Scan active editor imports for additional libraries
  const editor = vscode.window.activeTextEditor
  if (editor) {
    const text = editor.document.getText()
    const detectedFromImports = detectLibrariesFromSource(text)
    for (const lib of detectedFromImports) {
      if (!libraries.includes(lib)) libraries.push(lib)
    }
  }

  const uniqueFrameworks = [...new Set(frameworks)]
  const uniqueLibraries = [...new Set(libraries)]
  const intent = await detectIntent(root, editor)

  return {
    projectType,
    frameworks: uniqueFrameworks,
    libraries: uniqueLibraries,
    audience: inferAudience(uniqueFrameworks, uniqueLibraries, projectType),
    intent,
  }
}

const JOB_SEEKING_PATTERNS = [
  /resume/i,
  /cv/i,
  /cover.?letter/i,
  /portfolio/i,
  /job.?application/i,
  /linkedin/i,
]

const HIRING_PATTERNS = [
  /job.?description/i,
  /job.?req/i,
  /req-?\d/i,
  /hiring.?plan/i,
  /recruiting/i,
  /talent.?pipeline/i,
  /interview.?questions/i,
  /offer.?letter/i,
]

async function detectIntent(root: vscode.Uri, editor?: vscode.TextEditor): Promise<string | undefined> {
  try {
    const activeName = editor?.document.fileName.toLowerCase() ?? ''

    // Check active file name first.
    if (HIRING_PATTERNS.some((p) => p.test(activeName))) return 'hiring'
    if (JOB_SEEKING_PATTERNS.some((p) => p.test(activeName))) return 'job-seeking'

    // Check workspace file names without reading contents.
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(root, '**/*'),
      new vscode.RelativePattern(root, '**/node_modules/**'),
      100
    )
    for (const file of files) {
      const name = file.fsPath.toLowerCase()
      if (HIRING_PATTERNS.some((p) => p.test(name))) return 'hiring'
      if (JOB_SEEKING_PATTERNS.some((p) => p.test(name))) return 'job-seeking'
    }
  } catch {
    // Ignore detection errors.
  }
  return undefined
}

function inferAudience(
  frameworks: string[],
  libraries: string[],
  projectType?: string
): 'developers' | 'vibecoders' {
  const vibeTools = new Set(['lovable', 'v0', 'bolt', 'replit'])
  const hasVibeTool = frameworks.some((f) => vibeTools.has(f))

  const devFrameworks = new Set([
    'nextjs',
    'react',
    'vue',
    'svelte',
    'angular',
    'nuxt',
    'remix',
    'astro',
    'django',
    'flask',
    'fastapi',
    'rails',
    'laravel',
    'electron',
    'react-native',
    'expo',
  ])
  const hasDevFramework = frameworks.some((f) => devFrameworks.has(f))

  const devLibraries = new Set([
    'prisma',
    'stripe',
    'supabase',
    'mongodb',
    'postgres',
    'redis',
    'graphql',
    'trpc',
    'zod',
    'authjs',
    'clerk',
    'langchain',
  ])
  const hasDevLibrary = libraries.some((l) => devLibraries.has(l))

  if (hasVibeTool && !hasDevFramework && !hasDevLibrary) {
    return 'vibecoders'
  }

  if (hasDevFramework || hasDevLibrary || projectType === 'python' || projectType === 'rust' || projectType === 'go') {
    return 'developers'
  }

  // Default: broad assumption for editor users, but lean toward vibecoders if only simple web deps.
  return frameworks.length + libraries.length <= 1 ? 'vibecoders' : 'developers'
}

function detectLibrariesFromSource(text: string): string[] {
  const found: string[] = []
  for (const [name, aliases] of Object.entries(LIBRARY_PATTERNS)) {
    if (found.includes(name)) continue
    for (const alias of aliases) {
      const patterns = [
        new RegExp(`import\\s+.*?\\s+from\\s+['"]${escapeRegex(alias)}['"]`, 'i'),
        new RegExp(`require\\(['"]${escapeRegex(alias)}['"]\\)`, 'i'),
        new RegExp(`use\\s+${escapeRegex(alias)}`, 'i'),
        new RegExp(`import\\s+${escapeRegex(alias)}`, 'i'),
      ]
      if (patterns.some((p) => p.test(text))) {
        found.push(name)
        break
      }
    }
  }
  return found
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
