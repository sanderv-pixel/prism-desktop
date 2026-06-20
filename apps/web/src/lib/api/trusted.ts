// Vetted accounts (e.g. the team's own devices) that bypass fraud blocking,
// payout holds, and the per-viewer frequency cap, so legitimate high-volume usage
// and testing aren't throttled. Set the PRISM_TRUSTED_USER_IDS env var to a
// comma-separated list of auth user ids.
const TRUSTED_USER_IDS = new Set(
  (process.env.PRISM_TRUSTED_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
)

export function isTrustedUserId(userId: string | null | undefined): boolean {
  return !!userId && TRUSTED_USER_IDS.has(userId)
}
