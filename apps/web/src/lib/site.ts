// Centralized public source-repo link for the Prism overlay clients.
//
// The security whitepaper's verification claims depend on this source being
// PUBLICLY readable. It therefore stays `null` until BOTH are true:
//   1. the pre-publish security audit (SECURITY-AUDIT.md) is clean, and
//   2. the overlay repo (apps/overlay-macos + apps/overlay-windows) is actually public.
//
// While it is null, the UI renders the source link as disabled / "coming soon".
// TODO: set to the public repo URL once published,
//   e.g. 'https://github.com/goprism/prism-overlay'.
export const OVERLAY_REPO_URL: string | null = null
