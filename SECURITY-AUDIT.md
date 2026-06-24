# Prism Overlay Client - Pre-Publish Security Audit

**Scope:** the entire overlay client - `apps/overlay-macos/Sources/*` and `apps/overlay-windows/src/*`, plus build configs (`Makefile`, `Info.plist`, `PrismOverlay.csproj`, `app.manifest`). Includes the expanded-panel additions on this branch (`PrismPanel.{h,m}`, the `fetchEarnings`/`sendFeedbackForCampaign` client methods, and the env-gated `PRISM_DIAG` diagnostic).
**Purpose:** gate the public source-repo link in the security whitepaper. The repo link stays disabled (`OVERLAY_REPO_URL = null` in `apps/web/src/lib/site.ts`) until this audit is clean **and** the repo is actually made public.
**Result:** ✅ **PASS - no findings.** No embedded secrets, no content logging, no excess telemetry. Safe to publish the client source.
**Date:** 2026-06-24.

---

## 1. Embedded secrets - ✅ PASS

No server secret, signing key, HMAC key, admin token, privileged endpoint, service credential, or third-party API key anywhere in the client. Grepped for `secret|password|private key|hmac|bearer|BEGIN|signing key|client_secret|service_role|sk_live|AKIA` across all source + build configs: **no non-comment matches.**

The only credential the client holds is the **user's own API key**, read from the environment or local storage, never hard-coded (macOS `PRISM_API_KEY` env / `NSUserDefaults` `PrismApiKey`; Windows `PRISM_API_KEY` env / registry `ApiKey`). Server-issued, single-use tokens (`impressionToken`, `hbChallenge`, `conversionToken`) are read from the server response and reported back verbatim - the client cannot forge them.

## 2. Content logging - ✅ PASS

No logging, printing, or persistence of prompt text, code, model output, terminal buffer/scrollback, file contents, or any AX/UIA text value.

- The only print statements are the `fprintf(stdout, …)` debug modes in `main.m` (`PRISM_DUMP`/`PRISM_DUMPFRONT`/`PRISM_FRONTDUMP`) inside `#if DEBUG` (excluded from release - see §6), plus `PRISM_DETECT` which prints only `found` + frame coords. The expanded-panel diagnostic `PRISM_DIAG` (env-gated, `PrismOverlay.m`) prints only booleans/ints (paused/connected/found/has-ad/pill+panel visibility) - no content.
- No `NSLog`/`os_log`/`Console.WriteLine`/`Debug.WriteLine`/`Trace`/`File.Write*`/`StreamWriter` anywhere.
- The transient text reads (terminal status line `AXStringValue(ta)` in `PrismAX.m`; Windows UIA status `el.Name` in `UiaDetector.cs`) are scanned in-process to match a status-format regex / verb list; only the element's **rectangle** is kept (`PrismDetection`/`WorkIndicator` have no text field). Never written or transmitted.
- The expanded panel renders earnings from the account (`/api/me/earnings`) and the ad's own campaign metadata (promo code, "why"); it reads no editor content. "Save for later" stores only campaign ids in `NSUserDefaults`.

## 3. Telemetry - ✅ PASS

No analytics or telemetry beyond the documented payload: the fixed context `{ editor, aiTool, intent, audience, waitState }` (`AdContext()` / `Context()`), the server-signed impression token, duration, campaign id, and a random per-install device UUID.

- **No third-party analytics SDKs** (`analytics|telemetry|segment|mixpanel|amplitude|posthog|sentry|firebase|crashlytics|datadog|bugsnag` - none). Windows' only `PackageReference` is `FlaUI.UIA3` (read-only UI Automation); macOS links only Cocoa/ApplicationServices/QuartzCore.
- **Every outbound endpoint is `goprism.dev`** (or the configured `PRISM_API_URL`): default `https://goprism.dev/api`. The new panel calls (`fetchEarnings` -> `/api/me/earnings`, `sendFeedbackForCampaign` -> `/api/ads/feedback` with a body of only `{ campaignId, signal }`) use the same base URL.

## 4. Permissions - ✅ PASS

- **macOS:** `LSUIElement=true` background agent. Read-only Accessibility via `AXIsProcessTrustedWithOptions` + standard networking. **No `.entitlements` file**, no Full-Disk/Screen-Recording/Input-Monitoring usage keys.
- **Windows:** `app.manifest` `requestedExecutionLevel level="asInvoker" uiAccess="false"` - no elevation; read-only UI Automation.
- **No disk access to editor config/transcripts** (`~/.claude`, `settings.json`, etc.). The only persistence is `NSUserDefaults`/registry for the API key, device id, saved-ad ids, and UI flags.
- The opt-in OS-signal mode's idle check uses the system idle timer `CGEventSourceSecondsSinceLastEventType(...)` - seconds-since-last-input only; no input capture, no Input-Monitoring entitlement.

## 5. Security-by-design, not obscurity - ✅ PASS

