# Prism pre-launch readiness audit

Read-only audit of the monorepo against the public claim "we never read your prompts or code, and we don't modify your tools," plus money-path, legal surface, trust, and copy. No code was changed in this pass. Evidence is `file:line` against the working tree (branch `fix/privacy-p0`); where a finding is already fixed on that branch but not on `main`, it is marked **fixed-pending-merge**.

Severity: **P0** blocks launch, **P1** fix before launch, **P2** fast-follow.
Effort: **S** under ~1h, **M** a few hours, **L** a day or more.

## Prioritized findings

| # | Area | Finding | Evidence | Sev | Non-breaking fix | Effort |
|---|------|---------|----------|-----|------------------|--------|
| 1 | Money | **Wise payout uses a silent fake address.** If a recipient omits an address, the payload defaults to `1 Main St / New York / 10001`, so money goes out with a fabricated address (AML/KYC and Wise-ToS risk). | `apps/web/src/lib/payouts/providers.ts:96-100`, `:399-402` | **P0** | Remove the `|| '1 Main St'` etc. fallbacks; validate the address fields and reject the payout with a clear error when missing. Non-breaking when a real address is present (only the previously-faked path now errors instead of sending). | S |
| 2 | Privacy | **CLI status-line script writes `~/.claude/settings.json`** (`spinnerVerbs`), modifying a host tool. Contradicts "we don't modify your tools." | `apps/web/public/prism-claude-status-line.sh` `update_spinner_verb()` (on `main`) | **P0** | Remove the function + its call + `SETTINGS_FILE`; keep the printed OSC-8 status line so the ad still shows. **fixed-pending-merge** on `fix/privacy-p0` (verified: grep-clean, `bash -n`, dry run prints + exits 0, only `~/.prism-user-id` touched). | done |
| 3 | Privacy | **AX debug dumps reachable in release.** `dumpClaude`/`dumpFront`/`dumpFrontText` can dump on-screen UI text and terminal scrollback; the Makefile builds without `-DDEBUG`, so the symbols + `PRISM_DUMP*` env triggers ship. | `apps/overlay-macos/Sources/PrismAX.h:50-60`, `PrismAX.m:347-388`, `main.m:57-88` (on `main`) | **P0** | Wrap declarations, implementations, dump-only helpers (`AXStr`/`DumpRecurse`), and the `getenv` call sites in `#if DEBUG`. **fixed-pending-merge** on `fix/privacy-p0` (verified: release `nm` shows no dump symbols; `-DDEBUG` build still compiles). | done |
| 4 | Money | **No code-level test/live guard.** Test vs live is distinguished only by which env key is set (`STRIPE_SECRET_KEY` vs `STRIPE_TEST_SECRET_KEY`); nothing refuses a `sk_test_` key in production or vice versa. | no `PRISM_ENV` anywhere; `apps/web/src/app/api/checkout/**`, `webhooks/stripe/route.ts` | **P1** | Add a `PRISM_ENV` (`production`/`test`) check that throws on a key/prefix mismatch (e.g. `production` + `sk_test_`). New helper, called at boot; default behavior unchanged when keys match. | S |
| 5 | Money | **Money-path secrets not validated at boot.** `validateProductionEnv()` checks infra keys but not `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `WISE_*`, `PAYONEER_*`. The app can boot in prod unable to take payment or pay out. | `apps/web/src/lib/env.ts:25-36` (REQUIRED list) | **P1** | Add ONLY the always-needed Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`) to `REQUIRED`. **Do NOT blanket-require `WISE_*`/`PAYONEER_*`** - they are intentionally per-provider optional (`providers.ts:129-133`, `:241-245` add a config error instead of throwing), so requiring both would break boot when only one provider is used. Instead validate "at least one payout provider is fully configured." | S |
| 6 | Money | **No tests on the money path.** Only `test/e2e/ad-flow.test.ts` and `lib/advertiserStats.test.ts` exist; nothing covers checkout to webhook to wallet credit, payout request to send, or fraud gating. | `find … *.test.ts` (2 files); grep for webhook/checkout/payout/wallet/fraud in tests: none | **P1** | Add mocked-network unit tests for: deposit webhook to `credit_advertiser_balance`, payout request validation + Wise/Payoneer payload, and fraud block thresholds. New files only; no prod logic touched. | M |
| 7 | Legal | **Brand names/logos imply compatibility/affiliation.** Marketing renders Claude/Cursor/Codex logos and names; in-product onboarding says "Earn while Claude works." | `apps/web/src/components/landing/LandingPage.tsx:15-17,25,46,144`; `apps/overlay-macos/Sources/PrismOnboarding.m:66-67`; `apps/overlay-windows/src/Onboarding.cs:23` | **P1** | Add a "not affiliated with / trademarks of their owners" disclaimer near logos, and a config-flagged **brand-neutral mode** that swaps third-party names/logos for generic "your AI tools" copy. Additive; current copy stays default. | M |
| 8 | Trust | **Marketing may over-promise earnings/payouts.** The earnings estimator projects monthly income; payouts require $20 min + manual approval and advertisers are bootstrapped. | `apps/web/src/components/landing/LandingPage.tsx` earnings section (`#earnings`), "Start earning" CTAs | **P1** | Keep the estimator but ensure the "varies / projection / payouts in beta" disclaimers are explicit and adjacent; soften any absolute "get paid" phrasing the backend cannot yet guarantee. Copy-only. | S |
| 9 | Legal | **Wait detection reads the host app's UI tree.** Detection depends on Claude/Cursor/terminal internals (DOM classes, the Cursor Stop button, the terminal `AXTextArea`). Reading, not modifying, but it is host-UI coupling. | `apps/overlay-macos/Sources/PrismAX.m` (`detectWorkRow:`, `FindCursorStop`, `DetectTerminalThinking`); `apps/overlay-windows/src/UiaDetector.cs` | **P1/P2** | Add an **OS-signal detection mode** (focus + idle/keystroke/CPU) behind an off-by-default flag; keep AX/UIA detection as the validated default. Additive new module + flag. | L |
| 10 | Trust | **Google Analytics loads without consent/DNT.** `gtag` is injected on every page load when the ID is set, with no consent gate or Do-Not-Track check. | `apps/web/src/components/GoogleAnalytics.tsx` (unconditional `Script`) | **P2** | Gate the GA scripts behind a consent/DNT check (respect `navigator.doNotTrack` and a consent flag). Wraps the existing component; no GA when declined. | S |
| 11 | Money/Ops | **Manual gates before money moves (by design).** Payout approval, performance-campaign approval, and anomaly review are all manual admin steps. Safe default, but a launch bottleneck. | `app/api/admin/payouts/[id]/approve|reject`, `app/api/admin/campaigns/[id]/approve`, `campaigns/route.ts:163`, `lib/anomaly.ts:40` (`anomaly_events` queue) | **P2** | Add an opt-in auto path behind config for each (e.g. auto-approve payouts under a threshold for trusted creators), **default off** = today's manual behavior. Additive flags. | M |
| 12 | Privacy | **Terminal AX read scans the buffer to find the anchor.** `DetectTerminalThinking` reads the full `AXTextArea` value transiently to regex-locate the `(Ns · N tokens)` status line, then keeps only that line's frame. Not retained or transmitted (`PrismDetection` has no text field; `AdContext()` is hardcoded), but it is the broadest read in the production path. | `apps/overlay-macos/Sources/PrismAX.m` (`DetectTerminalThinking`, `WorkingLineRange`) | **P2** | Already documented with a clarifying comment on `fix/privacy-p0`. No behavior change needed; optionally cap the scanned tail length. **fixed-pending-merge** (comment). | done |

