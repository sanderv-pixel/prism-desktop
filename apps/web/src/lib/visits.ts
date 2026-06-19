const EXCLUDED_PATH_PREFIXES = [
  '/admin',
  '/advertiser',
  '/dashboard',
  '/auth',
  '/api',
  '/_next',
  '/favicon',
]

/**
 * Returns true for public website pages that should be counted as visits.
 * Dashboards, auth flows, API routes, and static assets are excluded.
 */
export function isTrackableVisitPath(path: string): boolean {
  if (!path || path.length === 0) return false
  const normalized = path.split('?')[0].split('#')[0]
  if (normalized.includes('.')) return false
  return !EXCLUDED_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}