Nothing in the threat model depends on the client being secret: impression tokens are server-signed (the client echoes `impressionToken`, cannot mint one); the heartbeat challenge is server-issued (`hbChallenge`); device binding, trust scoring, frequency caps, and anomaly detection are all server-side. A fully public client does not weaken these defenses.

## 6. Leftovers - ✅ PASS

- The broad-text readers (`dumpClaude`/`dumpFront`/`dumpFrontText`) are declared and implemented **inside `#if DEBUG`**. The release build uses `CFLAGS := -fobjc-arc -Wall -O2` with **no `-DDEBUG`** (`Makefile`), so these symbols are absent from the shipped binary.
- No commented-out secrets, no verbose `NSLog`/`Console.WriteLine` of sensitive values, no test endpoints.

---

## Conclusion

All six categories pass with no remediation required. The hard-blocker categories (1 embedded secrets, 2 content logging, 3 telemetry) are clean. **The overlay client is safe to publish.**

**Remaining gate (outside this audit):** actually making the repo public and then setting `OVERLAY_REPO_URL` in `apps/web/src/lib/site.ts`. Until that constant is non-null, the whitepaper and `/security` render the source link as "coming soon".

---

# Round 2 - Deeper static read + dynamic capture

## Deeper static read (the files round 1 only grepped)

Read in full: `PrismAuth.m`, `PrismAuth.cs`, `AdClient.cs`, `Onboarding`/`PrismOnboarding`, plus a capability sweep across the whole client.

- **Pairing flow (`PrismAuth`):** a device-pairing handshake - random one-time code -> opens the browser at `{origin}/link?code=...` -> polls `{base}/auth/pair?code=...` until the server returns `apiKey`, stored locally. No embedded secret; the key is minted server-side after the user authenticates in the browser.
- **No file I/O anywhere.** Grepped `File.*`, `StreamReader/Writer`, `contentsOfFile`, `NSFileManager`, `Directory`, `Path.Combine`, `SpecialFolder`, `FileStream` - zero hits. The client reads/writes no files; persistence is only `NSUserDefaults` / registry (API key, random device id, UI flags).
- **No command execution beyond opening a URL.** The only `Process.Start` calls open a URL with `UseShellExecute` (the pairing link and the click URL); the click URL is validated to start with `http`. No `NSTask`/`system`/`exec`.
- **No native interop or dynamic code:** no `DllImport`/`dlopen`/`NSClassFromString`/reflection/`Assembly.Load`.
- **No custom URL-scheme / deep-link handler** (`CFBundleURLTypes`, `openURL:`, `getURL:withReplyEvent`) - no inbound-link attack surface.
- **Signing key is not publishable:** `apps/overlay-macos/secrets/PrismOverlaySigning.p12` is gitignored (`secrets/` + `*.p12`), untracked, and absent from git history.

### One disclosed nuance (icons)

For a non-`data:` `iconUrl`, the macOS client fetches the image with `dataTaskWithURL` (`PrismOverlay.m`), so an ad icon may load from a **server-supplied third-party host** (an advertiser logo CDN). This carries **no user content**, but it exposes your IP to the icon host the same way loading any web image does. The whitepaper's "all API calls go to goprism.dev" is accurate for API calls; to be fully precise, ad-icon images are the one asset that can be fetched off-Prism. Mitigation if desired: serve icons as `data:` URLs or proxy them through `goprism.dev`.

## Dynamic capture (runtime proof)

Pointed the signed client at a local logging server (`PRISM_API_URL=http://127.0.0.1:8799`) and exercised the full flow (ad fetch, 5s impression, heartbeats, panel earnings fetch). Every request and decrypted body was logged; process connections were monitored.

**Every endpoint the client emitted (57 requests, all to the configured base, nothing else):**
- `POST /ads` - body: `{ hiddenAdvertisers:[], sessionId, userId, context:{editor,aiTool,intent,audience,waitState}, source }`
- `POST /impressions` - body: `{ userId, sessionId, campaignId, impressionToken, durationMs, source, context:{...}, fingerprint:{ platform:"macos", deviceId:<random per-install UUID> } }`
- `POST /impressions/heartbeat` - body: `{ impressionToken, beatNonce, prevChallengeResponse }`
- `GET /me/earnings` - no body

**Findings:**
- **No content in any payload.** Every field is the fixed context, a random session/device id, a server token, a duration, or a campaign id. No prompt, code, file path, AX text, or screen content ever appeared.
- The "fingerprint" is exactly `{ platform, deviceId }` where `deviceId` is the random per-install UUID - not hardware-derived, confirming the whitepaper.
- **No out-of-band hosts.** With API traffic pointed at the mock and the test ad carrying no icon URL, `lsof` showed no established connections to anything but loopback. The client phones home nowhere except its configured API base.

## Verdict

The deeper read and the runtime capture corroborate round 1: no secrets, no content logging, no file access, no excess telemetry, no hidden capabilities, and traffic confined to the configured Prism API (plus the disclosed ad-icon fetch). A reviewer doing the same source + proxy + connection checks will reach the same conclusion. This remains an internal review, not the independent third-party audit the whitepaper commits to (section 13.5); do not represent it as such.
