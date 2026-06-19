import fs from 'fs'
import path from 'path'

const isProduction = () => process.env.NODE_ENV === 'production'

function isBuildPhase(): boolean {
  const phase = process.env.NEXT_PHASE ?? ''
  return phase.includes('build')
}

/**
 * Throws if a local .env.local file is present on the production host.
 * This should only be imported in Node.js server code (root layout / API routes),
 * never in the Edge runtime or in the browser.
 */
export function warnIfLocalEnvFileInProduction(): void {
  if (!isProduction() || isBuildPhase()) return

  const localEnvPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(localEnvPath)) {
    throw new Error(
      `Production server detected a local .env.local file at ${localEnvPath}. ` +
        'Remove it from the deployed host and inject secrets via your platform instead.'
    )
  }
}
