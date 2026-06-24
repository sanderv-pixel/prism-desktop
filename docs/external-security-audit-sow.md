# External Security Audit - Scope of Work (Prism Overlay)

**Purpose:** an independent, third-party verification of the privacy and security claims in the Prism Security & Privacy Whitepaper (goprism.dev/security/whitepaper), so we can mark the "independent audit" commitment (whitepaper section 13.5) as done and, only then, state "audited" publicly.

**Status today:** an internal review exists (`SECURITY-AUDIT.md`: static read + a runtime network capture) and the overlay client source is public at github.com/sanderv-pixel/prism-overlay. That internal review is NOT a substitute for this engagement.

## In scope

1. **The public overlay clients** (github.com/sanderv-pixel/prism-overlay): `overlay-macos` (Objective-C) and `overlay-windows` (C#/.NET). This is the only code that runs on a user's machine.
2. **The shipped binaries** - verify the distributed macOS `.app` and Windows `.exe` match the published source (the whitepaper's reproducible-build claim, section 13.4). Confirm the `#if DEBUG` screen-text dump functions are absent from release symbols.
3. **Runtime behavior** - independent network capture (TLS proxy) and OS-level monitoring (file access, process spawns, entitlements actually exercised) on both platforms.

## Specific claims to confirm or refute

- A detection result carries no field that can hold user text (`PrismDetection` / `WorkIndicator`); content cannot be transmitted by construction.
- The only data sent is the fixed context `{ editor, aiTool, intent, audience, waitState }`, a server-signed impression token, duration, campaign id, and a random per-install device UUID. No prompts, code, file contents, or screen text.
- All traffic goes to `goprism.dev` (or a configured `PRISM_API_URL`); the only off-Prism request is the ad-icon image fetch (disclosed). No analytics SDKs, no telemetry.
- No reads of editor config / transcripts (`~/.claude`, `settings.json`) or any disk file; only Accessibility/UIA (read-only) + HTTPS.
- No embedded secrets; the client holds only the user's own API key and server-issued, single-use tokens it cannot forge.
- Permissions are minimal (macOS Accessibility read-only + networking; Windows asInvoker UIA); no full-disk, screen-recording, or input-monitoring beyond the documented idle check.
- Security is by design, not obscurity: tokens server-signed, heartbeat challenge server-issued, device binding + anomaly detection server-side; a public client does not weaken fraud defenses.

## Out of scope (this engagement)

- The web app, backend API, and database (separate engagement if desired). Note: server-side fraud/anti-bot is what the client's no-obscurity claim depends on, so a follow-on server review is recommended.

## Deliverables

- A written report with each claim marked confirmed / refuted / qualified, with evidence (code refs, captured traffic, binary diff).
- Severity-rated findings + remediation guidance.
- Permission to publish the report (or a summary) on goprism.dev, and to credit the firm.

## Hard rules / blockers

- Any embedded secret, any content-logging path, or any undisclosed outbound host is a hard blocker: fix and re-audit before publishing "audited."

## Logistics

- Provide: the public repo, signed release builds for both platforms, and a test account/API key.
- Coordinated disclosure for any finding via security@goprism.dev before publication.
