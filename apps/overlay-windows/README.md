# Prism Overlay (Windows)

The Windows port of the Prism overlay — a tray app that shows one small
**sponsored line** next to Claude's "working" indicator in **Cowork** and
**Code** modes. Same idea as the macOS app, same Prism API.

**Read-only**: it uses Windows **UI Automation** (the accessibility interface) to
locate the work indicator and floats a click-through label beside it. It never
modifies Claude, and — unlike macOS — **needs no permission grant** (UIA can read
a same-integrity app's UI tree without consent).

## Install (end user)

```powershell
irm https://goprism.dev/install.ps1 | iex
```

Self-contained `.exe` (no .NET needed), no admin, no SmartScreen nag (the script
clears the mark-of-the-web). It runs in the tray and launches at login. Use
**Connect account** to link your Prism account via the browser (same device flow
as macOS — no key to copy). Without it, demo ads.

Uninstall: `irm https://goprism.dev/uninstall.ps1 | iex`

## Build

Requires the .NET 8 SDK on Windows.

```powershell
dotnet build -c Release
dotnet run -c Release        # run locally
```

Produce the distributable single-file exe:

```powershell
dotnet publish -c Release -r win-x64 --self-contained true `
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o publish
# -> publish/PrismOverlay.exe   (host it where install.ps1's PRISM_EXE_URL points)
```

CI (`.github/workflows/build-overlay-windows.yml`) builds this on every push and
uploads `PrismOverlay.exe` as an artifact.

## Layout

```
PrismOverlay.csproj   net8.0-windows, WinForms, FlaUI.UIA3
app.manifest          asInvoker + PerMonitorV2 DPI
src/
  Settings.cs         HKCU settings + env overrides (API url/key, onboarding)
  AdClient.cs         /api/ads, /api/impressions, /api/clicks (+ demo fallback)
  PrismAuth.cs        browser device-flow sign-in (/link + /api/auth/pair)
  UiaDetector.cs      read-only UIA: find the work-indicator status text
  OverlayWindow.cs    topmost click-through pill (GDI-drawn)
  Onboarding.cs       first-run window (connect account)
  Program.cs          tray app + poll → place → impression accounting
install.ps1 / uninstall.ps1
```

## Status / known gaps

- **Detection needs on-Windows tuning.** UIA does not expose CSS classes the way
  macOS Accessibility did, so `UiaDetector` matches the thinking-verb **status
  text** instead of the `text-assistant-secondary`/`tabular-nums` container. The
  verb set and tree shape should be verified the first time it runs against real
  Windows Claude (this is the same investigation we did on macOS).
- **Not yet run on Windows.** The project builds in CI; runtime behavior
  (detection accuracy, overlay placement under multi-DPI, tree-walk performance)
  needs a real Windows session to validate and tune.
- **Code signing**: distributed unsigned via the `irm | iex` installer (which
  clears mark-of-the-web). An Authenticode/EV cert would remove SmartScreen for a
  plain double-clicked download but isn't required for the installer path.
