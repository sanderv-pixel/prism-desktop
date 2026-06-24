# Prism Overlay Client - Pre-Publish Security Audit

**Scope:** the entire overlay client - `apps/overlay-macos/Sources/*` and `apps/overlay-windows/src/*`, plus build configs (`Makefile`, `Info.plist`, `PrismOverlay.csproj`, `app.manifest`).
**Purpose:** gate the public source-repo link in the security whitepaper. The repo link stays disabled (`OVERLAY_REPO_URL = null` in `apps/web/src/lib/site.ts`) until this audit is clean **and** the repo is actually made public.
**Result:** ✅ **PASS - no findings.** No embedded secrets, no content logging, no excess telemetry. Safe to publish the client source.
**Date:** 2026-06-24.

---

## 1. Embedded secrets - ✅ PASS

No server secret, signing key, HMAC key, admin token, privileged endpoint, service credential, or third-party API key anywhere in the client. Grepped for `secret|password|private key|hmac|bearer|BEGIN|signing key|client_secret|service_role|sk_live|AKIA` across all source + build configs: **no non-comment matches.**

The only credential the client holds is the **user's own API key**, read from the environment or local storage, never hard-coded:
- macOS: `PRISM_API_KEY` env or `NSUserDefaults` `PrismApiKey` - `PrismAd.m:81`, `PrismOnboarding.m:97`.
- Windows: `PRISM_API_KEY` env or registry `ApiKey` - `Settings.cs:32-41`.
- The key is obtained from the server during onboarding and stored locally - `PrismAuth.m:90`, `PrismAuth.cs:59`.

Server-issued, single-use tokens (`impressionToken`, `hbChallenge`, `conversionToken`) are **read from the server response and reported back verbatim** - the client cannot forge them - `PrismAd.m:127,132`.

## 2. Content logging - ✅ PASS

No logging, printing, or persistence of prompt text, code, model output, terminal buffer/scrollback, file contents, or any AX/UIA text value.

- The only print statements in the entire client are four `fprintf(stdout, …)` in `main.m`. Three (`PRISM_DUMP`/`PRISM_DUMPFRONT`/`PRISM_FRONTDUMP`, lines 61/73/84) are inside `#if DEBUG` and excluded from release (see §6). The fourth (`PRISM_DETECT`, line 97) is release-reachable but prints **only** `found=<bool>` and the frame rectangle - no content.
- No `NSLog`/`os_log`/`Console.WriteLine`/`Debug.WriteLine`/`Trace`/`File.Write*`/`StreamWriter` anywhere.
- The one place text is read transiently - the terminal status line (`AXStringValue(ta)`, `PrismAX.m`) and the Windows UIA status string (`el.Name`, `UiaDetector.cs:87`) - is scanned in-process to match a status-format regex / verb list and only the element's **rectangle** is kept (`PrismDetection`/`WorkIndicator` have no text field - see §5 of the whitepaper). It is never written to a log, file, crash report, or analytics event.

## 3. Telemetry - ✅ PASS

No analytics or telemetry beyond the documented payload. The request bodies carry only the fixed context `{ editor, aiTool, intent, audience, waitState }` (`AdContext()` `PrismAd.m`; `Context()` `AdClient.cs`), the server-signed impression token, duration, campaign id, and a random per-install device UUID (`DeviceId()`).

- **No third-party analytics SDKs.** Grepped for `analytics|telemetry|segment|mixpanel|amplitude|posthog|sentry|firebase|crashlytics|datadog|bugsnag` - none. The Windows project's only `PackageReference` is `FlaUI.UIA3` (a read-only UI-Automation library); macOS links only Cocoa/ApplicationServices/QuartzCore.
- **Every outbound endpoint is `goprism.dev`** (or the configured `PRISM_API_URL`). Default base URL `https://goprism.dev/api` in `PrismAd.m:53`, `PrismAuth.m:22`, `Settings.cs:27`. No other hosts are referenced.

## 4. Permissions - ✅ PASS

The client requests no more than it needs.

- **macOS:** `LSUIElement=true` background agent (`Info.plist`). Standard **Accessibility** grant via `AXIsProcessTrustedWithOptions` (read-only detection) + standard networking. **No `.entitlements` file**, no Full-Disk/Screen-Recording/Input-Monitoring usage keys, no sandbox-escape entitlements.
- **Windows:** `app.manifest` `requestedExecutionLevel level="asInvoker" uiAccess="false"` - no elevation. Read-only UI Automation needs no special grant.
- **No disk access to editor config/transcripts.** No reads of `~/.claude`, `settings.json`, or any editor file. Grepped for `.claude|settings.json|contentsOfFile|ReadAllText|FileStream|Application Support|NSHomeDirectory|GetFolderPath` - the only matches are app-bundle-id string comparisons for frontmost-app detection, not file reads. The only persistence is `NSUserDefaults`/registry for the API key + device id.
- The opt-in OS-signal mode's idle check uses the system idle timer `CGEventSourceSecondsSinceLastEventType(kCGEventSourceStateHIDSystemState, kCGAnyInputEventType)` (`PrismAX.m:412`) - seconds-since-last-input only; it does not capture input and needs no Input-Monitoring entitlement.

## 5. Security-by-design, not obscurity - ✅ PASS

Nothing in the threat model depends on the client being secret:
- Impression tokens are **server-signed**; the client echoes `impressionToken` back and cannot mint one (`PrismAd.m:127`).
- The heartbeat challenge is **server-issued** (`hbChallenge` read from the response, `PrismAd.m:132`) and rolls server-side.
- Device binding, trust scoring, frequency caps, and anomaly detection are **server-side** (overlay carries only a random UUID). A fully public client does not weaken these defenses.

## 6. Leftovers - ✅ PASS

- The broad-text readers (`dumpClaude`/`dumpFront`/`dumpFrontText`) are declared and implemented **inside `#if DEBUG`** (`PrismAX.h`, `PrismAX.m:426-471`, `main.m:55-90`). The release build uses `CFLAGS := -fobjc-arc -Wall -O2` with **no `-DDEBUG`** (`Makefile:20`), so these symbols are absent from the shipped binary.
- No commented-out secrets, no verbose `NSLog`/`Console.WriteLine` of sensitive values, no test endpoints.

---

## Conclusion

All six categories pass with no remediation required. The categories that would be hard blockers (1 embedded secrets, 2 content logging, 3 telemetry) are clean. **The overlay client is safe to publish.**

**Remaining gate (outside this audit):** actually making the repo public and then setting `OVERLAY_REPO_URL` in `apps/web/src/lib/site.ts`. Until that constant is non-null, the whitepaper and `/security` render the source link as "coming soon".