## Items checked and found OK (no action)

- **What leaves the device per impression:** hardcoded `AdContext()` (`PrismAd.m:9-12`), `DeviceFingerprint = {deviceId, platform}` (`PrismAd.m:28-30`), pseudonymous `userId`/`sessionId`, `campaignId`, `impressionToken`, `durationMs`, `source`. **No prompt, response, code, or filenames.** The "never read your prompts or code" claim holds for transmitted data.
- **GUI overlay renders in its own window** (NSPanel/`PrismOverlay.m`); it does not inject into or modify the host app. The only host mutation was the CLI script (finding 2, fixed-pending-merge).
- **No session-replay analytics** (no Clarity/Hotjar/FullStory). **Fonts self-hosted** via `next/font/google` (`apps/web/src/app/layout.tsx:2`), so no Google Fonts IP leak.
- **Data retention is defined and disclosed** (`apps/web/src/app/privacy/page.tsx:242-254`: account 12mo post-closure, ad events 12-24mo, fraud logs 24mo). Better than the kickbacks audit assumed.
- **Client has no embedded secrets** (overlay/CLI read keys from env/`NSUserDefaults`, default base URL is the public `goprism.dev/api`), so the overlay/CLI source is publishable for the open-source/verifiability move.
- **Copy nit "Earn while ai thinks" (lowercase) is not present.** Web copy uses "AI thinks"; overlay/onboarding uses "Earn while Claude works."; no bare `\bAi\b` in native/CLI strings. (No VS Code extension exists in this repo to check.)
- **Windows `UiaDetector.cs` is clean**: reads only `el.Name` on Text elements to match the verb pattern, returns `BoundingRectangle`, writes no files.

