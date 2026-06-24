// Shared constants for the device-account link-token flow. The dashboard mints a
// one-time token (/api/auth/link/token) bound to the signed-in account; install.sh
// exchanges it (/api/auth/link/exchange) for an account-bound device key.
export const LINK_TOKEN_PREFIX = 'prism:link:'
export const LINK_TTL_SECONDS = 15 * 60 // 15 minutes to paste + run the installer
