# Prism for Mac

A single-download macOS menu-bar app that shows Prism ads during AI wait states — without modifying any host application files.

## What it does

- **Claude Desktop:** Uses the macOS Accessibility API to detect the thinking/loading indicator and draws a one-line transparent overlay directly on top of it.
- **Editors (VS Code, Cursor, etc.):** Ships with the Prism extension `.vsix` and can install it into detected editors from the onboarding screen.
- Runs silently in the menu bar, launches at login (optional), and never touches Claude Desktop or editor internals.

## Project structure

```
PrismMac/
├── Sources/PrismMac/
│   ├── main.swift                    # NSApplication entry point
│   ├── AppDelegate.swift             # First-launch onboarding → menu bar
│   ├── StatusBarController.swift     # Menu bar icon + menu actions
│   ├── AccessibilityMonitor.swift    # AXUIElement polling logic
│   ├── OverlayWindow.swift           # Transparent one-line overlay
│   ├── LoginItemManager.swift        # Launch at login helper
│   ├── Installer.swift               # IDE extension installer
│   └── OnboardingWindowController.swift # First-run setup UI
├── Resources/
│   ├── Info.plist                    # App bundle metadata
│   └── prism-extension.vsix          # Prism VS Code/Cursor extension
├── Prism.entitlements                # Accessibility entitlement (for distribution signing)
├── Makefile                          # Build commands
└── README.md                         # This file
```

## Requirements

- macOS 13.0+ (for the built-in “Launch at login” API).
- Xcode or Xcode Command Line Tools (`swiftc`, `codesign`).
- Claude Desktop installed (for Claude Desktop ads).

## Build

```bash
cd /Users/alanahmuylle/Desktop/AIAD/apps/macos/PrismMac
make build
```

Produces:

```
build/Prism.app
```

## Run locally

```bash
make run
```

Or manually:

```bash
open build/Prism.app
```

## First launch

1. The onboarding window appears automatically.
2. Click **Open Accessibility Settings…** and enable `Prism.app`.
3. (Optional) Click **Install for VS Code** / **Install for Cursor** if those editors are installed.
4. Check **Launch Prism at login** if you want it to start automatically.
5. Click **Start Prism**.

After onboarding, Prism lives in the menu bar. You can reopen the setup anytime from the menu.

## Menu options

- **Pause / Resume Claude Desktop ads**
- **Launch at login**
- **Open Accessibility settings…**
- **Open setup…**
- **Quit**

## Customising the ad text

Edit the text in `Sources/PrismMac/OverlayWindow.swift`:

```swift
private let label = NSTextField(labelWithString: "Ad text here")
```

Then rebuild with `make build`.

## Distributing as a one-click download

For end users, package `build/Prism.app` as a `.dmg` or `.zip`:

```bash
# Create a zip users can download and unzip into /Applications
cd build && zip -r Prism-Mac.zip Prism.app
```

For a polished install, use [create-dmg](https://github.com/create-dmg/create-dmg):

```bash
brew install create-dmg
create-dmg \
  --volname "Prism Installer" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --app-drop-link 450 185 \
  "Prism-Mac.dmg" \
  "build/Prism.app"
```

### Important distribution notes

- **Gatekeeper:** Without an Apple Developer ID and notarization, users must right-click `Prism.app` and choose **Open** the first time.
- **Accessibility:** Every user still has to grant Accessibility permission manually. There is no way around this on macOS.
- **Launch at login:** `SMAppService.mainApp` only works reliably when `Prism.app` is in `/Applications`.

## If it can’t find the thinking indicator

Claude Desktop’s accessibility text may change. Edit the keywords in `Sources/PrismMac/AccessibilityMonitor.swift`:

```swift
private let thinkingKeywords = ["thinking", "claude is thinking", "generating"]
```

To discover Claude Desktop’s bundle identifier:

```bash
osascript -e 'id of app "Claude"'
```

## Updating the bundled extension

Replace `Resources/prism-extension.vsix` with the latest `prism-cursor.vsix` (or `prism-0.1.x.vsix`) from `apps/extension`, then rebuild:

```bash
cp ../../extension/prism-cursor.vsix Resources/prism-extension.vsix
make build
```

## Troubleshooting

### Build errors about mismatched SDK / Swift compiler

If `make build` fails with module-map or SDK-version errors, your Command Line Tools and SDK are out of sync. The project compiles with `xcrun swiftc`. If you have Xcode installed, point to it:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcode-select -p
```

Then run `make build` again. If you only have the Command Line Tools, update them:

```bash
xcode-select --install
```

### No overlay appears

1. Make sure Claude Desktop is the active window.
2. Check that `Prism.app` is enabled in **System Settings → Privacy & Security → Accessibility**.
3. Claude Desktop may have changed its UI. Add `print()` statements to `AccessibilityMonitor.swift` to inspect the detected text.

## Clean

```bash
make clean
```