## Recommended sequencing

**Before launch (P0, must):**
1. Merge `fix/privacy-p0` (findings 2, 3, 12) so the privacy claim is literally true.
2. Fix the Wise fake-address fallback (finding 1) - this is the single biggest standalone risk.

**Before launch (P1, should):**
3. Add money keys to `env.ts` validation (5) and the `PRISM_ENV` test/live guard (4) - cheap, high safety.
4. Add mocked money-path tests (6) before the first real charge/payout.
5. Brand disclaimer (7) and honest earnings/payout copy (8) - copy changes, low effort, real legal/trust value.

**Fast-follow (P2, after launch):**
6. OS-signal detection mode behind a flag (9) - the strategic decoupling, but large and the current AX path works.
7. GA consent/DNT gate (10), opt-in auto-approval config (11), optional terminal-tail cap (12).

## Additive/safe vs touches-existing (non-breaking strategy)

**Purely additive (new files / off-by-default flags, cannot affect today's behavior):**
- `PRISM_ENV` guard (4) - new helper.
- Money-path tests (6) - new test files.
- Brand-neutral mode (7) and OS-signal detection mode (9) - new modules behind off-by-default flags; AX detection + branded copy stay default.
- Opt-in auto-approval (11) - new config, default off = current manual behavior.

**Touches an existing file, but non-breaking (no path removed; gated or only the unsafe branch changes):**
- `env.ts` (5): append money keys to `REQUIRED`. Throws in production only when a key is missing (which would already be broken); no-op otherwise.
- `providers.ts` (1): remove the address fallbacks and add validation. Behavior is unchanged when a real address is present; only the previously-silently-faked case now errors.
- `GoogleAnalytics.tsx` (10): wrap the existing scripts in a consent/DNT check. GA still loads when allowed.
- Marketing/onboarding copy (7, 8): string-level edits plus a disclaimer; no logic.

**Already implemented on `fix/privacy-p0` (verified, awaiting merge):** findings 2, 3, 12.

---

*Scope note: this pass changed no application code. The only new file is this report. Implementation of any item above should follow the solution rules: one concern per change, new files preferred, existing files gated behind a flag/env defaulting to today's behavior, on branch `chore/prelaunch-fixes`, no push/PR until approved.*
