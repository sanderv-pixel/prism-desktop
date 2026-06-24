// Single kill switch for Cloudflare Turnstile across signup, sign-in, and waitlist.
// Temporarily DISABLED while the signup/email flow is stabilized: client widgets are
// hidden and server-side verification is skipped (signups still have the normal rate
// limit + mandatory email confirmation). Flip to `true` to re-enable everywhere.
export const TURNSTILE_ENABLED: boolean = false
