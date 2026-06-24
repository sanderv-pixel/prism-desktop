// Centralized public source-repo link for the Prism overlay clients.
//
// The security whitepaper's verification claims depend on this source being
// PUBLICLY readable. It therefore stays `null` until BOTH are true:
//   1. the pre-publish security audit (SECURITY-AUDIT.md) is clean, and
//   2. the overlay repo (apps/overlay-macos + apps/overlay-windows) is actually public.
//
// While it is null, the UI renders the source link as disabled / "coming soon".
// Now live: the overlay clients are published and the pre-publish audit is clean.
export const OVERLAY_REPO_URL: string | null = 'https://github.com/sanderv-pixel/prism-overlay'
