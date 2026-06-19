# Prism Overlay (macOS)

A tiny background menu-bar app that shows one small **sponsored line** next to
Claude's "working" indicator while it generates — in **Claude Cowork** and
**Claude Code** modes.

It is **read-only**: it never modifies Claude's code, never injects anything, and
never reads your prompts, responses, or files. It only watches macOS
Accessibility for the work-indicator row and floats a click-through label beside
it. The ad disappears the moment Claude is idle.

## Why this design

- **No code change to Claude** — uses the public macOS Accessibility API, the
  same read-only interface screen readers use.
- **Easy install** — a normal signed app + one **Accessibility** permission.
  (No Screen Recording, no proxy, no patching.)
- **Robust** — detection keys on the work-indicator row's stable container
  classes (`text-assistant-secondary` + `tabular-nums`), which exist only while
  Claude is actively thinking/streaming. If Claude's UI changes, the worst case
  is the ad stops showing — it can never break Claude.

> Regular **Claude chat** isn't supported: in chat the indicator is a bare
> spinner with no Accessibility node, so locating it would require Screen
> Recording. Cowork/Code both expose the work row, so this app stays
> Accessibility-only.

## Build & run

```bash
make            # build + ad-hoc sign  ->  build/PrismOverlay.app
make run        # build and (re)launch
```

On first launch it prompts for **Accessibility**. Grant it in
System Settings → Privacy & Security → Accessibility, then relaunch.

The menu-bar item (◆) lets you **Pause/Resume** or **Quit**.

## Live ads, views & clicks

| Env var | Default | Purpose |
|---|---|---|
| `PRISM_API_URL` | `https://goprism.dev/api` | Prism API base URL |
| `PRISM_API_KEY` | (none) | **Required for live ads** — a Prism device API key |

- **Ads** come from `POST /api/ads` (real advertiser campaigns via the auction).
  Each response carries a single-use `impressionToken` and a tracked `clickUrl`.
  A fresh ad (and token) is fetched on each rotation. Without a key — or if the
  API is unreachable — it falls back to built-in demo ads.
- **Views** are reported to `POST /api/impressions` after a **5s viewable dwell**,
  using the ad's signed token (`userId`/`sessionId`/`campaignId` must match).
  Demo ads carry no token and are never reported.
- **Clicks**: the pill is clickable. Clicking opens the ad's `clickUrl`
  (`/api/clicks?t=…`), which **records the click server-side** (with fraud checks)
  and redirects the user to the advertiser. One open = one tracked click.

> In production both `/api/ads` and `/api/impressions` require `X-Prism-Api-Key`.
> Provision a device key via the Prism dashboard / `POST /api/auth/register-device`
> and pass it as `PRISM_API_KEY`.

The reported context is honest and minimal — `editor`, `aiTool`, `waitState` —
never your code, prompts, responses, or file contents.

## Dev note: the Accessibility re-grant

Ad-hoc-signed binaries are tracked by code hash, so **every rebuild loses its
Accessibility grant**. After a rebuild:

```bash
make reset      # tccutil reset Accessibility dev.goprism.overlay
make run        # relaunch -> grant the single fresh entry -> relaunch once more
```

For distribution, sign with a **Developer ID** identity
(`make SIGN_ID="Developer ID Application: …"`). Then the grant is one-time and
survives app updates.

## Layout

```
Sources/
  PrismAX.{h,m}        Accessibility helpers + work-row detector (read-only)
  PrismAd.{h,m}        Ad model, API client, viewable-impression reporting
  PrismOverlay.{h,m}   The pill window + the controller (poll → place → account)
  main.m               Menu-bar app entry + Accessibility prompt
Info.plist             LSUIElement (menu-bar only), bundle id dev.goprism.overlay
Makefile               clang build → .app bundle (no Xcode needed)
```
