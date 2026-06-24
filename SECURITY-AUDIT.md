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
